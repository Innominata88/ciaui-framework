// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component System - Public API
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  Color,
  ComponentState,
  InteractionState,
  PositionType,
  LayoutProps,
  ComputedBounds,
  BackgroundStyle,
  BorderStyle,
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
  UIManager as IUIManager,
} from './types';

export {
  generateComponentId,
  parsePadding,
  applyOpacity,
  lightenColor,
  darkenColor,
} from './types';

// Layout types and utilities
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
  ChildInfo,
} from './layout';

export {
  DEFAULT_LAYOUT_CONFIG,
  tightConstraints,
  looseConstraints,
  unboundedConstraints,
  computeStackLayout,
  parseSize,
} from './layout';

// Base classes
export { Component as BaseComponent } from './Component';
export { Container, RootContainer } from './Container';
export type { ContainerComponentProps } from './Container';

// Primitives
export { 
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
} from './primitives';

export type { 
  BoxProps, 
  TextProps, 
  ButtonProps, 
  PanelProps, 
  CardProps,
  StackProps,
  SpacerProps,
} from './primitives';

// UI Manager
export { UIManager, createUIManager } from './UIManager';
export type { UIManagerOptions } from './UIManager';
