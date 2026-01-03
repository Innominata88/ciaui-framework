// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Layout System - Public API
// ═══════════════════════════════════════════════════════════════════════════

export type {
  LayoutDirection,
  JustifyContent,
  AlignItems,
  AlignSelf,
  Size,
  FlexProps,
  LayoutConfig,
  ChildLayoutProps,
  LayoutConstraints,
  MeasuredSize,
  ChildLayout,
  LayoutResult,
} from './types';

export {
  DEFAULT_LAYOUT_CONFIG,
  tightConstraints,
  looseConstraints,
  unboundedConstraints,
} from './types';

export {
  computeStackLayout,
  parseSize,
} from './StackLayout';

export type { ChildInfo } from './StackLayout';
