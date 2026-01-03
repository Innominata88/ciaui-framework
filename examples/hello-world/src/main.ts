// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Hello World - Component System Demo
// 
// This example demonstrates the component system:
// 1. UIManager coordinates everything
// 2. Components auto-register hit regions
// 3. Declarative UI construction
// 4. Automatic hover/click handling
// ═══════════════════════════════════════════════════════════════════════════

import { 
  setMode, 
  getMode, 
  onModeChange, 
  getTokens,
  VERSION as CORE_VERSION,
  createInputManager,
  InputManager,
  // Component system
  createUIManager,
  UIManager,
  Box,
  Text,
  Button,
  Panel,
  Card,
} from '@ciaui/core';

import type { ComponentColor, RenderOutput } from '@ciaui/core';

import { 
  createWebGPURenderer, 
  WebGPURenderer,
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
let ui: UIManager | null = null;
let fontLoaded = false;

// ───────────────────────────────────────────────────────────────────────────
// Color Palette
// ───────────────────────────────────────────────────────────────────────────

const colors = {
  background: [0.04, 0.04, 0.06, 1] as ComponentColor,
  header: [0.07, 0.07, 0.1, 0.95] as ComponentColor,
  panel: [0.05, 0.05, 0.08, 0.9] as ComponentColor,
  card: [0.07, 0.07, 0.1, 0.85] as ComponentColor,
  buttonBlue: [0.376, 0.647, 0.980, 0.9] as ComponentColor,
  buttonPurple: [0.655, 0.545, 0.980, 0.9] as ComponentColor,
  buttonGreen: [0.290, 0.870, 0.502, 0.9] as ComponentColor,
  buttonYellow: [0.984, 0.749, 0.141, 0.9] as ComponentColor,
  buttonRed: [0.973, 0.443, 0.443, 0.9] as ComponentColor,
  textPrimary: [1, 1, 1, 1] as ComponentColor,
  textSecondary: [0.8, 0.8, 0.85, 1] as ComponentColor,
  textMuted: [0.5, 0.5, 0.55, 1] as ComponentColor,
};

// ───────────────────────────────────────────────────────────────────────────
// UI Building
// ───────────────────────────────────────────────────────────────────────────

function buildUI(): void {
  if (!ui) return;
  
  // Local reference to avoid null checks in callbacks
  const uiManager = ui;
  
  const mode = getMode();
  const tokens = getTokens();
  const isImmersive = mode === 'immersive';
  
  // Clear existing UI
  uiManager.clear();
  
  // Get dimensions
  const width = canvas.width;
  const height = canvas.height;
  
  // Sizes based on mode
  const headerHeight = isImmersive ? 72 : 48;
  const panelWidth = isImmersive ? 320 : 240;
  const buttonSize = isImmersive ? 56 : 32;
  const cardWidth = isImmersive ? 200 : 150;
  const cardHeight = isImmersive ? 150 : 100;
  const gap = isImmersive ? 16 : 12;
  const fontSize = isImmersive ? 16 : 14;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Header Bar
  // ─────────────────────────────────────────────────────────────────────────
  
  const header = new Box({
    id: 'header',
    x: 0,
    y: 0,
    width: width,
    height: headerHeight,
    color: colors.header,
    cornerRadius: 0,
  });
  uiManager.add(header);
  
  // Header title (if font loaded)
  if (fontLoaded) {
    const title = new Text({
      id: 'title',
      text: 'CIAUI Framework',
      x: 250,
      y: isImmersive ? 24 : 16,
      fontSize: isImmersive ? 24 : 16,
      color: colors.textPrimary,
    });
    uiManager.add(title);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Toolbar Buttons
  // ─────────────────────────────────────────────────────────────────────────
  
  const buttonColors = [
    colors.buttonBlue,
    colors.buttonPurple,
    colors.buttonGreen,
    colors.buttonYellow,
    colors.buttonRed,
  ];
  
  const buttonGap = isImmersive ? 12 : 8;
  const buttonY = isImmersive ? 8 : 8;
  
  buttonColors.forEach((color, i) => {
    const btn = new Box({
      id: `toolbar-btn-${i}`,
      x: 16 + i * (buttonSize + buttonGap),
      y: buttonY,
      width: buttonSize,
      height: buttonSize,
      color: color,
      cornerRadius: tokens.radius?.md ?? 6,
      interactive: true,
      cursor: 'pointer',
      onClick: () => {
        console.log(`[UI] Toolbar button ${i + 1} clicked`);
      },
    });
    uiManager.add(btn);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Left Panel
  // ─────────────────────────────────────────────────────────────────────────
  
  const leftPanel = new Panel({
    id: 'left-panel',
    x: 16,
    y: headerHeight + gap,
    width: panelWidth,
    height: height - headerHeight - gap * 2,
    color: colors.panel,
    cornerRadius: tokens.radius?.lg ?? 8,
    title: 'Navigator',
    titleColor: colors.textSecondary,
    padding: 16,
  });
  uiManager.add(leftPanel);
  
  // Add some buttons inside the panel
  const panelButtonLabels = ['Datasets', 'Views', 'Annotations', 'Settings'];
  panelButtonLabels.forEach((label, i) => {
    const btn = new Button({
      id: `nav-btn-${i}`,
      x: 16,
      y: headerHeight + gap + 56 + i * (buttonSize + 8),
      width: panelWidth - 32,
      height: buttonSize,
      label: label,
      color: [0.15, 0.15, 0.2, 0.8],
      cornerRadius: 6,
      fontSize: fontSize - 2,
      onClick: () => {
        console.log(`[UI] Nav button "${label}" clicked`);
      },
    });
    uiManager.add(btn);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Main Content Area - Card Grid
  // ─────────────────────────────────────────────────────────────────────────
  
  const contentStartX = 16 + panelWidth + gap;
  const contentStartY = headerHeight + gap;
  const contentWidth = width - contentStartX - 16;
  const contentHeight = height - headerHeight - gap * 2;
  
  // Calculate grid
  const cols = Math.floor((contentWidth + gap) / (cardWidth + gap));
  const rows = Math.floor((contentHeight + gap) / (cardHeight + gap));
  
  let cardIndex = 0;
  for (let row = 0; row < Math.min(rows, 4); row++) {
    for (let col = 0; col < Math.min(cols, 5); col++) {
      const x = contentStartX + col * (cardWidth + gap);
      const y = contentStartY + row * (cardHeight + gap);
      
      const idx = cardIndex;
      
      // Track position at drag start (mutable)
      let dragStartX = x;
      let dragStartY = y;
      
      const card = new Card({
        id: `card-${cardIndex}`,
        x: x,
        y: y,
        width: cardWidth,
        height: cardHeight,
        color: colors.card,
        cornerRadius: tokens.radius?.lg ?? 8,
        interactive: true,
        draggable: true,
        onClick: () => {
          console.log(`[UI] Card ${idx + 1} clicked`);
        },
        onDragStart: (dragX, dragY) => {
          // Capture current position when drag starts
          dragStartX = card.bounds.x;
          dragStartY = card.bounds.y;
          console.log(`[UI] Start dragging card ${idx + 1}`);
        },
        onDrag: (dragX, dragY, dx, dy) => {
          // Update card position relative to where drag started
          card.setProps({
            x: dragStartX + dx,
            y: dragStartY + dy,
          });
        },
        onDragEnd: (dragX, dragY) => {
          console.log(`[UI] End dragging card ${idx + 1}`);
        },
      });
      
      uiManager.add(card);
      
      // Add card label as child of card (so it moves with the card)
      if (fontLoaded) {
        const label = new Text({
          id: `card-label-${cardIndex}`,
          text: `Card ${cardIndex + 1}`,
          x: 12,  // Relative to card
          y: 16,  // Relative to card
          fontSize: fontSize,
          color: colors.textSecondary,
        });
        card.addChild(label);
      }
      
      cardIndex++;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FPS Counter
  // ─────────────────────────────────────────────────────────────────────────
  
  if (fontLoaded) {
    const fpsText = new Text({
      id: 'fps-text',
      text: 'FPS: --',
      x: width - 80,
      y: 16,
      fontSize: 12,
      color: colors.textMuted,
    });
    uiManager.add(fpsText);
  }
  
  console.log(`[UI] Built ${uiManager.getComponentCount()} components, ${uiManager.getHitRegionCount()} hit regions`);
}

// ───────────────────────────────────────────────────────────────────────────
// Main Initialization
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         CIAUI Framework - Component System Demo           ║');
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
  
  // Try to load font
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
    fontLoaded = false;
  }
  
  // Create input manager
  inputManager = createInputManager({
    target: canvas,
    pixelRatio: window.devicePixelRatio || 1,
    dragThreshold: 5,
  });
  inputManager.start();
  
  // Create UI manager
  ui = createUIManager({
    width: canvas.width,
    height: canvas.height,
    inputManager: inputManager,
    pixelRatio: window.devicePixelRatio || 1,
  });
  
  // Build initial UI
  buildUI();
  
  // Mode change listener
  onModeChange((mode) => {
    console.log('Mode changed to:', mode);
    modeEl.textContent = mode;
    buildUI();
  });
  
  // DOM button handlers
  toggleModeBtn.addEventListener('click', () => {
    setMode(getMode() === 'desktop' ? 'immersive' : 'desktop');
  });
  
  addQuadsBtn.addEventListener('click', () => {
    // Add some random boxes
    if (!ui) return;
    for (let i = 0; i < 10; i++) {
      const box = new Box({
        x: Math.random() * (canvas.width - 100),
        y: Math.random() * (canvas.height - 100),
        width: 50 + Math.random() * 50,
        height: 50 + Math.random() * 50,
        color: [Math.random(), Math.random(), Math.random(), 0.8],
        cornerRadius: Math.random() * 12,
        interactive: true,
        cursor: 'pointer',
        onClick: () => console.log('[UI] Random box clicked'),
      });
      ui.add(box);
    }
    console.log(`[UI] Added 10 random boxes. Total: ${ui.getComponentCount()}`);
  });
  
  clearQuadsBtn.addEventListener('click', () => {
    buildUI();
  });
  
  // Handle resize
  window.addEventListener('resize', () => {
    if (ui && renderer) {
      // Renderer handles canvas resize internally
      setTimeout(() => {
        ui!.setSize(canvas.width, canvas.height);
        buildUI();
      }, 100);
    }
  });
  
  // Start render loop
  renderer.start((r, time) => {
    if (!ui) return;
    
    // Clear previous frame
    r.clearQuads();
    r.clearText();
    
    // Render UI and get output
    const output = ui.render();
    
    // Send quads to renderer
    for (const quad of output.quads) {
      r.addQuad({
        x: quad.x,
        y: quad.y,
        width: quad.width,
        height: quad.height,
        color: quad.color,
        cornerRadius: quad.cornerRadius ?? 0,
      });
    }
    
    // Send text to renderer
    for (const text of output.texts) {
      r.drawText(text.text, text.x, text.y, text.fontSize, text.color);
    }
    
    // Update FPS display
    if (fontLoaded) {
      const fpsText = ui.find('fps-text') as Text | undefined;
      if (fpsText) {
        fpsText.setText(`FPS: ${r.getFPS()}`);
      }
    }
    
    // Update stats
    quadsEl.textContent = output.quads.length.toString();
  });
  
  console.log('Render loop started!');
  console.log('');
  console.log('🎮 Component System Features:');
  console.log('   • Click toolbar buttons - logs to console');
  console.log('   • Click nav buttons - logs to console');
  console.log('   • Hover cards - visual feedback');
  console.log('   • Drag cards - move them around');
  console.log('   • Add random boxes with button');
}

// Start!
main().catch(console.error);
