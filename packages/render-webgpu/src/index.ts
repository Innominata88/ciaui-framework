// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Public API
// ═══════════════════════════════════════════════════════════════════════════

export { GPUContext } from './GPUContext';
export type { GPUContextOptions, GPUCapabilities } from './GPUContext';

export { QuadRenderer } from './QuadRenderer';
export type { Quad } from './QuadRenderer';

export { WebGPURenderer, createWebGPURenderer } from './WebGPURenderer';
export type { WebGPURendererOptions, RenderCallback } from './WebGPURenderer';

// Version
export const VERSION = '0.0.1';
