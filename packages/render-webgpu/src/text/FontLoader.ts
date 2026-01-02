// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Font Loader
// 
// Loads MSDF font atlases (texture + metadata) for text rendering.
// Supports both msdf-atlas-gen and msdf-bmfont-xml JSON formats.
// ═══════════════════════════════════════════════════════════════════════════

import type { MSDFAtlas, MSDFGlyph, LoadedFont } from './types';

// ───────────────────────────────────────────────────────────────────────────
// BMFont format types (from msdf-bmfont-xml)
// ───────────────────────────────────────────────────────────────────────────

interface BMFontChar {
  id: number;
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  page: number;
}

interface BMFontKerning {
  first: number;
  second: number;
  amount: number;
}

interface BMFontData {
  pages: string[];
  chars: BMFontChar[];
  kernings?: BMFontKerning[];
  info: {
    face: string;
    size: number;
  };
  common: {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
  };
  distanceField?: {
    fieldType: string;
    distanceRange: number;
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Format Detection and Conversion
// ───────────────────────────────────────────────────────────────────────────

function isBMFontFormat(data: unknown): data is BMFontData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'chars' in data &&
    'common' in data &&
    Array.isArray((data as BMFontData).chars)
  );
}

function convertBMFontToMSDFAtlas(bmfont: BMFontData): MSDFAtlas {
  const { info, common, chars, kernings, distanceField } = bmfont;
  
  // Convert to msdf-atlas-gen format
  const atlas: MSDFAtlas = {
    atlas: {
      type: (distanceField?.fieldType as 'msdf' | 'mtsdf' | 'sdf') ?? 'msdf',
      distanceRange: distanceField?.distanceRange ?? 4,
      size: info.size,
      width: common.scaleW,
      height: common.scaleH,
      yOrigin: 'top', // BMFont uses top-left origin
    },
    metrics: {
      emSize: info.size,
      lineHeight: common.lineHeight / info.size,
      ascender: common.base / info.size,
      descender: (common.base - common.lineHeight) / info.size,
      underlineY: 0,
      underlineThickness: 1,
    },
    glyphs: chars.map((char): MSDFGlyph => {
      // BMFont stores pixel coordinates, we need to convert
      const scale = 1 / info.size;
      
      return {
        unicode: char.id,
        advance: char.xadvance * scale,
        // planeBounds: glyph position relative to baseline (in em units)
        planeBounds: char.width > 0 ? {
          left: char.xoffset * scale,
          bottom: (common.base - char.yoffset - char.height) * scale,
          right: (char.xoffset + char.width) * scale,
          top: (common.base - char.yoffset) * scale,
        } : undefined,
        // atlasBounds: position in texture (in pixels)
        atlasBounds: char.width > 0 ? {
          left: char.x,
          bottom: char.y + char.height,
          right: char.x + char.width,
          top: char.y,
        } : undefined,
      };
    }),
    kerning: kernings?.map(k => ({
      unicode1: k.first,
      unicode2: k.second,
      advance: k.amount / info.size,
    })),
  };
  
  return atlas;
}

// ───────────────────────────────────────────────────────────────────────────
// Font Loading
// ───────────────────────────────────────────────────────────────────────────

/**
 * Load an MSDF font from atlas JSON and texture image
 */
export async function loadFont(
  device: GPUDevice,
  name: string,
  atlasJsonUrl: string,
  atlasImageUrl: string
): Promise<LoadedFont> {
  console.log(`[FontLoader] Loading font: ${name}`);
  
  // Load atlas metadata
  const atlasResponse = await fetch(atlasJsonUrl);
  if (!atlasResponse.ok) {
    throw new Error(`Failed to load font atlas JSON: ${atlasJsonUrl}`);
  }
  const rawData = await atlasResponse.json();
  
  // Detect format and convert if needed
  let atlas: MSDFAtlas;
  if (isBMFontFormat(rawData)) {
    console.log(`[FontLoader] Detected BMFont format, converting...`);
    atlas = convertBMFontToMSDFAtlas(rawData);
  } else {
    atlas = rawData as MSDFAtlas;
  }
  
  // Load atlas texture
  const imageResponse = await fetch(atlasImageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to load font atlas image: ${atlasImageUrl}`);
  }
  const imageBlob = await imageResponse.blob();
  const imageBitmap = await createImageBitmap(imageBlob);
  
  // Create GPU texture
  const texture = device.createTexture({
    label: `${name} Font Atlas`,
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | 
           GPUTextureUsage.COPY_DST | 
           GPUTextureUsage.RENDER_ATTACHMENT,
  });
  
  // Upload texture data
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture },
    [imageBitmap.width, imageBitmap.height]
  );
  
  // Create sampler with linear filtering for smooth text
  const sampler = device.createSampler({
    label: `${name} Font Sampler`,
    minFilter: 'linear',
    magFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });
  
  // Build glyph lookup map
  const glyphMap = new Map<number, MSDFGlyph>();
  for (const glyph of atlas.glyphs) {
    glyphMap.set(glyph.unicode, glyph);
  }
  
  // Build kerning lookup map
  const kerningMap = new Map<string, number>();
  if (atlas.kerning) {
    for (const kern of atlas.kerning) {
      const key = `${kern.unicode1}-${kern.unicode2}`;
      kerningMap.set(key, kern.advance);
    }
  }
  
  console.log(`[FontLoader] Loaded ${name}: ${atlas.glyphs.length} glyphs, ${atlas.kerning?.length ?? 0} kerning pairs`);
  console.log(`[FontLoader] Atlas size: ${atlas.atlas.width}x${atlas.atlas.height}, distance range: ${atlas.atlas.distanceRange}`);
  
  return {
    name,
    atlas,
    texture,
    sampler,
    glyphMap,
    kerningMap,
  };
}

/**
 * Load font from embedded base64 data (for built-in fonts)
 */
export async function loadFontFromData(
  device: GPUDevice,
  name: string,
  atlasData: MSDFAtlas | BMFontData,
  imageData: string // base64 encoded PNG
): Promise<LoadedFont> {
  console.log(`[FontLoader] Loading embedded font: ${name}`);
  
  // Convert if BMFont format
  const atlas = isBMFontFormat(atlasData) 
    ? convertBMFontToMSDFAtlas(atlasData)
    : atlasData;
  
  // Decode base64 image
  const binaryString = atob(imageData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  const imageBitmap = await createImageBitmap(blob);
  
  // Create GPU texture
  const texture = device.createTexture({
    label: `${name} Font Atlas`,
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | 
           GPUTextureUsage.COPY_DST | 
           GPUTextureUsage.RENDER_ATTACHMENT,
  });
  
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture },
    [imageBitmap.width, imageBitmap.height]
  );
  
  const sampler = device.createSampler({
    label: `${name} Font Sampler`,
    minFilter: 'linear',
    magFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });
  
  const glyphMap = new Map<number, MSDFGlyph>();
  for (const glyph of atlas.glyphs) {
    glyphMap.set(glyph.unicode, glyph);
  }
  
  const kerningMap = new Map<string, number>();
  if (atlas.kerning) {
    for (const kern of atlas.kerning) {
      kerningMap.set(`${kern.unicode1}-${kern.unicode2}`, kern.advance);
    }
  }
  
  console.log(`[FontLoader] Loaded embedded ${name}: ${atlas.glyphs.length} glyphs`);
  
  return {
    name,
    atlas,
    texture,
    sampler,
    glyphMap,
    kerningMap,
  };
}

/**
 * Get kerning between two characters
 */
export function getKerning(font: LoadedFont, char1: number, char2: number): number {
  return font.kerningMap.get(`${char1}-${char2}`) ?? 0;
}

/**
 * Get glyph for a character, with fallback to replacement character
 */
export function getGlyph(font: LoadedFont, charCode: number): MSDFGlyph | null {
  // Try exact match
  let glyph = font.glyphMap.get(charCode);
  if (glyph) return glyph;
  
  // Try replacement character (U+FFFD)
  glyph = font.glyphMap.get(0xFFFD);
  if (glyph) return glyph;
  
  // Try question mark as fallback
  glyph = font.glyphMap.get(0x3F);
  return glyph ?? null;
}
