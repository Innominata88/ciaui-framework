// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Hello World - WebGPU Test
// 
// This example tests:
// 1. WebGPU initialization
// 2. Quad rendering with rounded corners
// 3. Text rendering with MSDF fonts
// 4. Animation/frame loop
// 5. Mode switching (desktop/immersive)
// 6. Core reactive system
// ═══════════════════════════════════════════════════════════════════════════

import { 
  setMode, 
  getMode, 
  onModeChange, 
  getTokens,
  VERSION as CORE_VERSION,
  createInputManager,
  InputManager,
} from '@ciaui/core';

// Import input types 
import type {
  ClickEvent,
  Rect,
  InputKeyboardEvent,
  InputDragEvent,
} from '@ciaui/core';

import { 
  createWebGPURenderer, 
  WebGPURenderer,
  Quad,
  VERSION as RENDER_VERSION 
} from '@ciaui/render-webgpu';

// ───────────────────────────────────────────────────────────────────────────
// DOM Elements
// ───────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps')!;
const quadsEl = document.getElementById('quads')!;
const modeEl = document.getElementById('mode')!;
const gpuEl = document.getElementById('gpu')!;
const errorEl = document.getElementById('error')!;
const toggleModeBtn = document.getElementById('toggleMode')!;
const addQuadsBtn = document.getElementById('addQuads')!;
const clearQuadsBtn = document.getElementById('clearQuads')!;

// ───────────────────────────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────────────────────────

let renderer: WebGPURenderer | null = null;
let inputManager: InputManager | null = null;
let quads: Quad[] = [];
let fontLoaded = false;

// Interaction state
let hoveredQuadIndex: number | null = null;
let activeQuadIndex: number | null = null;
let dragOffset = { x: 0, y: 0 };

// Track which quads are interactive (buttons start at index 2, cards start at index 7)
const BUTTON_START_INDEX = 2;
const BUTTON_COUNT = 5;
const CARD_START_INDEX = 7;

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function randomColor(): [number, number, number, number] {
  const colors = [
    [0.376, 0.647, 0.980, 0.9],  // Blue
    [0.655, 0.545, 0.980, 0.9],  // Purple
    [0.290, 0.870, 0.502, 0.9],  // Green
    [0.984, 0.749, 0.141, 0.9],  // Yellow
    [0.973, 0.443, 0.443, 0.9],  // Red
    [0.178, 0.831, 0.749, 0.9],  // Teal
  ];
  return colors[Math.floor(Math.random() * colors.length)] as [number, number, number, number];
}

function createInitialQuads(): Quad[] {
  const tokens = getTokens();
  const mode = getMode();
  
  // Create some UI-like elements
  const quads: Quad[] = [];
  
  // Header bar
  quads.push({
    x: 0,
    y: 0,
    width: canvas.width,
    height: mode === 'immersive' ? 72 : 48,
    color: [0.07, 0.07, 0.1, 0.95],
    cornerRadius: 0,
  });
  
  // Left panel
  quads.push({
    x: 16,
    y: mode === 'immersive' ? 88 : 64,
    width: mode === 'immersive' ? 320 : 240,
    height: canvas.height - (mode === 'immersive' ? 104 : 80),
    color: [0.05, 0.05, 0.08, 0.9],
    cornerRadius: tokens.radius?.lg ?? 8,
  });
  
  // Create some "buttons" in the header
  const buttonSize = mode === 'immersive' ? 56 : 32;
  const buttonGap = mode === 'immersive' ? 12 : 8;
  const buttonY = mode === 'immersive' ? 8 : 8;
  
  for (let i = 0; i < 5; i++) {
    quads.push({
      x: 16 + i * (buttonSize + buttonGap),
      y: buttonY,
      width: buttonSize,
      height: buttonSize,
      color: randomColor(),
      cornerRadius: tokens.radius?.md ?? 6,
    });
  }
  
  // Create a grid of cards in the main area
  const cardWidth = mode === 'immersive' ? 200 : 150;
  const cardHeight = mode === 'immersive' ? 150 : 100;
  const cardGap = mode === 'immersive' ? 16 : 12;
  const startX = mode === 'immersive' ? 352 : 272;
  const startY = mode === 'immersive' ? 88 : 64;
  
  const cols = Math.floor((canvas.width - startX - 16) / (cardWidth + cardGap));
  const rows = Math.floor((canvas.height - startY - 16) / (cardHeight + cardGap));
  
  for (let row = 0; row < Math.min(rows, 4); row++) {
    for (let col = 0; col < Math.min(cols, 5); col++) {
      quads.push({
        x: startX + col * (cardWidth + cardGap),
        y: startY + row * (cardHeight + cardGap),
        width: cardWidth,
        height: cardHeight,
        color: [0.07, 0.07, 0.1, 0.85],
        cornerRadius: tokens.radius?.lg ?? 8,
      });
    }
  }
  
  return quads;
}

function addRandomQuads(count: number): void {
  const tokens = getTokens();
  const mode = getMode();
  const minSize = mode === 'immersive' ? 44 : 24;
  const maxSize = mode === 'immersive' ? 150 : 100;
  
  for (let i = 0; i < count; i++) {
    const width = minSize + Math.random() * (maxSize - minSize);
    const height = minSize + Math.random() * (maxSize - minSize);
    
    quads.push({
      x: Math.random() * (canvas.width - width),
      y: Math.random() * (canvas.height - height),
      width,
      height,
      color: randomColor(),
      cornerRadius: Math.random() * (tokens.radius?.lg ?? 8),
    });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Input Management
// ───────────────────────────────────────────────────────────────────────────

/**
 * Register hit regions for interactive quads
 */
function registerHitRegions(): void {
  if (!inputManager) return;
  
  // Clear existing regions
  inputManager.clearRegions();
  
  // Note: Quads are already in device pixels (canvas coordinates)
  // InputManager.toCanvasCoords converts mouse CSS coords to canvas coords
  // So hit regions should use quad bounds directly (no pixelRatio multiplication)
  
  // Register buttons (indices 2-6)
  for (let i = BUTTON_START_INDEX; i < BUTTON_START_INDEX + BUTTON_COUNT; i++) {
    const quad = quads[i];
    if (!quad) continue;
    
    const bounds: Rect = {
      x: quad.x,
      y: quad.y,
      width: quad.width,
      height: quad.height,
    };
    
    inputManager.register(`button-${i - BUTTON_START_INDEX}`, bounds, {
      onPointerEnter: () => {
        hoveredQuadIndex = i;
        console.log(`[Input] Hover button ${i - BUTTON_START_INDEX + 1}`);
      },
      onPointerLeave: () => {
        if (hoveredQuadIndex === i) hoveredQuadIndex = null;
      },
      onClick: (e: ClickEvent) => {
        console.log(`[Input] Click button ${i - BUTTON_START_INDEX + 1} at (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`);
        // Flash the button brighter
        if (quads[i]) {
          const originalAlpha = quads[i].color[3];
          quads[i].color = [1, 1, 1, 1];
          setTimeout(() => {
            if (quads[i]) quads[i].color[3] = originalAlpha;
          }, 100);
        }
      },
    }, {
      cursor: 'pointer',
      zIndex: 10,
      data: { type: 'button', index: i - BUTTON_START_INDEX },
    });
  }
  
  // Register cards
  for (let i = CARD_START_INDEX; i < quads.length; i++) {
    const quad = quads[i];
    if (!quad) continue;
    
    const cardIndex = i - CARD_START_INDEX;
    const bounds: Rect = {
      x: quad.x,
      y: quad.y,
      width: quad.width,
      height: quad.height,
    };
    
    inputManager.register(`card-${cardIndex}`, bounds, {
      onPointerEnter: () => {
        hoveredQuadIndex = i;
      },
      onPointerLeave: () => {
        if (hoveredQuadIndex === i) hoveredQuadIndex = null;
      },
      onClick: (e: ClickEvent) => {
        console.log(`[Input] Click card ${cardIndex + 1} at (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`);
      },
      onDragStart: (e: InputDragEvent) => {
        activeQuadIndex = i;
        dragOffset.x = e.x - quad.x;
        dragOffset.y = e.y - quad.y;
        console.log(`[Input] Start dragging card ${cardIndex + 1}`);
      },
      onDrag: (e: InputDragEvent) => {
        if (activeQuadIndex === i && quads[i]) {
          quads[i].x = e.x - dragOffset.x;
          quads[i].y = e.y - dragOffset.y;
          // Update hit region bounds
          inputManager?.updateBounds(`card-${cardIndex}`, {
            x: quads[i].x,
            y: quads[i].y,
            width: quad.width,
            height: quad.height,
          });
        }
      },
      onDragEnd: () => {
        if (activeQuadIndex === i) {
          console.log(`[Input] End dragging card ${cardIndex + 1}`);
          activeQuadIndex = null;
        }
      },
    }, {
      cursor: 'grab',
      zIndex: 5 + cardIndex, // Cards stack in order
      data: { type: 'card', index: cardIndex },
    });
  }
  
  console.log(`[Input] Registered ${inputManager.getRegionCount()} hit regions`);
}

/**
 * Set up input manager
 */
function setupInputManager(): void {
  inputManager = createInputManager({
    target: canvas,
    pixelRatio: window.devicePixelRatio || 1,
    dragThreshold: 5,
    touch: true,
  });
  
  // Start listening for input
  inputManager.start();
  
  // Log all pointer moves (debug)
  // inputManager.on('pointermove', (e) => {
  //   console.log(`Move: (${e.pointer.x.toFixed(0)}, ${e.pointer.y.toFixed(0)})`);
  // });
  
  // Global keyboard handler
  inputManager.on<InputKeyboardEvent>('keydown', (e) => {
    if (e.key === 'Escape') {
      // Cancel drag
      activeQuadIndex = null;
      console.log('[Input] Cancelled drag');
    }
  });
  
  console.log('[Input] InputManager initialized');
}

// ───────────────────────────────────────────────────────────────────────────
// Main Initialization
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              CIAUI Framework - Hello World                ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Core Version: ${CORE_VERSION.padEnd(42)}║`);
  console.log(`║  Render Version: ${RENDER_VERSION.padEnd(40)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  // Check WebGPU support
  if (!navigator.gpu) {
    console.error('WebGPU not supported');
    errorEl.style.display = 'block';
    return;
  }
  
  // Create renderer
  renderer = await createWebGPURenderer({
    canvas,
    powerPreference: 'high-performance',
    
    onInitialized: (capabilities) => {
      console.log('WebGPU initialized:', capabilities);
      gpuEl.textContent = capabilities.adapterInfo.device || 'Unknown GPU';
    },
    
    onError: (error) => {
      console.error('Renderer error:', error);
      errorEl.style.display = 'block';
    },
    
    onFrame: (time, fps) => {
      fpsEl.textContent = fps.toString();
    },
  });
  
  if (!renderer) {
    console.error('Failed to create renderer');
    errorEl.style.display = 'block';
    return;
  }
  
  // Try to load font (if available)
  try {
    const font = await renderer.loadFont(
      'IBM Plex Sans',
      '/fonts/ibm-plex-sans.json',
      '/fonts/ibm-plex-sans.png'
    );
    fontLoaded = font !== null;
    console.log('Font loaded:', fontLoaded);
  } catch (e) {
    console.log('Font not available - text rendering disabled');
    console.log('To enable text, generate an MSDF atlas. See docs/generating-fonts.md');
    fontLoaded = false;
  }
  
  // Create initial quads
  quads = createInitialQuads();
  quadsEl.textContent = quads.length.toString();
  
  // Set up input manager
  setupInputManager();
  registerHitRegions();
  
  // Set up mode change listener
  onModeChange((mode) => {
    console.log('Mode changed to:', mode);
    modeEl.textContent = mode;
    
    // Recreate quads with new sizes
    quads = createInitialQuads();
    quadsEl.textContent = quads.length.toString();
    
    // Re-register hit regions with new bounds
    registerHitRegions();
  });
  
  // Set up button handlers
  toggleModeBtn.addEventListener('click', () => {
    const currentMode = getMode();
    setMode(currentMode === 'desktop' ? 'immersive' : 'desktop');
  });
  
  addQuadsBtn.addEventListener('click', () => {
    addRandomQuads(100);
    quadsEl.textContent = quads.length.toString();
  });
  
  clearQuadsBtn.addEventListener('click', () => {
    quads = createInitialQuads();
    quadsEl.textContent = quads.length.toString();
    registerHitRegions();
  });
  
  // Start render loop
  renderer.start((r, time) => {
    // Clear previous frame data
    r.clearQuads();
    r.clearText();
    
    // Add quads with hover/active effects
    for (let i = 0; i < quads.length; i++) {
      const quad = quads[i];
      
      // Apply hover effect (brighten)
      if (hoveredQuadIndex === i || activeQuadIndex === i) {
        const brightness = activeQuadIndex === i ? 1.3 : 1.15;
        r.addQuad({
          ...quad,
          color: [
            Math.min(1, quad.color[0] * brightness),
            Math.min(1, quad.color[1] * brightness),
            Math.min(1, quad.color[2] * brightness),
            quad.color[3],
          ] as [number, number, number, number],
        });
      } else {
        r.addQuad(quad);
      }
    }
    
    // Animate some quads (pulse the buttons)
    for (let i = BUTTON_START_INDEX; i < BUTTON_START_INDEX + BUTTON_COUNT; i++) {
      if (quads[i] && hoveredQuadIndex !== i) {
        const pulse = Math.sin(time / 500 + i) * 0.1 + 0.9;
        quads[i].color[3] = pulse;
      }
    }
    
    // Add text if font is loaded
    if (fontLoaded) {
      const mode = getMode();
      const headerFontSize = mode === 'immersive' ? 24 : 16;
      const bodyFontSize = mode === 'immersive' ? 18 : 14;
      
      // Header text
      r.drawText('CIAUI Framework', 250, mode === 'immersive' ? 24 : 16, headerFontSize, [1, 1, 1, 1]);
      
      // Panel title
      r.drawText('Navigator', 32, mode === 'immersive' ? 104 : 80, bodyFontSize, [0.9, 0.9, 0.95, 1]);
      
      // Card labels
      const cardStartX = mode === 'immersive' ? 352 : 272;
      const cardStartY = mode === 'immersive' ? 88 : 64;
      const cardWidth = mode === 'immersive' ? 200 : 150;
      const cardHeight = mode === 'immersive' ? 150 : 100;
      const cardGap = mode === 'immersive' ? 16 : 12;
      
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const x = cardStartX + col * (cardWidth + cardGap) + 12;
          const y = cardStartY + row * (cardHeight + cardGap) + 16;
          r.drawText(`Card ${row * 3 + col + 1}`, x, y, bodyFontSize, [0.8, 0.8, 0.85, 1]);
        }
      }
      
      // FPS counter
      r.drawText(`FPS: ${r.getFPS()}`, canvas.width - 80, 16, 12, [0.5, 0.5, 0.55, 1]);
    }
    
    // Update stats display
    const stats = r.getStats();
    quadsEl.textContent = stats.quads.toString();
  });
  
  console.log('Render loop started!');
  if (!fontLoaded) {
    console.log('');
    console.log('📝 To enable text rendering:');
    console.log('   1. Install msdf-atlas-gen: brew install msdf-atlas-gen');
    console.log('   2. Download IBM Plex Sans from Google Fonts');
    console.log('   3. Generate atlas:');
    console.log('      msdf-atlas-gen -font IBMPlexSans-Regular.ttf -type msdf \\');
    console.log('        -format png -imageout public/fonts/ibm-plex-sans.png \\');
    console.log('        -json public/fonts/ibm-plex-sans.json -size 48 -pxrange 4');
    console.log('');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Start
// ───────────────────────────────────────────────────────────────────────────

main().catch(console.error);
