// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Text Rendering Types
// 
// Type definitions for MSDF (Multi-channel Signed Distance Field) text rendering.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MSDF Atlas metadata (matches msdf-atlas-gen JSON output)
 */
export interface MSDFAtlas {
  atlas: {
    type: 'msdf' | 'mtsdf' | 'sdf';
    distanceRange: number;
    size: number;
    width: number;
    height: number;
    yOrigin: 'bottom' | 'top';
  };
  metrics: {
    emSize: number;
    lineHeight: number;
    ascender: number;
    descender: number;
    underlineY: number;
    underlineThickness: number;
  };
  glyphs: MSDFGlyph[];
  kerning?: MSDFKerning[];
}

/**
 * Individual glyph data
 */
export interface MSDFGlyph {
  unicode: number;
  advance: number;
  planeBounds?: {
    left: number;
    bottom: number;
    right: number;
    top: number;
  };
  atlasBounds?: {
    left: number;
    bottom: number;
    right: number;
    top: number;
  };
}

/**
 * Kerning pair
 */
export interface MSDFKerning {
  unicode1: number;
  unicode2: number;
  advance: number;
}

/**
 * Loaded font ready for rendering
 */
export interface LoadedFont {
  name: string;
  atlas: MSDFAtlas;
  texture: GPUTexture;
  sampler: GPUSampler;
  glyphMap: Map<number, MSDFGlyph>;
  kerningMap: Map<string, number>;
}

/**
 * Text layout options
 */
export interface TextLayoutOptions {
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * Positioned glyph for rendering
 */
export interface PositionedGlyph {
  glyph: MSDFGlyph;
  x: number;
  y: number;
  width: number;
  height: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/**
 * Text measurement result
 */
export interface TextMetrics {
  width: number;
  height: number;
  lineCount: number;
  lines: {
    width: number;
    glyphCount: number;
  }[];
}

/**
 * Text render command
 */
export interface TextRenderCommand {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: [number, number, number, number];
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}
