// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/core - Public API
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  Mode,
  Color,
  Vec3,
  Quaternion,
  SpacingValue,
  PropType,
  PropDefinition,
  InferProps,
  DesktopNode,
  ImmersiveNode,
  AdaptiveNode,
  PointerSource,
  PointerState,
  PointerEvent,
  DragEvent,
  TokenScale,
  ModeToken,
  ResolvedTokens,
  RenderContext,
  SlotHelper,
  AdaptiveComponentDefinition,
  AdaptiveComponent,
  XRCapabilities,
  EffectCallback,
  EffectOptions,
  ComputedOptions,
} from './types';

// Reactive system (hooks)
export {
  useState,
  useEffect,
  useComputed,
  useRef,
  batch,
  untrack,
} from './reactive';

// Adaptive component system
export {
  adaptive,
  getMode,
  setMode,
  onModeChange,
  useMode,
  useTokens,
  setTokens,
  getTokens,
} from './adaptive';

// ───────────────────────────────────────────────────────────────────────────
// Version
// ───────────────────────────────────────────────────────────────────────────

export const VERSION = '0.0.1';
