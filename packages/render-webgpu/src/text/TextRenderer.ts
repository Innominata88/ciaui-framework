// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Text Renderer
// 
// Renders text using MSDF (Multi-channel Signed Distance Field) technique.
// Provides crisp text at any size, essential for VR where viewing distance varies.
// ═══════════════════════════════════════════════════════════════════════════

import { GPUContext } from '../GPUContext';
import type { LoadedFont, TextRenderCommand, PositionedGlyph } from './types';
import { layoutText } from './TextLayout';

// ───────────────────────────────────────────────────────────────────────────
// MSDF Shader
// ───────────────────────────────────────────────────────────────────────────

const TEXT_SHADER = /* wgsl */ `
  // Uniforms - carefully aligned to avoid padding issues
  struct Uniforms {
    resolution: vec2f,    // 8 bytes at offset 0
    atlasSize: vec2f,     // 8 bytes at offset 8
    pxRange: f32,         // 4 bytes at offset 16
    _pad1: f32,           // 4 bytes at offset 20
    _pad2: f32,           // 4 bytes at offset 24
    _pad3: f32,           // 4 bytes at offset 28
  }                       // Total: 32 bytes, properly aligned
  
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var fontAtlas: texture_2d<f32>;
  @group(0) @binding(2) var fontSampler: sampler;
  
  // Per-glyph instance data
  struct GlyphInstance {
    position: vec2f,    // Screen position (pixels)
    size: vec2f,        // Glyph size (pixels)
    uvMin: vec2f,       // UV top-left
    uvMax: vec2f,       // UV bottom-right
    color: vec4f,       // Text color
  }
  
  @group(0) @binding(3) var<storage, read> glyphs: array<GlyphInstance>;
  
  // Vertex output
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
  }
  
  // Quad vertices (same as QuadRenderer)
  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32,
  ) -> VertexOutput {
    var quadVertices = array<vec2f, 6>(
      vec2f(0.0, 0.0),
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0),
      vec2f(0.0, 0.0),
      vec2f(1.0, 1.0),
      vec2f(0.0, 1.0),
    );
    
    let glyph = glyphs[instanceIndex];
    let localPos = quadVertices[vertexIndex];
    
    // Screen position
    let pixelPos = glyph.position + localPos * glyph.size;
    
    // Convert to NDC
    let ndcPos = vec2f(
      (pixelPos.x / uniforms.resolution.x) * 2.0 - 1.0,
      1.0 - (pixelPos.y / uniforms.resolution.y) * 2.0,
    );
    
    // Interpolate UV
    let uv = mix(glyph.uvMin, glyph.uvMax, localPos);
    
    var output: VertexOutput;
    output.position = vec4f(ndcPos, 0.0, 1.0);
    output.uv = uv;
    output.color = glyph.color;
    
    return output;
  }
  
  // MSDF median function
  fn median(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
  }
  
  // Fragment shader - MSDF sampling
  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // Sample the MSDF texture
    let msdf = textureSample(fontAtlas, fontSampler, input.uv);
    
    // Calculate signed distance using median of RGB
    let sd = median(msdf.r, msdf.g, msdf.b);
    
    // Use screen-space derivatives for anti-aliasing
    // fwidth gives us how much the value changes per pixel
    let screenPxDistance = fwidth(sd);
    
    // Smooth edge - 0.5 is the edge of the glyph in normalized distance
    let alpha = smoothstep(0.5 - screenPxDistance, 0.5 + screenPxDistance, sd);
    
    // Apply color with alpha
    return vec4f(input.color.rgb, input.color.a * alpha);
  }
`;

// ───────────────────────────────────────────────────────────────────────────
// Text Renderer Class
// ───────────────────────────────────────────────────────────────────────────

interface GlyphInstanceData {
  position: [number, number];
  size: [number, number];
  uvMin: [number, number];
  uvMax: [number, number];
  color: [number, number, number, number];
}

export class TextRenderer {
  private gpuContext: GPUContext;
  private font: LoadedFont | null = null;
  
  // GPU resources
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private glyphBuffer: GPUBuffer | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  // Glyph instance data
  private glyphInstances: GlyphInstanceData[] = [];
  private maxGlyphs: number = 10000;
  private glyphDataDirty: boolean = true;
  
  // Pending text commands
  private textCommands: TextRenderCommand[] = [];
  
  constructor(gpuContext: GPUContext) {
    this.gpuContext = gpuContext;
  }
  
  /**
   * Initialize the text renderer (must be called before setFont)
   */
  async initialize(): Promise<boolean> {
    const { device } = this.gpuContext;
    if (!device) {
      console.error('[TextRenderer] GPUContext not initialized');
      return false;
    }
    
    try {
      console.log('[TextRenderer] Creating shader module...');
      
      const shaderModule = device.createShaderModule({
        label: 'Text Shader',
        code: TEXT_SHADER,
      });
      
      // Check for compilation errors
      const compilationInfo = await shaderModule.getCompilationInfo();
      for (const message of compilationInfo.messages) {
        if (message.type === 'error') {
          console.error('[TextRenderer] Shader error:', message.message);
          return false;
        }
      }
      
      console.log('[TextRenderer] Creating buffers...');
      
      // Uniform buffer: resolution(2) + atlasSize(2) + pxRange(1) + padding(3) = 8 floats = 32 bytes
      this.uniformBuffer = device.createBuffer({
        label: 'Text Uniforms',
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      
      // Glyph instance buffer
      // Each glyph: position(2) + size(2) + uvMin(2) + uvMax(2) + color(4) = 12 floats = 48 bytes
      const glyphStride = 48;
      this.glyphBuffer = device.createBuffer({
        label: 'Glyph Instances',
        size: this.maxGlyphs * glyphStride,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      
      // Create bind group layout (texture/sampler will be added when font is set)
      this.bindGroupLayout = device.createBindGroupLayout({
        label: 'Text Bind Group Layout',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: 'float' },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: { type: 'filtering' },
          },
          {
            binding: 3,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: 'read-only-storage' },
          },
        ],
      });
      
      // Create pipeline
      const pipelineLayout = device.createPipelineLayout({
        label: 'Text Pipeline Layout',
        bindGroupLayouts: [this.bindGroupLayout],
      });
      
      this.pipeline = device.createRenderPipeline({
        label: 'Text Render Pipeline',
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: 'vertexMain',
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fragmentMain',
          targets: [
            {
              format: this.gpuContext.format,
              blend: {
                color: {
                  srcFactor: 'src-alpha',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
                alpha: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
              },
            },
          ],
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'none',
        },
      });
      
      console.log('[TextRenderer] Initialization complete');
      return true;
      
    } catch (error) {
      console.error('[TextRenderer] Failed to initialize:', error);
      return false;
    }
  }
  
  /**
   * Set the font to use for rendering
   */
  setFont(font: LoadedFont): void {
    const { device } = this.gpuContext;
    if (!device || !this.bindGroupLayout || !this.uniformBuffer || !this.glyphBuffer) {
      console.error('[TextRenderer] Not initialized');
      return;
    }
    
    this.font = font;
    
    // Create bind group with font texture
    this.bindGroup = device.createBindGroup({
      label: 'Text Bind Group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: font.texture.createView() },
        { binding: 2, resource: font.sampler },
        { binding: 3, resource: { buffer: this.glyphBuffer } },
      ],
    });
    
    console.log(`[TextRenderer] Font set: ${font.name}`);
  }
  
  /**
   * Clear all text
   */
  clear(): void {
    this.textCommands = [];
    this.glyphInstances = [];
    this.glyphDataDirty = true;
  }
  
  /**
   * Add text to render
   */
  addText(command: TextRenderCommand): void {
    this.textCommands.push(command);
    this.glyphDataDirty = true;
  }
  
  /**
   * Add text with simpler API
   */
  drawText(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    this.addText({ text, x, y, fontSize, color });
  }
  
  /**
   * Process text commands into glyph instances
   */
  private processCommands(): void {
    if (!this.font) return;
    
    this.glyphInstances = [];
    
    for (const cmd of this.textCommands) {
      const { positioned } = layoutText(this.font, cmd.text, {
        fontSize: cmd.fontSize,
        maxWidth: cmd.maxWidth,
        align: cmd.align,
      });
      
      for (const glyph of positioned) {
        this.glyphInstances.push({
          position: [cmd.x + glyph.x, cmd.y + glyph.y],
          size: [glyph.width, glyph.height],
          uvMin: [glyph.u0, glyph.v0],
          uvMax: [glyph.u1, glyph.v1],
          color: cmd.color,
        });
      }
    }
  }
  
  /**
   * Upload glyph data to GPU
   */
  private uploadGlyphData(): void {
    const { device } = this.gpuContext;
    if (!device || !this.glyphBuffer) return;
    
    this.processCommands();
    
    if (this.glyphInstances.length === 0) {
      this.glyphDataDirty = false;
      return;
    }
    
    // Pack glyph data: position(2) + size(2) + uvMin(2) + uvMax(2) + color(4) = 12 floats
    const floatsPerGlyph = 12;
    const data = new Float32Array(this.glyphInstances.length * floatsPerGlyph);
    
    for (let i = 0; i < this.glyphInstances.length; i++) {
      const g = this.glyphInstances[i];
      const offset = i * floatsPerGlyph;
      
      data[offset + 0] = g.position[0];
      data[offset + 1] = g.position[1];
      data[offset + 2] = g.size[0];
      data[offset + 3] = g.size[1];
      data[offset + 4] = g.uvMin[0];
      data[offset + 5] = g.uvMin[1];
      data[offset + 6] = g.uvMax[0];
      data[offset + 7] = g.uvMax[1];
      data[offset + 8] = g.color[0];
      data[offset + 9] = g.color[1];
      data[offset + 10] = g.color[2];
      data[offset + 11] = g.color[3];
    }
    
    device.queue.writeBuffer(this.glyphBuffer, 0, data);
    this.glyphDataDirty = false;
  }
  
  /**
   * Render text to the current render pass
   */
  render(renderPass: GPURenderPassEncoder): void {
    if (!this.font || !this.pipeline || !this.bindGroup) {
      return;
    }
    
    const { device, width, height } = this.gpuContext;
    if (!device || !this.uniformBuffer) return;
    
    // Upload uniform data (must match shader struct layout exactly)
    const { atlas } = this.font;
    const uniformData = new Float32Array([
      width, height,                              // resolution (vec2f)
      atlas.atlas.width, atlas.atlas.height,     // atlasSize (vec2f)
      atlas.atlas.distanceRange,                  // pxRange (f32)
      0, 0, 0,                                     // padding (3x f32)
    ]);
    device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    
    // Upload glyph data if changed
    if (this.glyphDataDirty) {
      this.uploadGlyphData();
    }
    
    // Draw glyphs
    if (this.glyphInstances.length > 0) {
      renderPass.setPipeline(this.pipeline);
      renderPass.setBindGroup(0, this.bindGroup);
      renderPass.draw(6, this.glyphInstances.length);
    }
  }
  
  /**
   * Get glyph count for stats
   */
  getGlyphCount(): number {
    return this.glyphInstances.length;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.uniformBuffer?.destroy();
    this.glyphBuffer?.destroy();
    this.uniformBuffer = null;
    this.glyphBuffer = null;
    this.pipeline = null;
    this.bindGroup = null;
    this.font = null;
  }
}
