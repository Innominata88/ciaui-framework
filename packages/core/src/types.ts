// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/core - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendering mode - desktop (2D DOM) or immersive (3D spatial)
 */
export type Mode = 'desktop' | 'immersive';

/**
 * Color can be hex string, rgb object, or named color
 */
export type Color = string | { r: number; g: number; b: number; a?: number };

/**
 * 3D vector
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion for rotations
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Spacing values using token scale
 */
export type SpacingValue = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

// ───────────────────────────────────────────────────────────────────────────
// Prop Type Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Helper for defining prop types in adaptive components
 */
export type PropType<T> = { __propType: T };

/**
 * Prop definition object
 */
export type PropDefinition = Record<string, unknown>;

/**
 * Infer actual prop types from definition
 */
export type InferProps<P extends PropDefinition> = {
  [K in keyof P]: P[K] extends PropType<infer T> 
    ? T 
    : P[K] extends StringConstructor 
      ? string 
      : P[K] extends NumberConstructor 
        ? number 
        : P[K] extends BooleanConstructor 
          ? boolean 
          : P[K] extends ArrayConstructor
            ? unknown[]
            : unknown;
};

// ───────────────────────────────────────────────────────────────────────────
// Node Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Virtual node for desktop rendering
 */
export interface DesktopNode {
  type: string | Function;
  props: Record<string, unknown>;
  children: DesktopNode[];
}

/**
 * Virtual node for immersive rendering
 */
export interface ImmersiveNode {
  type: string;
  props: Record<string, unknown>;
  children: ImmersiveNode[];
}

/**
 * Union type for any node
 */
export type AdaptiveNode = DesktopNode | ImmersiveNode;

// ───────────────────────────────────────────────────────────────────────────
// Pointer/Input Types
// ───────────────────────────────────────────────────────────────────────────

export type PointerSource = 
  | 'mouse' 
  | 'touch' 
  | 'controller-left' 
  | 'controller-right' 
  | 'gaze' 
  | 'hand-left' 
  | 'hand-right';

export interface PointerState {
  id: string;
  source: PointerSource;
  position: { x: number; y: number };
  ray?: { origin: Vec3; direction: Vec3 };
  pressure?: number;
}

export interface PointerEvent {
  pointer: PointerState;
  target: unknown;
  timestamp: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface DragEvent extends PointerEvent {
  delta: Vec3;
  totalDelta: Vec3;
  velocity: Vec3;
}

// ───────────────────────────────────────────────────────────────────────────
// Token Types
// ───────────────────────────────────────────────────────────────────────────

export interface TokenScale<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

export interface ModeToken<T> {
  desktop: T;
  immersive: T;
}

export interface ResolvedTokens {
  // Sizing
  buttonHeight: TokenScale<number>;
  iconSize: TokenScale<number>;
  fontSize: TokenScale<number>;
  spacing: TokenScale<number>;
  radius: TokenScale<number>;
  
  // Stroke
  iconStrokeWidth: number;
  
  // Colors
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    hover: string;
    active: string;
    error: string;
    success: string;
  };
  
  // Immersive-specific
  minTouchTarget?: number;
  
  // Allow extension
  [key: string]: unknown;
}

// ───────────────────────────────────────────────────────────────────────────
// Component Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Render context passed to desktop/immersive render functions
 */
export interface RenderContext<P, S> {
  props: P;
  state: S;
  tokens: ResolvedTokens;
  mode: Mode;
  children: AdaptiveNode[];
}

/**
 * Slot helper for named children
 */
export interface SlotHelper {
  has: (name: string) => boolean;
  get: (name: string) => AdaptiveNode[];
  default: () => AdaptiveNode[];
}

/**
 * Definition for an adaptive component
 */
export interface AdaptiveComponentDefinition<P extends PropDefinition, S extends object> {
  /** Component name for debugging */
  name: string;
  
  /** Prop type definitions */
  props: P;
  
  /** Default prop values */
  defaults?: Partial<InferProps<P>>;
  
  /** Setup function - returns state object */
  setup?: (props: InferProps<P>) => S;
  
  /** Desktop render function */
  desktop: (ctx: RenderContext<InferProps<P>, S>) => DesktopNode;
  
  /** Immersive render function */
  immersive: (ctx: RenderContext<InferProps<P>, S>) => ImmersiveNode;
  
  /** Called when mode switches */
  onModeSwitch?: (from: Mode, to: Mode, state: S) => void;
}

/**
 * An adaptive component (the result of adaptive())
 */
export interface AdaptiveComponent<P = unknown> {
  (props: P): AdaptiveNode;
  displayName: string;
  __adaptive: true;
}

// ───────────────────────────────────────────────────────────────────────────
// XR Types
// ───────────────────────────────────────────────────────────────────────────

export interface XRCapabilities {
  vr: boolean;
  ar: boolean;
  handTracking: boolean;
  eyeTracking: boolean;
  passthrough: boolean;
  depthSensing: boolean;
  planeDetection: boolean;
  device: 'quest2' | 'quest3' | 'questPro' | 'visionPro' | 'pico' | 'unknown' | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Effect Types
// ───────────────────────────────────────────────────────────────────────────

export type EffectCleanup = () => void;
export type EffectCallback = () => void | EffectCleanup | Promise<void>;

export interface EffectOptions {
  /** Explicit dependencies to track */
  track?: unknown[];
  /** Values to read but NOT track */
  untrack?: unknown[];
  /** Condition for effect to run */
  when?: boolean;
  /** Disable auto-tracking */
  manual?: boolean;
  /** Run on interval (ms) */
  interval?: number;
  /** Debounce execution (ms) */
  debounce?: number;
  /** Throttle execution (ms) */
  throttle?: number;
}

export interface ComputedOptions {
  track?: unknown[];
  untrack?: unknown[];
  equals?: <T>(prev: T, next: T) => boolean;
}
