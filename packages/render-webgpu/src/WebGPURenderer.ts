// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Main Renderer
// 
// Orchestrates WebGPU rendering for CIAUI applications.
// ═══════════════════════════════════════════════════════════════════════════

import { GPUContext, GPUContextOptions, GPUCapabilities } from './GPUContext';
import { QuadRenderer, Quad } from './QuadRenderer';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export interface WebGPURendererOptions extends GPUContextOptions {
  onInitialized?: (capabilities: GPUCapabilities) => void;
  onError?: (error: Error) => void;
  onFrame?: (time: number, fps: number) => void;
}

export type RenderCallback = (renderer: WebGPURenderer, time: number) => void;

// ───────────────────────────────────────────────────────────────────────────
// Main Renderer Class
// ───────────────────────────────────────────────────────────────────────────

export class WebGPURenderer {
  private gpuContext: GPUContext;
  private quadRenderer: QuadRenderer | null = null;
  private options: WebGPURendererOptions;
  
  // Frame loop
  private running: boolean = false;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private renderCallback: RenderCallback | null = null;
  
  // Public access to capabilities
  capabilities: GPUCapabilities | null = null;
  
  constructor(options: WebGPURendererOptions) {
    this.options = options;
    this.gpuContext = new GPUContext(options);
  }
  
  /**
   * Initialize the renderer
   */
  async initialize(): Promise<boolean> {
    console.log('[WebGPURenderer] Starting initialization...');
    
    try {
      // Initialize GPU context
      const gpuOk = await this.gpuContext.initialize();
      if (!gpuOk) {
        throw new Error('Failed to initialize WebGPU context');
      }
      
      this.capabilities = this.gpuContext.capabilities;
      
      // Initialize quad renderer
      this.quadRenderer = new QuadRenderer(this.gpuContext);
      const quadOk = await this.quadRenderer.initialize();
      if (!quadOk) {
        throw new Error('Failed to initialize quad renderer');
      }
      
      // Set up resize handler
      this.setupResizeHandler();
      
      // Notify success
      if (this.options.onInitialized && this.capabilities) {
        this.options.onInitialized(this.capabilities);
      }
      
      console.log('[WebGPURenderer] Initialization complete!');
      return true;
      
    } catch (error) {
      console.error('[WebGPURenderer] Initialization failed:', error);
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      return false;
    }
  }
  
  /**
   * Set up window resize handling
   */
  private setupResizeHandler(): void {
    const handleResize = () => {
      this.gpuContext.updateCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Also observe canvas size changes
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(handleResize);
      observer.observe(this.options.canvas);
    }
  }
  
  /**
   * Start the render loop
   */
  start(callback?: RenderCallback): void {
    if (this.running) return;
    
    this.renderCallback = callback ?? null;
    this.running = true;
    this.startTime = performance.now();
    
    console.log('[WebGPURenderer] Starting render loop');
    this.tick(this.startTime);
  }
  
  /**
   * Stop the render loop
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('[WebGPURenderer] Stopped render loop');
  }
  
  /**
   * Main render loop tick
   */
  private tick = (timestamp: number): void => {
    if (!this.running) return;
    
    const time = timestamp - this.startTime;
    
    // Call user render callback
    if (this.renderCallback) {
      this.renderCallback(this, time);
    }
    
    // Render quads
    if (this.quadRenderer) {
      this.quadRenderer.render(time);
      
      // Report FPS
      if (this.options.onFrame) {
        this.options.onFrame(time, this.quadRenderer.getFPS());
      }
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.tick);
  };
  
  /**
   * Render a single frame (for manual control)
   */
  renderFrame(time: number = 0): void {
    if (this.quadRenderer) {
      this.quadRenderer.render(time);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Quad Rendering API
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Set all quads to render
   */
  setQuads(quads: Quad[]): void {
    this.quadRenderer?.setQuads(quads);
  }
  
  /**
   * Add a single quad
   */
  addQuad(quad: Quad): void {
    this.quadRenderer?.addQuad(quad);
  }
  
  /**
   * Clear all quads
   */
  clearQuads(): void {
    this.quadRenderer?.clearQuads();
  }
  
  /**
   * Helper: Draw a rectangle (convenience method)
   */
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number, number],
    cornerRadius: number = 0
  ): void {
    this.addQuad({ x, y, width, height, color, cornerRadius });
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get canvas dimensions
   */
  getSize(): { width: number; height: number; pixelRatio: number } {
    return {
      width: this.gpuContext.width,
      height: this.gpuContext.height,
      pixelRatio: this.gpuContext.pixelRatio,
    };
  }
  
  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.quadRenderer?.getFPS() ?? 0;
  }
  
  /**
   * Clean up all resources
   */
  destroy(): void {
    this.stop();
    this.quadRenderer?.destroy();
    this.gpuContext.destroy();
    console.log('[WebGPURenderer] Destroyed');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Factory Function
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create and initialize a WebGPU renderer
 */
export async function createWebGPURenderer(
  options: WebGPURendererOptions
): Promise<WebGPURenderer | null> {
  const renderer = new WebGPURenderer(options);
  const success = await renderer.initialize();
  
  if (!success) {
    renderer.destroy();
    return null;
  }
  
  return renderer;
}
