// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Quad Renderer
// 
// Renders colored rectangles (quads) using WebGPU.
// This is the foundation for all 2D UI elements.
// ═══════════════════════════════════════════════════════════════════════════

import { GPUContext } from './GPUContext';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export interface Quad {
  x: number;        // Position (normalized device coordinates or pixels)
  y: number;
  width: number;
  height: number;
  color: [number, number, number, number];  // RGBA, 0-1
  cornerRadius?: number;
  depth?: number;   // Z-order (0-1)
}

// ───────────────────────────────────────────────────────────────────────────
// Shaders
// ───────────────────────────────────────────────────────────────────────────

const QUAD_SHADER = /* wgsl */ `
  // Uniforms - projection matrix and common data
  struct Uniforms {
    resolution: vec2f,
    time: f32,
    _padding: f32,
  }
  
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  
  // Per-instance data for each quad
  struct QuadInstance {
    position: vec2f,     // x, y (in pixels)
    size: vec2f,         // width, height (in pixels)
    color: vec4f,        // RGBA
    cornerRadius: f32,
    depth: f32,
    _padding: vec2f,
  }
  
  @group(0) @binding(1) var<storage, read> quads: array<QuadInstance>;
  
  // Vertex output
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) localPos: vec2f,      // Position within quad (0-1)
    @location(2) quadSize: vec2f,      // Size in pixels
    @location(3) cornerRadius: f32,
  }
  
  // Vertex shader - generates quad vertices from instance data
  @vertex
  fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32,
  ) -> VertexOutput {
    // Quad vertices (two triangles)
    // 0--1
    // |\ |
    // | \|
    // 3--2
    var quadVertices = array<vec2f, 6>(
      vec2f(0.0, 0.0),  // Triangle 1
      vec2f(1.0, 0.0),
      vec2f(1.0, 1.0),
      vec2f(0.0, 0.0),  // Triangle 2
      vec2f(1.0, 1.0),
      vec2f(0.0, 1.0),
    );
    
    let quad = quads[instanceIndex];
    let localPos = quadVertices[vertexIndex];
    
    // Calculate pixel position
    let pixelPos = quad.position + localPos * quad.size;
    
    // Convert to normalized device coordinates (-1 to 1)
    // Note: Y is flipped (0 at top in screen space, -1 at top in NDC)
    let ndcPos = vec2f(
      (pixelPos.x / uniforms.resolution.x) * 2.0 - 1.0,
      1.0 - (pixelPos.y / uniforms.resolution.y) * 2.0,
    );
    
    var output: VertexOutput;
    output.position = vec4f(ndcPos, quad.depth, 1.0);
    output.color = quad.color;
    output.localPos = localPos;
    output.quadSize = quad.size;
    output.cornerRadius = quad.cornerRadius;
    
    return output;
  }
  
  // Fragment shader - renders quad with optional rounded corners
  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let color = input.color;
    
    // Early out if no corner radius
    if (input.cornerRadius <= 0.0) {
      return color;
    }
    
    // Calculate signed distance to rounded rectangle
    let halfSize = input.quadSize * 0.5;
    let center = vec2f(0.5, 0.5);
    let pos = input.localPos - center;  // -0.5 to 0.5
    let pixelPos = pos * input.quadSize;  // In pixels
    
    // Distance to rounded rect (simplified SDF)
    let radius = min(input.cornerRadius, min(halfSize.x, halfSize.y));
    let q = abs(pixelPos) - halfSize + radius;
    let dist = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - radius;
    
    // Anti-aliased edge
    let aa = 1.0;  // Anti-aliasing width in pixels
    let alpha = 1.0 - smoothstep(-aa, aa, dist);
    
    return vec4f(color.rgb, color.a * alpha);
  }
`;

// ───────────────────────────────────────────────────────────────────────────
// Quad Renderer Class
// ───────────────────────────────────────────────────────────────────────────

export class QuadRenderer {
  private gpuContext: GPUContext;
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private quadBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  // Quad instance data (CPU side)
  private quads: Quad[] = [];
  private maxQuads: number = 10000;
  private quadDataDirty: boolean = true;
  
  // Performance tracking
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private fps: number = 0;
  
  constructor(gpuContext: GPUContext) {
    this.gpuContext = gpuContext;
  }
  
  /**
   * Initialize render pipeline and buffers
   */
  async initialize(): Promise<boolean> {
    const { device } = this.gpuContext;
    if (!device) {
      console.error('[QuadRenderer] GPUContext not initialized');
      return false;
    }
    
    try {
      console.log('[QuadRenderer] Creating shader module...');
      
      // Create shader module
      const shaderModule = device.createShaderModule({
        label: 'Quad Shader',
        code: QUAD_SHADER,
      });
      
      // Check for compilation errors
      const compilationInfo = await shaderModule.getCompilationInfo();
      for (const message of compilationInfo.messages) {
        if (message.type === 'error') {
          console.error('[QuadRenderer] Shader error:', message.message);
          return false;
        } else if (message.type === 'warning') {
          console.warn('[QuadRenderer] Shader warning:', message.message);
        }
      }
      
      console.log('[QuadRenderer] Creating buffers...');
      
      // Create uniform buffer
      this.uniformBuffer = device.createBuffer({
        label: 'Quad Uniforms',
        size: 16,  // vec2 resolution + float time + padding
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      
      // Create quad instance buffer (storage buffer)
      // Each quad: vec2 pos + vec2 size + vec4 color + float radius + float depth + vec2 padding = 48 bytes
      const quadStride = 48;
      this.quadBuffer = device.createBuffer({
        label: 'Quad Instances',
        size: this.maxQuads * quadStride,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      
      console.log('[QuadRenderer] Creating pipeline...');
      
      // Create bind group layout
      const bindGroupLayout = device.createBindGroupLayout({
        label: 'Quad Bind Group Layout',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: 'read-only-storage' },
          },
        ],
      });
      
      // Create pipeline layout
      const pipelineLayout = device.createPipelineLayout({
        label: 'Quad Pipeline Layout',
        bindGroupLayouts: [bindGroupLayout],
      });
      
      // Create render pipeline
      this.pipeline = device.createRenderPipeline({
        label: 'Quad Render Pipeline',
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
        depthStencil: undefined,  // No depth buffer for 2D UI
      });
      
      // Create bind group
      this.bindGroup = device.createBindGroup({
        label: 'Quad Bind Group',
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.quadBuffer } },
        ],
      });
      
      console.log('[QuadRenderer] Initialization complete');
      return true;
      
    } catch (error) {
      console.error('[QuadRenderer] Failed to initialize:', error);
      return false;
    }
  }
  
  /**
   * Set quads to render
   */
  setQuads(quads: Quad[]): void {
    this.quads = quads;
    this.quadDataDirty = true;
  }
  
  /**
   * Add a single quad
   */
  addQuad(quad: Quad): void {
    if (this.quads.length >= this.maxQuads) {
      console.warn('[QuadRenderer] Max quads reached');
      return;
    }
    this.quads.push(quad);
    this.quadDataDirty = true;
  }
  
  /**
   * Clear all quads
   */
  clearQuads(): void {
    this.quads = [];
    this.quadDataDirty = true;
  }
  
  /**
   * Upload quad data to GPU
   */
  private uploadQuadData(): void {
    const { device } = this.gpuContext;
    if (!device || !this.quadBuffer || this.quads.length === 0) return;
    
    // Pack quad data into Float32Array
    // Layout: vec2 pos, vec2 size, vec4 color, float radius, float depth, vec2 padding
    const floatsPerQuad = 12;
    const data = new Float32Array(this.quads.length * floatsPerQuad);
    
    for (let i = 0; i < this.quads.length; i++) {
      const quad = this.quads[i];
      const offset = i * floatsPerQuad;
      
      data[offset + 0] = quad.x;
      data[offset + 1] = quad.y;
      data[offset + 2] = quad.width;
      data[offset + 3] = quad.height;
      data[offset + 4] = quad.color[0];
      data[offset + 5] = quad.color[1];
      data[offset + 6] = quad.color[2];
      data[offset + 7] = quad.color[3];
      data[offset + 8] = quad.cornerRadius ?? 0;
      data[offset + 9] = quad.depth ?? 0;
      data[offset + 10] = 0;  // padding
      data[offset + 11] = 0;  // padding
    }
    
    device.queue.writeBuffer(this.quadBuffer, 0, data);
    this.quadDataDirty = false;
  }
  
  /**
   * Render to an existing render pass (for multi-pass rendering)
   */
  renderToPass(renderPass: GPURenderPassEncoder, time: number = 0): void {
    const { device, width, height } = this.gpuContext;
    if (!device || !this.pipeline || !this.bindGroup || !this.uniformBuffer) {
      return;
    }
    
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    
    // Upload uniform data
    const uniformData = new Float32Array([width, height, time / 1000, 0]);
    device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    
    // Upload quad data if changed
    if (this.quadDataDirty) {
      this.uploadQuadData();
    }
    
    // Draw quads
    if (this.quads.length > 0) {
      renderPass.setPipeline(this.pipeline);
      renderPass.setBindGroup(0, this.bindGroup);
      renderPass.draw(6, this.quads.length);
    }
  }
  
  /**
   * Render a frame (standalone - creates its own pass)
   */
  render(time: number = 0): void {
    const { device, width, height } = this.gpuContext;
    if (!device || !this.pipeline || !this.bindGroup || !this.uniformBuffer) {
      return;
    }
    
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    
    // Upload uniform data
    const uniformData = new Float32Array([width, height, time / 1000, 0]);
    device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    
    // Upload quad data if changed
    if (this.quadDataDirty) {
      this.uploadQuadData();
    }
    
    // Get current texture
    const textureView = this.gpuContext.getCurrentTexture().createView();
    
    // Create command encoder
    const encoder = this.gpuContext.createCommandEncoder('Quad Render');
    
    // Begin render pass
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.04, g: 0.04, b: 0.06, a: 1 },  // Dark background
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    
    // Draw quads
    if (this.quads.length > 0) {
      renderPass.setPipeline(this.pipeline);
      renderPass.setBindGroup(0, this.bindGroup);
      // 6 vertices per quad (2 triangles), N instances
      renderPass.draw(6, this.quads.length);
    }
    
    renderPass.end();
    
    // Submit
    this.gpuContext.submit([encoder.finish()]);
  }
  
  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }
  
  /**
   * Get quad count for stats
   */
  getQuadCount(): number {
    return this.quads.length;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.uniformBuffer?.destroy();
    this.quadBuffer?.destroy();
    this.uniformBuffer = null;
    this.quadBuffer = null;
    this.pipeline = null;
    this.bindGroup = null;
  }
}
