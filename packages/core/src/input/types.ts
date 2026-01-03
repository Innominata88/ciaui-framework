// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Input System - Types
// 
// Core types for the input/event system. Designed to support:
// - Mouse input (desktop)
// - Touch input (mobile)
// - VR controller input (ray casting)
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Pointer Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Pointer source type
 */
export type PointerSource = 'mouse' | 'touch' | 'pen' | 'vr-left' | 'vr-right';

/**
 * Button state
 */
export type ButtonState = 'up' | 'down';

/**
 * Pointer state at a moment in time
 */
export interface PointerState {
  /** Unique identifier for this pointer (0 for mouse, touch ID, etc.) */
  id: number;
  
  /** Source type */
  source: PointerSource;
  
  /** Position in screen pixels */
  x: number;
  y: number;
  
  /** Previous position (for delta calculation) */
  prevX: number;
  prevY: number;
  
  /** Button states */
  buttons: {
    primary: ButtonState;    // Left mouse, trigger
    secondary: ButtonState;  // Right mouse, grip
    auxiliary: ButtonState;  // Middle mouse, menu
  };
  
  /** Pressure (0-1, for touch/pen/trigger) */
  pressure: number;
  
  /** Is this pointer currently active/tracking */
  active: boolean;
  
  /** Timestamp of last update */
  timestamp: number;
}

/**
 * Create default pointer state
 */
export function createPointerState(
  id: number = 0,
  source: PointerSource = 'mouse'
): PointerState {
  return {
    id,
    source,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    buttons: {
      primary: 'up',
      secondary: 'up',
      auxiliary: 'up',
    },
    pressure: 0,
    active: false,
    timestamp: 0,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Event Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Base event interface
 */
export interface InputEvent {
  /** Event type */
  type: string;
  
  /** Target element ID (if any) */
  targetId: string | null;
  
  /** Timestamp */
  timestamp: number;
  
  /** Has this event been consumed? */
  consumed: boolean;
  
  /** Prevent further handling */
  consume(): void;
}

/**
 * Pointer event (mouse, touch, VR controller)
 */
export interface PointerEvent extends InputEvent {
  type: 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerenter' | 'pointerleave';
  
  /** Pointer state */
  pointer: PointerState;
  
  /** Which button triggered this event (for down/up) */
  button: 'primary' | 'secondary' | 'auxiliary' | null;
  
  /** Movement delta since last event */
  deltaX: number;
  deltaY: number;
}

/**
 * Click event (synthesized from pointer down + up)
 */
export interface ClickEvent extends InputEvent {
  type: 'click' | 'dblclick' | 'contextmenu';
  
  /** Pointer that generated the click */
  pointer: PointerState;
  
  /** Click position */
  x: number;
  y: number;
}

/**
 * Drag event
 */
export interface DragEvent extends InputEvent {
  type: 'dragstart' | 'drag' | 'dragend';
  
  /** Pointer doing the dragging */
  pointer: PointerState;
  
  /** Current position */
  x: number;
  y: number;
  
  /** Start position */
  startX: number;
  startY: number;
  
  /** Total delta from start */
  totalDeltaX: number;
  totalDeltaY: number;
}

/**
 * Keyboard event
 */
export interface KeyboardEvent extends InputEvent {
  type: 'keydown' | 'keyup' | 'keypress';
  
  /** Key code */
  key: string;
  code: string;
  
  /** Modifier states */
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  
  /** Is this a repeat event */
  repeat: boolean;
}

/**
 * Scroll/wheel event
 */
export interface ScrollEvent extends InputEvent {
  type: 'scroll' | 'wheel';
  
  /** Scroll deltas */
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  
  /** Scroll mode */
  mode: 'pixel' | 'line' | 'page';
  
  /** Position where scroll occurred */
  x: number;
  y: number;
}

/**
 * Union of all event types
 */
export type AnyInputEvent = 
  | PointerEvent 
  | ClickEvent 
  | DragEvent 
  | KeyboardEvent 
  | ScrollEvent;

/**
 * Create base event
 */
export function createBaseEvent(type: string, targetId: string | null = null): InputEvent {
  return {
    type,
    targetId,
    timestamp: performance.now(),
    consumed: false,
    consume() {
      this.consumed = true;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Hit Test Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Rectangle bounds
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Hit region - an area that can receive input
 */
export interface HitRegion {
  /** Unique identifier */
  id: string;
  
  /** Bounding rectangle (screen coordinates) */
  bounds: Rect;
  
  /** Z-index for ordering (higher = on top) */
  zIndex: number;
  
  /** Is this region currently interactive */
  enabled: boolean;
  
  /** Cursor to show when hovering */
  cursor: CursorType;
  
  /** Optional: Custom hit test function for non-rectangular shapes */
  hitTest?: (x: number, y: number) => boolean;
  
  /** User data attached to this region */
  data?: unknown;
}

/**
 * Result of a hit test
 */
export interface HitTestResult {
  /** Did we hit anything? */
  hit: boolean;
  
  /** Region that was hit (if any) */
  region: InteractiveRegion | null;
  
  /** All regions hit, sorted by z-index (highest first) */
  allHits: InteractiveRegion[];
  
  /** Position tested */
  x: number;
  y: number;
}

/**
 * Cursor types
 */
export type CursorType = 
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'move'
  | 'crosshair'
  | 'not-allowed'
  | 'wait'
  | 'help'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'col-resize'
  | 'row-resize'
  | 'none';

// ───────────────────────────────────────────────────────────────────────────
// Event Handler Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Event handler function
 */
export type EventHandler<E extends InputEvent = AnyInputEvent> = (event: E) => void;

/**
 * Event handlers that can be attached to a hit region
 */
export interface RegionEventHandlers {
  onPointerEnter?: EventHandler<PointerEvent>;
  onPointerLeave?: EventHandler<PointerEvent>;
  onPointerMove?: EventHandler<PointerEvent>;
  onPointerDown?: EventHandler<PointerEvent>;
  onPointerUp?: EventHandler<PointerEvent>;
  onClick?: EventHandler<ClickEvent>;
  onDoubleClick?: EventHandler<ClickEvent>;
  onContextMenu?: EventHandler<ClickEvent>;
  onDragStart?: EventHandler<DragEvent>;
  onDrag?: EventHandler<DragEvent>;
  onDragEnd?: EventHandler<DragEvent>;
  onScroll?: EventHandler<ScrollEvent>;
}

/**
 * Interactive region with handlers
 */
export interface InteractiveRegion extends HitRegion {
  handlers: RegionEventHandlers;
}
