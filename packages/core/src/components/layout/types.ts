// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Layout System - Types
// 
// Types for the flexbox-inspired layout system.
// Handles automatic positioning of children in containers.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Layout Direction
// ───────────────────────────────────────────────────────────────────────────

/**
 * Layout direction for children
 */
export type LayoutDirection = 'row' | 'column';

/**
 * Main axis alignment (along the layout direction)
 */
export type JustifyContent = 
  | 'start'      // Pack at start
  | 'center'     // Pack at center
  | 'end'        // Pack at end
  | 'between'    // Distribute with space between
  | 'around'     // Distribute with space around
  | 'evenly';    // Distribute with equal space

/**
 * Cross axis alignment (perpendicular to layout direction)
 */
export type AlignItems = 
  | 'start'      // Align to start of cross axis
  | 'center'     // Center on cross axis
  | 'end'        // Align to end of cross axis
  | 'stretch';   // Stretch to fill cross axis

/**
 * Individual item alignment (overrides parent's alignItems)
 */
export type AlignSelf = AlignItems | 'auto';

// ───────────────────────────────────────────────────────────────────────────
// Size Types
// ───────────────────────────────────────────────────────────────────────────

/**
 * Size can be:
 * - number: Fixed pixels
 * - 'auto': Size to content
 * - 'fill': Fill available space (like flex: 1)
 * - `${number}%`: Percentage of parent
 */
export type Size = number | 'auto' | 'fill' | `${number}%`;

/**
 * Flex grow/shrink behavior
 */
export interface FlexProps {
  /** Flex grow factor (0 = don't grow, 1+ = grow proportionally) */
  grow?: number;
  /** Flex shrink factor (0 = don't shrink, 1+ = shrink proportionally) */
  shrink?: number;
  /** Base size before growing/shrinking */
  basis?: number | 'auto';
}

// ───────────────────────────────────────────────────────────────────────────
// Layout Props
// ───────────────────────────────────────────────────────────────────────────

/**
 * Layout configuration for a container
 */
export interface LayoutConfig {
  /** Layout direction */
  direction: LayoutDirection;
  /** Gap between children (pixels) */
  gap: number;
  /** Main axis alignment */
  justify: JustifyContent;
  /** Cross axis alignment */
  align: AlignItems;
  /** Wrap children to next line */
  wrap: boolean;
  /** Reverse order of children */
  reverse: boolean;
}

/**
 * Props that affect how a child is laid out
 */
export interface ChildLayoutProps {
  /** Override parent's align for this child */
  alignSelf?: AlignSelf;
  /** Flex grow */
  flexGrow?: number;
  /** Flex shrink */
  flexShrink?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum height */
  maxHeight?: number;
}

/**
 * Default layout config
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'column',
  gap: 0,
  justify: 'start',
  align: 'stretch',
  wrap: false,
  reverse: false,
};

// ───────────────────────────────────────────────────────────────────────────
// Layout Constraints
// ───────────────────────────────────────────────────────────────────────────

/**
 * Constraints passed to a component during layout
 */
export interface LayoutConstraints {
  /** Minimum width */
  minWidth: number;
  /** Maximum width */
  maxWidth: number;
  /** Minimum height */
  minHeight: number;
  /** Maximum height */
  maxHeight: number;
}

/**
 * Measured size of a component
 */
export interface MeasuredSize {
  width: number;
  height: number;
}

/**
 * Create tight constraints (exact size)
 */
export function tightConstraints(width: number, height: number): LayoutConstraints {
  return {
    minWidth: width,
    maxWidth: width,
    minHeight: height,
    maxHeight: height,
  };
}

/**
 * Create loose constraints (0 to max)
 */
export function looseConstraints(maxWidth: number, maxHeight: number): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: maxWidth,
    minHeight: 0,
    maxHeight: maxHeight,
  };
}

/**
 * Create unbounded constraints
 */
export function unboundedConstraints(): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: Infinity,
    minHeight: 0,
    maxHeight: Infinity,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Layout Result
// ───────────────────────────────────────────────────────────────────────────

/**
 * Computed position and size for a child
 */
export interface ChildLayout {
  /** X position relative to parent content area */
  x: number;
  /** Y position relative to parent content area */
  y: number;
  /** Computed width */
  width: number;
  /** Computed height */
  height: number;
}

/**
 * Result of laying out children
 */
export interface LayoutResult {
  /** Layout for each child (by index) */
  children: ChildLayout[];
  /** Total content size */
  contentWidth: number;
  contentHeight: number;
}
