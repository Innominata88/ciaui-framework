// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/render-webgpu - Text Layout Engine
// 
// Handles text measurement, line breaking, and glyph positioning.
// ═══════════════════════════════════════════════════════════════════════════

import type { 
  LoadedFont, 
  TextLayoutOptions, 
  PositionedGlyph,
  TextMetrics 
} from './types';
import { getGlyph, getKerning } from './FontLoader';

/**
 * Measure text without rendering
 */
export function measureText(
  font: LoadedFont,
  text: string,
  options: TextLayoutOptions
): TextMetrics {
  const { positioned, lines } = layoutText(font, text, options);
  
  if (positioned.length === 0) {
    return { width: 0, height: 0, lineCount: 0, lines: [] };
  }
  
  // Find bounding box
  let maxX = 0;
  let maxY = 0;
  
  for (const glyph of positioned) {
    maxX = Math.max(maxX, glyph.x + glyph.width);
    maxY = Math.max(maxY, glyph.y + glyph.height);
  }
  
  return {
    width: maxX,
    height: maxY,
    lineCount: lines.length,
    lines: lines.map(line => ({
      width: line.width,
      glyphCount: line.glyphs.length,
    })),
  };
}

/**
 * Layout text into positioned glyphs
 */
export function layoutText(
  font: LoadedFont,
  text: string,
  options: TextLayoutOptions
): { positioned: PositionedGlyph[]; lines: LayoutLine[] } {
  const { 
    fontSize, 
    lineHeight = 1.2,
    letterSpacing = 0,
    maxWidth,
    align = 'left',
  } = options;
  
  const { atlas } = font;
  const scale = fontSize / atlas.metrics.emSize;
  const actualLineHeight = fontSize * lineHeight;
  
  // First pass: break text into lines
  const lines = breakIntoLines(font, text, scale, letterSpacing, maxWidth);
  
  // Second pass: position glyphs
  const positioned: PositionedGlyph[] = [];
  let y = 0;
  
  for (const line of lines) {
    // Calculate line offset for alignment
    let xOffset = 0;
    if (align === 'center' && maxWidth) {
      xOffset = (maxWidth - line.width) / 2;
    } else if (align === 'right' && maxWidth) {
      xOffset = maxWidth - line.width;
    }
    
    let x = xOffset;
    let prevCharCode = 0;
    
    for (const char of line.chars) {
      const glyph = getGlyph(font, char.charCode);
      if (!glyph) continue;
      
      // Apply kerning
      if (prevCharCode) {
        x += getKerning(font, prevCharCode, char.charCode) * scale;
      }
      
      // Position glyph if it has visual bounds
      if (glyph.planeBounds && glyph.atlasBounds) {
        const pb = glyph.planeBounds;
        const ab = glyph.atlasBounds;
        
        // Glyph dimensions in pixels
        const glyphWidth = (pb.right - pb.left) * scale;
        const glyphHeight = (pb.top - pb.bottom) * scale;
        
        // Glyph position (baseline-relative)
        const glyphX = x + pb.left * scale;
        const glyphY = y + (atlas.metrics.ascender - pb.top) * scale;
        
        // UV coordinates (normalized 0-1)
        const atlasWidth = atlas.atlas.width;
        const atlasHeight = atlas.atlas.height;
        
        // Handle yOrigin difference
        let u0, v0, u1, v1;
        if (atlas.atlas.yOrigin === 'bottom') {
          u0 = ab.left / atlasWidth;
          v0 = 1 - ab.top / atlasHeight;
          u1 = ab.right / atlasWidth;
          v1 = 1 - ab.bottom / atlasHeight;
        } else {
          // yOrigin === 'top' (BMFont format)
          u0 = ab.left / atlasWidth;
          v0 = ab.top / atlasHeight;
          u1 = ab.right / atlasWidth;
          v1 = ab.bottom / atlasHeight;
        }
        
        positioned.push({
          glyph,
          x: glyphX,
          y: glyphY,
          width: glyphWidth,
          height: glyphHeight,
          u0,
          v0,
          u1,
          v1,
        });
      }
      
      // Advance cursor
      x += glyph.advance * scale + letterSpacing;
      prevCharCode = char.charCode;
    }
    
    y += actualLineHeight;
  }
  
  return { positioned, lines };
}

// ───────────────────────────────────────────────────────────────────────────
// Internal: Line Breaking
// ───────────────────────────────────────────────────────────────────────────

interface LayoutChar {
  charCode: number;
  char: string;
  advance: number;
}

interface LayoutLine {
  chars: LayoutChar[];
  width: number;
  glyphs: PositionedGlyph[];
}

function breakIntoLines(
  font: LoadedFont,
  text: string,
  scale: number,
  letterSpacing: number,
  maxWidth?: number
): LayoutLine[] {
  const lines: LayoutLine[] = [];
  let currentLine: LayoutChar[] = [];
  let currentWidth = 0;
  let wordBuffer: LayoutChar[] = [];
  let wordWidth = 0;
  let prevCharCode = 0;
  
  const flushWord = () => {
    if (wordBuffer.length === 0) return;
    
    // Check if word fits on current line
    if (maxWidth && currentWidth + wordWidth > maxWidth && currentLine.length > 0) {
      // Start new line
      lines.push({ chars: currentLine, width: currentWidth, glyphs: [] });
      currentLine = [];
      currentWidth = 0;
    }
    
    // Add word to current line
    currentLine.push(...wordBuffer);
    currentWidth += wordWidth;
    wordBuffer = [];
    wordWidth = 0;
  };
  
  const flushLine = () => {
    flushWord();
    if (currentLine.length > 0 || lines.length === 0) {
      lines.push({ chars: currentLine, width: currentWidth, glyphs: [] });
    }
    currentLine = [];
    currentWidth = 0;
  };
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charCode = text.charCodeAt(i);
    
    // Handle newlines
    if (char === '\n') {
      flushLine();
      prevCharCode = 0;
      continue;
    }
    
    // Handle carriage return
    if (char === '\r') {
      continue;
    }
    
    const glyph = getGlyph(font, charCode);
    if (!glyph) continue;
    
    // Calculate advance with kerning
    let advance = glyph.advance * scale + letterSpacing;
    if (prevCharCode) {
      advance += getKerning(font, prevCharCode, charCode) * scale;
    }
    
    const layoutChar: LayoutChar = { charCode, char, advance };
    
    // Check for word boundary (space)
    if (char === ' ' || char === '\t') {
      flushWord();
      currentLine.push(layoutChar);
      currentWidth += advance;
    } else {
      wordBuffer.push(layoutChar);
      wordWidth += advance;
      
      // Check if single word exceeds max width (force break)
      if (maxWidth && wordWidth > maxWidth && wordBuffer.length > 1) {
        // Keep all but last character on current line
        const lastChar = wordBuffer.pop()!;
        wordWidth -= lastChar.advance;
        flushWord();
        flushLine();
        wordBuffer = [lastChar];
        wordWidth = lastChar.advance;
      }
    }
    
    prevCharCode = charCode;
  }
  
  // Flush remaining content
  flushLine();
  
  return lines;
}
