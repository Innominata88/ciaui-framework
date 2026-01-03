// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Input System - Public API
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  PointerSource,
  ButtonState,
  PointerState,
  InputEvent,
  PointerEvent,
  ClickEvent,
  DragEvent,
  KeyboardEvent,
  ScrollEvent,
  AnyInputEvent,
  Rect,
  HitRegion,
  HitTestResult,
  CursorType,
  EventHandler,
  RegionEventHandlers,
  InteractiveRegion,
} from './types';

export {
  createPointerState,
  createBaseEvent,
} from './types';

// Hit Tester
export { HitTester, createHitTester, pointInRect, rectsOverlap, expandRect } from './HitTester';

// Input Manager
export { InputManager, createInputManager } from './InputManager';
export type { InputManagerOptions } from './InputManager';
