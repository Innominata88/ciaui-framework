// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - GPU Context Manager
// 
// Handles WebGPU initialization, device management, and capability detection.
// ═══════════════════════════════════════════════════════════════════════════

export interface GPUContextOptions {
  canvas: HTMLCanvasElement;
  powerPreference?: 'low-power' | 'high-performance';
  antialias?: boolean;
}

export interface GPUCapabilities {
  maxTextureSize: number;
  maxBufferSize: number;
  maxBindGroups: number;
  maxVertexBuffers: number;
  maxComputeWorkgroupsPerDimension: number;
  supportsTimestampQuery: boolean;
  supportsFloat32Filtering: boolean;
  adapterInfo: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
}

export class GPUContext {
  // Core WebGPU objects
  adapter: GPUAdapter | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  format: GPUTextureFormat = 'bgra8unorm';
  
  // Canvas info
  canvas: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  pixelRatio: number = 1;
  
  // Capabilities
  capabilities: GPUCapabilities | null = null;
  
  // State
  initialized: boolean = false;
  
  constructor(private options: GPUContextOptions) {
    this.canvas = options.canvas;
  }
  
  /**
   * Initialize WebGPU - must be called before rendering
   */
  async initialize(): Promise<boolean> {
    console.log('[GPUContext] Initializing WebGPU...');
    
    // Check for WebGPU support
    if (!navigator.gpu) {
      console.error('[GPUContext] WebGPU is not supported in this browser');
      return false;
    }
    
    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: this.options.powerPreference ?? 'high-performance',
      });
      
      if (!this.adapter) {
        console.error('[GPUContext] Failed to get GPU adapter');
        return false;
      }
      
      // Log adapter info
      // Note: requestAdapterInfo may not be available in all browsers
      let adapterInfo = { vendor: '', architecture: '', device: '', description: '' };
      if ('requestAdapterInfo' in this.adapter) {
        adapterInfo = await (this.adapter as any).requestAdapterInfo();
      }
      console.log('[GPUContext] Adapter:', {
        vendor: adapterInfo.vendor,
        architecture: adapterInfo.architecture,
        device: adapterInfo.device,
        description: adapterInfo.description,
      });
      
      // Request device with features we need
      const requiredFeatures: GPUFeatureName[] = [];
      const optionalFeatures: GPUFeatureName[] = [
        'timestamp-query',
        'float32-filterable',
      ];
      
      // Only request features the adapter supports
      for (const feature of optionalFeatures) {
        if (this.adapter.features.has(feature)) {
          requiredFeatures.push(feature);
        }
      }
      
      this.device = await this.adapter.requestDevice({
        requiredFeatures,
        requiredLimits: {
          // Request reasonable limits for UI rendering
          maxTextureDimension2D: 4096,
          maxBindGroups: 4,
          maxBufferSize: 256 * 1024 * 1024, // 256MB
        },
      });
      
      // Handle device loss
      this.device.lost.then((info) => {
        console.error('[GPUContext] Device lost:', info.message);
        this.initialized = false;
        // Could implement auto-recovery here
      });
      
      // Get canvas context
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) {
        console.error('[GPUContext] Failed to get WebGPU canvas context');
        return false;
      }
      
      // Get preferred format
      this.format = navigator.gpu.getPreferredCanvasFormat();
      
      // Configure canvas
      this.updateCanvasSize();
      
      // Build capabilities info
      this.capabilities = {
        maxTextureSize: this.device.limits.maxTextureDimension2D,
        maxBufferSize: this.device.limits.maxBufferSize,
        maxBindGroups: this.device.limits.maxBindGroups,
        maxVertexBuffers: this.device.limits.maxVertexBuffers,
        maxComputeWorkgroupsPerDimension: this.device.limits.maxComputeWorkgroupsPerDimension,
        supportsTimestampQuery: this.device.features.has('timestamp-query'),
        supportsFloat32Filtering: this.device.features.has('float32-filterable'),
        adapterInfo: {
          vendor: adapterInfo.vendor,
          architecture: adapterInfo.architecture,
          device: adapterInfo.device,
          description: adapterInfo.description,
        },
      };
      
      this.initialized = true;
      console.log('[GPUContext] WebGPU initialized successfully');
      console.log('[GPUContext] Capabilities:', this.capabilities);
      
      return true;
      
    } catch (error) {
      console.error('[GPUContext] Failed to initialize WebGPU:', error);
      return false;
    }
  }
  
  /**
   * Update canvas size (call on resize)
   */
  updateCanvasSize(): void {
    this.pixelRatio = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth * this.pixelRatio;
    this.height = this.canvas.clientHeight * this.pixelRatio;
    
    // Update canvas backing store size
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Reconfigure context
    if (this.context && this.device) {
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });
    }
    
    console.log(`[GPUContext] Canvas resized: ${this.width}x${this.height} (ratio: ${this.pixelRatio})`);
  }
  
  /**
   * Get current render target texture
   */
  getCurrentTexture(): GPUTexture {
    if (!this.context) {
      throw new Error('GPUContext not initialized');
    }
    return this.context.getCurrentTexture();
  }
  
  /**
   * Create a command encoder
   */
  createCommandEncoder(label?: string): GPUCommandEncoder {
    if (!this.device) {
      throw new Error('GPUContext not initialized');
    }
    return this.device.createCommandEncoder({ label });
  }
  
  /**
   * Submit command buffers
   */
  submit(commandBuffers: GPUCommandBuffer[]): void {
    if (!this.device) {
      throw new Error('GPUContext not initialized');
    }
    this.device.queue.submit(commandBuffers);
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.context = null;
    this.initialized = false;
    console.log('[GPUContext] Destroyed');
  }
}
