// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component System - Types
// 
// Core types for the component system. Components are the building blocks
// of the UI - they encapsulate rendering, hit testing, and behavior.
// ═══════════════════════════════════════════════════════════════════════════

import type { Rect, CursorType, RegionEventHandlers } from '../input/types';

// ───────────────────────────────────────────────────────────────────────────
// Base Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * RGBA color as array
 */
export type Color = [number, number, number, number];

/**
 * Component lifecycle state
 */
export type ComponentState = 'created' | 'mounted' | 'unmounted';

/**
 * Interaction state for interactive components
 */
export interface InteractionState {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
  disabled: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Layout Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Position can be absolute or relative to parent
 */
export type PositionType = 'absolute' | 'relative';

/**
 * Base layout props shared by all components
 */
export interface LayoutProps {
  /** X position (relative to parent if in a container) */
  x?: number;
  /** Y position (relative to parent if in a container) */
  y?: number;
  /** Width (required for most components) */
  width?: number;
  /** Height (required for most components) */
  height?: number;
  /** Z-index for layering */
  zIndex?: number;
  /** Visibility */
  visible?: boolean;
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Computed bounds after layout
 */
export interface ComputedBounds {
  /** Absolute X in canvas coordinates */
  x: number;
  /** Absolute Y in canvas coordinates */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Style Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Background style
 */
export interface BackgroundStyle {
  color?: Color;
  cornerRadius?: number;
}

/**
 * Border style
 */
export interface BorderStyle {
  color?: Color;
  width?: number;
  radius?: number;
}

/**
 * Text style
 */
export interface TextStyle {
  color?: Color;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * Padding (can be single value or per-side)
 */
export type Padding = number | {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

// ───────────────────────────────────────────────────────────────────────────
// Component Props
// ───────────────────────────────────────────────────────────────────────────

/**
 * Base props for all components
 */
export interface BaseComponentProps extends LayoutProps {
  /** Unique ID (auto-generated if not provided) */
  id?: string;
  /** Debug name for logging */
  name?: string;
}

/**
 * Props for interactive components
 */
export interface InteractiveProps {
  /** Is this component interactive */
  interactive?: boolean;
  /** Is this component disabled */
  disabled?: boolean;
  /** Cursor when hovering */
  cursor?: CursorType;
  /** Event handlers */
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onDragStart?: (x: number, y: number) => void;
  onDrag?: (x: number, y: number, dx: number, dy: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

/**
 * Props for container components
 */
export interface ContainerProps {
  /** Child components */
  children?: Component[];
  /** Padding inside the container */
  padding?: Padding;
  /** Gap between children (for auto-layout) */
  gap?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Render Context
// ───────────────────────────────────────────────────────────────────────────

/**
 * Quad data for rendering
 */
export interface QuadData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
  cornerRadius?: number;
}

/**
 * Text data for rendering
 */
export interface TextData {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: Color;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Render output from a component
 */
export interface RenderOutput {
  quads: QuadData[];
  texts: TextData[];
  hitRegions: HitRegionData[];
}

/**
 * Hit region data for input
 */
export interface HitRegionData {
  id: string;
  bounds: Rect;
  cursor: CursorType;
  zIndex: number;
  handlers: RegionEventHandlers;
  data?: unknown;
}

// ───────────────────────────────────────────────────────────────────────────
// Component Interface
// ───────────────────────────────────────────────────────────────────────────

/**
 * Base component interface
 */
export interface Component {
  /** Unique identifier */
  readonly id: string;
  
  /** Component type name */
  readonly type: string;
  
  /** Current lifecycle state */
  readonly state: ComponentState;
  
  /** Parent component (if any) */
  parent: Component | null;
  
  /** Computed absolute bounds */
  readonly bounds: ComputedBounds;
  
  /** Is this component visible */
  readonly visible: boolean;
  
  /**
   * Update component props
   */
  setProps(props: Partial<BaseComponentProps>): void;
  
  /**
   * Get current props
   */
  getProps(): BaseComponentProps;
  
  /**
   * Compute layout (called by parent or UI manager)
   */
  layout(parentBounds: ComputedBounds): void;
  
  /**
   * Render the component
   */
  render(): RenderOutput;
  
  /**
   * Mount the component (called when added to UI)
   */
  mount(): void;
  
  /**
   * Unmount the component (called when removed from UI)
   */
  unmount(): void;
  
  /**
   * Mark component as needing re-render
   */
  markDirty(): void;
  
  /**
   * Check if component needs re-render
   */
  isDirty(): boolean;
}

/**
 * Container component interface (can have children)
 */
export interface ContainerComponent extends Component {
  /** Child components */
  readonly children: ReadonlyArray<Component>;
  
  /** Add a child component */
  addChild(child: Component): void;
  
  /** Remove a child component */
  removeChild(child: Component): void;
  
  /** Remove all children */
  clearChildren(): void;
  
  /** Find child by ID */
  findChild(id: string): Component | undefined;
  
  /** Find child recursively */
  findChildDeep(id: string): Component | undefined;
}

// ───────────────────────────────────────────────────────────────────────────
// UI Manager Interface
// ───────────────────────────────────────────────────────────────────────────

/**
 * UI Manager - coordinates components, rendering, and input
 */
export interface UIManager {
  /** Root component */
  readonly root: ContainerComponent;
  
  /** Add component to root */
  add(component: Component): void;
  
  /** Remove component from root */
  remove(component: Component): void;
  
  /** Find component by ID */
  find(id: string): Component | undefined;
  
  /** Update layout for all components */
  layout(): void;
  
  /** Render all components */
  render(): RenderOutput;
  
  /** Set canvas size */
  setSize(width: number, height: number): void;
}

// ───────────────────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Generate unique component ID
 */
let _componentIdCounter = 0;
export function generateComponentId(prefix: string = 'cmp'): string {
  return `${prefix}-${++_componentIdCounter}`;
}

/**
 * Parse padding value
 */
export function parsePadding(padding: Padding | undefined): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (padding === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

/**
 * Merge colors with opacity
 */
export function applyOpacity(color: Color, opacity: number): Color {
  return [color[0], color[1], color[2], color[3] * opacity];
}

/**
 * Lighten a color (for hover effects)
 */
export function lightenColor(color: Color, amount: number = 0.15): Color {
  return [
    Math.min(1, color[0] + amount),
    Math.min(1, color[1] + amount),
    Math.min(1, color[2] + amount),
    color[3],
  ];
}

/**
 * Darken a color (for pressed effects)
 */
export function darkenColor(color: Color, amount: number = 0.1): Color {
  return [
    Math.max(0, color[0] - amount),
    Math.max(0, color[1] - amount),
    Math.max(0, color[2] - amount),
    color[3],
  ];
}
