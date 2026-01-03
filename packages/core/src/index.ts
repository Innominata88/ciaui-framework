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

// Input system
export {
  InputManager,
  createInputManager,
  HitTester,
  createHitTester,
  pointInRect,
  rectsOverlap,
  expandRect,
  createPointerState,
  createBaseEvent,
} from './input';

export type {
  InputManagerOptions,
  Rect,
  HitRegion,
  HitTestResult,
  CursorType,
  EventHandler,
  RegionEventHandlers,
  InteractiveRegion,
  InputEvent,
  ClickEvent,
  ScrollEvent,
  KeyboardEvent as InputKeyboardEvent,
  AnyInputEvent,
  // Re-export with 'Input' prefix to avoid conflict with existing types
  PointerState as InputPointerState,
  PointerEvent as InputPointerEvent,
  DragEvent as InputDragEvent,
} from './input';

// Component system
export {
  // Base classes
  BaseComponent,
  Container,
  RootContainer,
  // Primitives
  Box,
  Text,
  Button,
  Panel,
  Card,
  Stack,
  Row,
  Column,
  Spacer,
  fixedSpacer,
  flexSpacer,
  // UI Manager
  UIManager,
  createUIManager,
  // Utilities
  generateComponentId,
  parsePadding,
  applyOpacity,
  lightenColor,
  darkenColor,
  // Layout utilities
  DEFAULT_LAYOUT_CONFIG,
  computeStackLayout,
  parseSize,
} from './components';

export type {
  // Types
  Color as ComponentColor,
  ComponentState,
  InteractionState,
  LayoutProps,
  ComputedBounds,
  BackgroundStyle,
  TextStyle,
  Padding,
  BaseComponentProps,
  InteractiveProps,
  ContainerProps,
  QuadData,
  TextData,
  RenderOutput,
  HitRegionData,
  Component,
  ContainerComponent,
  IUIManager,
  // Props types
  ContainerComponentProps,
  BoxProps,
  TextProps,
  ButtonProps,
  PanelProps,
  CardProps,
  StackProps,
  SpacerProps,
  UIManagerOptions,
  // Layout types
  LayoutDirection,
  JustifyContent,
  AlignItems,
  AlignSelf,
  LayoutConfig,
  ChildLayoutProps,
  ChildLayout,
  LayoutResult,
} from './components';

// ───────────────────────────────────────────────────────────────────────────
// Version
// ───────────────────────────────────────────────────────────────────────────

export const VERSION = '0.0.1';
