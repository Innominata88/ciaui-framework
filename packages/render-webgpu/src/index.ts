// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Public API
// ═══════════════════════════════════════════════════════════════════════════

export { GPUContext } from './GPUContext';
export type { GPUContextOptions, GPUCapabilities } from './GPUContext';

export { QuadRenderer } from './QuadRenderer';
export type { Quad } from './QuadRenderer';

export { WebGPURenderer } from './WebGPURenderer';
export type { WebGPURendererOptions, RenderCallback } from './WebGPURenderer';

// Text rendering
export { TextRenderer } from './text/TextRenderer';
export { loadFont, loadFontFromData, getGlyph, getKerning } from './text/FontLoader';
export { measureText, layoutText } from './text/TextLayout';
export type { 
  MSDFAtlas, 
  MSDFGlyph, 
  LoadedFont, 
  TextLayoutOptions,
  TextMetrics,
  TextRenderCommand,
} from './text/types';

// Factory function
import { WebGPURenderer, WebGPURendererOptions } from './WebGPURenderer';

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

// Version
export const VERSION = '0.0.1';
