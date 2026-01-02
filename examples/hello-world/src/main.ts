// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Hello World - WebGPU Test
// 
// This example tests:
// 1. WebGPU initialization
// 2. Quad rendering with rounded corners
// 3. Animation/frame loop
// 4. Mode switching (desktop/immersive)
// 5. Core reactive system
// ═══════════════════════════════════════════════════════════════════════════

import { 
  setMode, 
  getMode, 
  onModeChange, 
  getTokens,
  VERSION as CORE_VERSION 
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
let quads: Quad[] = [];

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
  
  // Create initial quads
  quads = createInitialQuads();
  quadsEl.textContent = quads.length.toString();
  
  // Set up mode change listener
  onModeChange((mode) => {
    console.log('Mode changed to:', mode);
    modeEl.textContent = mode;
    
    // Recreate quads with new sizes
    quads = createInitialQuads();
    quadsEl.textContent = quads.length.toString();
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
  });
  
  // Start render loop
  renderer.start((r, time) => {
    // Update renderer with current quads
    r.setQuads(quads);
    
    // Animate some quads (example: pulse the buttons)
    for (let i = 3; i < 8; i++) {
      if (quads[i]) {
        const pulse = Math.sin(time / 500 + i) * 0.1 + 0.9;
        quads[i].color[3] = pulse;
      }
    }
  });
  
  console.log('Render loop started!');
}

// ───────────────────────────────────────────────────────────────────────────
// Start
// ───────────────────────────────────────────────────────────────────────────

main().catch(console.error);
