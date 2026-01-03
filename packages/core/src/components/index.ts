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

// Base classes
export { Component as BaseComponent } from './Component';
export { Container, RootContainer } from './Container';
export type { ContainerComponentProps } from './Container';

// Primitives
export { Box, Text, Button, Panel, Card } from './primitives';
export type { BoxProps, TextProps, ButtonProps, PanelProps, CardProps } from './primitives';

// UI Manager
export { UIManager, createUIManager } from './UIManager';
export type { UIManagerOptions } from './UIManager';
