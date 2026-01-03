// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Layout System - Stack Layout Engine
// 
// Computes positions for children arranged in a row or column.
// Inspired by CSS Flexbox but simplified for our use case.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  LayoutConfig,
  LayoutResult,
  ChildLayout,
  ChildLayoutProps,
  MeasuredSize,
} from './types';

// ───────────────────────────────────────────────────────────────────────────
// Child Info
// ───────────────────────────────────────────────────────────────────────────

/**
 * Information about a child needed for layout
 */
export interface ChildInfo {
  /** Requested width (from props) */
  width?: number;
  /** Requested height (from props) */
  height?: number;
  /** Layout-specific props */
  layoutProps?: ChildLayoutProps;
  /** Is this child visible? */
  visible: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Stack Layout
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compute layout for children in a stack (row or column)
 */
export function computeStackLayout(
  config: LayoutConfig,
  containerWidth: number,
  containerHeight: number,
  children: ChildInfo[]
): LayoutResult {
  const { direction, gap, justify, align, reverse } = config;
  const isRow = direction === 'row';
  
  // Filter to visible children
  const visibleChildren = children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => child.visible);
  
  if (visibleChildren.length === 0) {
    return {
      children: children.map(() => ({ x: 0, y: 0, width: 0, height: 0 })),
      contentWidth: 0,
      contentHeight: 0,
    };
  }
  
  // Reverse if needed
  if (reverse) {
    visibleChildren.reverse();
  }
  
  // Main axis = direction of layout (width for row, height for column)
  // Cross axis = perpendicular (height for row, width for column)
  const mainAxisSize = isRow ? containerWidth : containerHeight;
  const crossAxisSize = isRow ? containerHeight : containerWidth;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: Measure children and compute flex
  // ─────────────────────────────────────────────────────────────────────────
  
  interface MeasuredChild {
    index: number;
    child: ChildInfo;
    mainSize: number;      // Size along main axis
    crossSize: number;     // Size along cross axis
    flexGrow: number;
    flexShrink: number;
    minMain: number;
    maxMain: number;
  }
  
  const measured: MeasuredChild[] = visibleChildren.map(({ child, index }) => {
    const props = child.layoutProps ?? {};
    
    // Get requested sizes
    const requestedWidth = child.width ?? 0;
    const requestedHeight = child.height ?? 0;
    
    // Main and cross sizes
    const mainSize = isRow ? requestedWidth : requestedHeight;
    const crossSize = isRow ? requestedHeight : requestedWidth;
    
    // Flex properties
    const flexGrow = props.flexGrow ?? 0;
    const flexShrink = props.flexShrink ?? 1;
    
    // Min/max constraints
    const minMain = isRow 
      ? (props.minWidth ?? 0) 
      : (props.minHeight ?? 0);
    const maxMain = isRow 
      ? (props.maxWidth ?? Infinity) 
      : (props.maxHeight ?? Infinity);
    
    return {
      index,
      child,
      mainSize,
      crossSize,
      flexGrow,
      flexShrink,
      minMain,
      maxMain,
    };
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Distribute space along main axis
  // ─────────────────────────────────────────────────────────────────────────
  
  // Calculate total gaps
  const totalGaps = gap * (measured.length - 1);
  
  // Calculate total base size (before flex)
  const totalBaseSize = measured.reduce((sum, m) => sum + m.mainSize, 0);
  
  // Available space for flex
  const availableSpace = mainAxisSize - totalGaps - totalBaseSize;
  
  // Compute final main sizes
  const finalMainSizes: number[] = [];
  
  if (availableSpace > 0) {
    // Extra space - distribute to growers
    const totalGrow = measured.reduce((sum, m) => sum + m.flexGrow, 0);
    
    for (const m of measured) {
      let size = m.mainSize;
      if (totalGrow > 0 && m.flexGrow > 0) {
        size += (availableSpace * m.flexGrow) / totalGrow;
      }
      // Apply constraints
      size = Math.max(m.minMain, Math.min(m.maxMain, size));
      finalMainSizes.push(size);
    }
  } else if (availableSpace < 0) {
    // Overflow - shrink if possible
    const totalShrink = measured.reduce((sum, m) => sum + m.flexShrink * m.mainSize, 0);
    
    for (const m of measured) {
      let size = m.mainSize;
      if (totalShrink > 0 && m.flexShrink > 0) {
        const shrinkRatio = (m.flexShrink * m.mainSize) / totalShrink;
        size += availableSpace * shrinkRatio; // availableSpace is negative
      }
      // Apply constraints
      size = Math.max(m.minMain, Math.min(m.maxMain, size));
      finalMainSizes.push(size);
    }
  } else {
    // Exact fit
    for (const m of measured) {
      finalMainSizes.push(m.mainSize);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3: Compute main axis positions based on justify
  // ─────────────────────────────────────────────────────────────────────────
  
  const actualTotalMain = finalMainSizes.reduce((sum, s) => sum + s, 0) + totalGaps;
  const freeSpace = Math.max(0, mainAxisSize - actualTotalMain);
  
  let mainPosition = 0;
  let spaceBetween = 0;
  let spaceAround = 0;
  
  switch (justify) {
    case 'start':
      mainPosition = 0;
      break;
    case 'center':
      mainPosition = freeSpace / 2;
      break;
    case 'end':
      mainPosition = freeSpace;
      break;
    case 'between':
      mainPosition = 0;
      if (measured.length > 1) {
        spaceBetween = freeSpace / (measured.length - 1);
      }
      break;
    case 'around':
      spaceAround = freeSpace / measured.length;
      mainPosition = spaceAround / 2;
      break;
    case 'evenly':
      const spaceEvenly = freeSpace / (measured.length + 1);
      mainPosition = spaceEvenly;
      spaceBetween = spaceEvenly - gap; // Adjust for gap
      break;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Phase 4: Compute cross axis positions based on align
  // ─────────────────────────────────────────────────────────────────────────
  
  const childLayouts: ChildLayout[] = new Array(children.length).fill(null).map(() => ({
    x: 0, y: 0, width: 0, height: 0,
  }));
  
  let currentMain = mainPosition;
  
  for (let i = 0; i < measured.length; i++) {
    const m = measured[i];
    const mainSize = finalMainSizes[i];
    
    // Cross axis size and position
    let crossSize = m.crossSize;
    let crossPosition = 0;
    
    // Get alignment for this child
    const childAlign = m.child.layoutProps?.alignSelf ?? align;
    
    switch (childAlign) {
      case 'start':
        crossPosition = 0;
        break;
      case 'center':
        crossPosition = (crossAxisSize - crossSize) / 2;
        break;
      case 'end':
        crossPosition = crossAxisSize - crossSize;
        break;
      case 'stretch':
        crossSize = crossAxisSize;
        crossPosition = 0;
        break;
    }
    
    // Convert to x/y and width/height
    const layout = childLayouts[m.index];
    if (isRow) {
      layout.x = currentMain;
      layout.y = crossPosition;
      layout.width = mainSize;
      layout.height = crossSize;
    } else {
      layout.x = crossPosition;
      layout.y = currentMain;
      layout.width = crossSize;
      layout.height = mainSize;
    }
    
    // Move to next position
    currentMain += mainSize + gap + spaceBetween + spaceAround;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compute content size
  // ─────────────────────────────────────────────────────────────────────────
  
  let contentWidth = 0;
  let contentHeight = 0;
  
  for (const layout of childLayouts) {
    contentWidth = Math.max(contentWidth, layout.x + layout.width);
    contentHeight = Math.max(contentHeight, layout.y + layout.height);
  }
  
  return {
    children: childLayouts,
    contentWidth,
    contentHeight,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Helper: Parse size value
// ───────────────────────────────────────────────────────────────────────────

/**
 * Parse a size value to pixels
 */
export function parseSize(
  size: number | 'auto' | 'fill' | `${number}%` | undefined,
  parentSize: number,
  autoSize: number = 0
): { pixels: number; isFill: boolean } {
  if (size === undefined || size === 'auto') {
    return { pixels: autoSize, isFill: false };
  }
  
  if (size === 'fill') {
    return { pixels: parentSize, isFill: true };
  }
  
  if (typeof size === 'string' && size.endsWith('%')) {
    const percent = parseFloat(size) / 100;
    return { pixels: parentSize * percent, isFill: false };
  }
  
  return { pixels: size as number, isFill: false };
}
