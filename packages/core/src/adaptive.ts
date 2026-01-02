// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/core - Adaptive Component System
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Mode,
  PropDefinition,
  InferProps,
  AdaptiveComponentDefinition,
  AdaptiveComponent,
  RenderContext,
  AdaptiveNode,
  ResolvedTokens,
  ModeToken,
} from './types';

import {
  pushComponentContext,
  popComponentContext,
  resetContextIndices,
  cleanupComponentContext,
} from './reactive';

// ───────────────────────────────────────────────────────────────────────────
// Global Mode State
// ───────────────────────────────────────────────────────────────────────────

let currentMode: Mode = 'desktop';
const modeListeners = new Set<(mode: Mode) => void>();

export function getMode(): Mode {
  return currentMode;
}

export function setMode(mode: Mode): void {
  if (mode !== currentMode) {
    const prevMode = currentMode;
    currentMode = mode;
    modeListeners.forEach(listener => listener(mode));
    console.log(`[CIAUI] Mode changed: ${prevMode} → ${mode}`);
  }
}

export function onModeChange(callback: (mode: Mode) => void): () => void {
  modeListeners.add(callback);
  return () => modeListeners.delete(callback);
}

// ───────────────────────────────────────────────────────────────────────────
// Token System
// ───────────────────────────────────────────────────────────────────────────

/**
 * Default tokens - can be extended/overridden
 */
const defaultTokens = {
  desktop: {
    buttonHeight: { sm: 28, md: 32, lg: 40 },
    iconSize: { sm: 14, md: 16, lg: 20 },
    fontSize: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 4, md: 6, lg: 8, xl: 12 },
    iconStrokeWidth: 2,
    colors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      background: '#0a0a0f',
      surface: '#12121a',
      text: '#f0f0f5',
      textMuted: '#a0a0b0',
      border: 'rgba(255,255,255,0.1)',
      hover: 'rgba(255,255,255,0.08)',
      active: 'rgba(255,255,255,0.12)',
      error: '#f87171',
      success: '#4ade80',
    },
  },
  immersive: {
    buttonHeight: { sm: 44, md: 56, lg: 72 },
    iconSize: { sm: 18, md: 22, lg: 28 },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22 },
    spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    radius: { sm: 8, md: 10, lg: 14, xl: 18 },
    iconStrokeWidth: 1.5,
    minTouchTarget: 44,
    colors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      background: '#000000',  // True black for VR
      surface: '#0a0a10',
      text: '#f0f0f5',
      textMuted: '#a0a0b0',
      border: 'rgba(255,255,255,0.1)',
      hover: 'rgba(255,255,255,0.12)',
      active: 'rgba(255,255,255,0.16)',
      error: '#f87171',
      success: '#4ade80',
    },
  },
};

let customTokens: typeof defaultTokens | null = null;

/**
 * Set custom tokens (merged with defaults)
 */
export function setTokens(tokens: Partial<typeof defaultTokens>): void {
  customTokens = {
    desktop: { ...defaultTokens.desktop, ...tokens.desktop },
    immersive: { ...defaultTokens.immersive, ...tokens.immersive },
  };
}

/**
 * Get resolved tokens for current mode
 */
export function getTokens(): ResolvedTokens {
  const tokens = customTokens ?? defaultTokens;
  const modeTokens = tokens[currentMode];
  return modeTokens as ResolvedTokens;
}

// ───────────────────────────────────────────────────────────────────────────
// Adaptive Component Factory
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create an adaptive component that renders in both desktop and immersive modes.
 * 
 * @example
 * const Button = adaptive({
 *   name: 'Button',
 *   props: { label: String, onClick: Function },
 *   setup(props) {
 *     const [hovered, setHovered] = useState(false);
 *     return { hovered, setHovered };
 *   },
 *   desktop(ctx) { ... },
 *   immersive(ctx) { ... },
 * });
 */
export function adaptive<P extends PropDefinition, S extends object = {}>(
  definition: AdaptiveComponentDefinition<P, S>
): AdaptiveComponent<InferProps<P>> {
  const { name, props: propDef, defaults, setup, desktop, immersive, onModeSwitch } = definition;
  
  // Validate definition
  if (!name) {
    throw new Error('Adaptive components must have a name');
  }
  if (!desktop || !immersive) {
    throw new Error(`Adaptive component "${name}" must define both desktop() and immersive() render functions`);
  }
  
  // Component instance storage (for state persistence across mode switches)
  const instances = new WeakMap<object, {
    context: ReturnType<typeof pushComponentContext>;
    state: S;
    prevMode: Mode;
  }>();
  
  // The component function
  const component = function AdaptiveComponent(props: InferProps<P>): AdaptiveNode {
    // Merge with defaults
    const resolvedProps = { ...defaults, ...props } as InferProps<P>;
    
    // Get or create component instance
    // Using props object as key (will be same object for same render)
    let instance = instances.get(props as object);
    
    if (!instance) {
      // First render - create context and run setup
      const context = pushComponentContext();
      let state = {} as S;
      
      if (setup) {
        state = setup(resolvedProps);
      }
      
      instance = {
        context,
        state,
        prevMode: currentMode,
      };
      
      instances.set(props as object, instance);
      popComponentContext();
    } else {
      // Subsequent render - check for mode switch
      if (instance.prevMode !== currentMode && onModeSwitch) {
        onModeSwitch(instance.prevMode, currentMode, instance.state);
      }
      instance.prevMode = currentMode;
    }
    
    // Reset hook indices for this render
    resetContextIndices();
    
    // Build render context
    const ctx: RenderContext<InferProps<P>, S> = {
      props: resolvedProps,
      state: instance.state,
      tokens: getTokens(),
      mode: currentMode,
      children: [], // TODO: Handle children properly
    };
    
    // Call appropriate render function
    if (currentMode === 'desktop') {
      return desktop(ctx);
    } else {
      return immersive(ctx);
    }
  };
  
  // Mark as adaptive component
  (component as AdaptiveComponent<InferProps<P>>).__adaptive = true;
  (component as AdaptiveComponent<InferProps<P>>).displayName = name;
  
  return component as AdaptiveComponent<InferProps<P>>;
}

// ───────────────────────────────────────────────────────────────────────────
// Mode Hook
// ───────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from './reactive';

/**
 * Hook to access and control mode
 */
export function useMode() {
  const [mode, setModeState] = useState<Mode>(currentMode);
  
  useEffect(() => {
    return onModeChange((newMode) => {
      setModeState(newMode);
    });
  });
  
  return {
    mode,
    isImmersive: mode === 'immersive',
    isDesktop: mode === 'desktop',
    requestImmersive: async () => {
      // Will be implemented when we add XR support
      setMode('immersive');
    },
    exitImmersive: () => {
      setMode('desktop');
    },
  };
}

/**
 * Hook to access tokens
 */
export function useTokens(): ResolvedTokens {
  // Re-render when mode changes (tokens change)
  useMode();
  return getTokens();
}
