# Generating MSDF Font Atlases

This guide explains how to generate MSDF (Multi-channel Signed Distance Field) font atlases for use with CIAUI's text rendering system.

## Why MSDF?

MSDF text rendering provides:
- **Crisp text at any size** - Essential for VR where viewing distance varies
- **GPU efficiency** - Single texture lookup per pixel
- **Small file size** - One atlas covers all font sizes
- **Smooth animations** - Scale and rotate text without quality loss

## Prerequisites

### Option 1: msdf-atlas-gen (Recommended)

Install the official tool from: https://github.com/Chlumsky/msdf-atlas-gen

```bash
# macOS (Homebrew)
brew install msdf-atlas-gen

# Linux (build from source)
git clone https://github.com/Chlumsky/msdf-atlas-gen.git
cd msdf-atlas-gen
mkdir build && cd build
cmake ..
make
sudo make install

# Windows
# Download pre-built binaries from GitHub releases
```

### Option 2: msdf-bmfont-xml (Node.js)

```bash
npm install -g msdf-bmfont-xml
```

## Generating an Atlas

### Using msdf-atlas-gen

```bash
# Basic generation for IBM Plex Sans
msdf-atlas-gen \
  -font IBMPlexSans-Regular.ttf \
  -type msdf \
  -format png \
  -imageout ibm-plex-sans.png \
  -json ibm-plex-sans.json \
  -size 48 \
  -pxrange 4 \
  -charset ascii

# Full character set (including extended Latin)
msdf-atlas-gen \
  -font IBMPlexSans-Regular.ttf \
  -type msdf \
  -format png \
  -imageout ibm-plex-sans.png \
  -json ibm-plex-sans.json \
  -size 48 \
  -pxrange 4 \
  -charset charset.txt

# For multiple weights, generate separate atlases
msdf-atlas-gen -font IBMPlexSans-Medium.ttf ...
msdf-atlas-gen -font IBMPlexSans-Bold.ttf ...
```

### Using msdf-bmfont-xml

```bash
msdf-bmfont \
  -f json \
  -o ibm-plex-sans \
  -s 48 \
  -r 4 \
  -t msdf \
  IBMPlexSans-Regular.ttf
```

## Character Sets

### Basic ASCII (Default)
Covers A-Z, a-z, 0-9, and common punctuation.

### Extended for Scientific Use

Create a `charset.txt` file with additional characters:

```
 !"#$%&'()*+,-./0123456789:;<=>?@
ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`
abcdefghijklmnopqrstuvwxyz{|}~
±×÷≤≥≠≈∞∑∫∂√πθαβγδεμσω°²³
```

## Output Files

The generator produces two files:

### 1. Image (PNG)
- Contains all glyphs packed into a texture atlas
- Format: RGBA PNG with distance field data in RGB channels
- Typical size: 512x512 or 1024x1024 depending on character count

### 2. Metadata (JSON)
- Glyph positions, sizes, and metrics
- Kerning pairs
- Font metrics (ascender, descender, etc.)

## File Placement

Place generated files in your project:

```
your-app/
├── public/
│   └── fonts/
│       ├── ibm-plex-sans.png
│       └── ibm-plex-sans.json
```

## Loading in CIAUI

```typescript
import { createWebGPURenderer } from '@ciaui/render-webgpu';

const renderer = await createWebGPURenderer({ canvas });

// Load the font
await renderer.loadFont(
  'IBM Plex Sans',
  '/fonts/ibm-plex-sans.json',
  '/fonts/ibm-plex-sans.png'
);

// Now you can render text
renderer.drawText('Hello CIAUI!', 100, 100, 24, [1, 1, 1, 1]);
```

## Recommended Fonts for Scientific UI

| Font | Style | Best For |
|------|-------|----------|
| IBM Plex Sans | Technical | Code, data labels |
| IBM Plex Mono | Monospace | Code blocks, tables |
| Inter | Modern | General UI |
| Roboto | Neutral | Mobile-friendly |
| Source Sans Pro | Readable | Documentation |

## Tips

1. **Size matters**: Generate at 48px for good quality across all render sizes
2. **Distance range**: Use 4px for most cases, 8px for very large text
3. **Power of 2**: Atlas size should be power of 2 (512, 1024, 2048)
4. **Test early**: Verify text looks crisp at both small (12px) and large (72px) sizes
5. **Kerning**: Enable kerning export for professional typography

## Troubleshooting

### Blurry text at small sizes
- Increase `-pxrange` to 6 or 8
- Ensure atlas size is large enough

### Missing characters
- Check charset includes all needed characters
- Some fonts don't include all Unicode ranges

### Artifacts at edges
- Increase atlas padding
- Try `-pxrange 6`

## Advanced: Multiple Weights

For a complete type system, generate atlases for multiple weights:

```bash
# Regular (body text)
msdf-atlas-gen -font IBMPlexSans-Regular.ttf -json regular.json -imageout regular.png ...

# Medium (labels, buttons)  
msdf-atlas-gen -font IBMPlexSans-Medium.ttf -json medium.json -imageout medium.png ...

# Bold (headings)
msdf-atlas-gen -font IBMPlexSans-Bold.ttf -json bold.json -imageout bold.png ...
```

Then load each as a separate font in CIAUI and select based on weight needs.
