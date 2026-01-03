// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Stack
// 
// Container that automatically lays out children in a row or column.
// Inspired by CSS Flexbox but simplified.
// ═══════════════════════════════════════════════════════════════════════════

import { Container, ContainerComponentProps } from '../Container';
import type {
  RenderOutput,
  Color,
  ComputedBounds,
  Component as IComponent,
} from '../types';
import { applyOpacity, parsePadding } from '../types';
import { computeStackLayout, type ChildInfo } from '../layout';
import type {
  LayoutDirection,
  JustifyContent,
  AlignItems,
  ChildLayoutProps,
} from '../layout';

// ───────────────────────────────────────────────────────────────────────────
// Stack Props
// ───────────────────────────────────────────────────────────────────────────

export interface StackProps extends ContainerComponentProps {
  /** Layout direction */
  direction?: LayoutDirection;
  /** Gap between children */
  gap?: number;
  /** Main axis alignment */
  justify?: JustifyContent;
  /** Cross axis alignment */
  align?: AlignItems;
  /** Reverse child order */
  reverse?: boolean;
  /** Background color (optional) */
  color?: Color;
  /** Corner radius */
  cornerRadius?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Stack Component
// ───────────────────────────────────────────────────────────────────────────

export class Stack extends Container {
  readonly type: string = 'stack';
  
  // Layout config
  protected _direction: LayoutDirection;
  protected _justify: JustifyContent;
  protected _align: AlignItems;
  protected _reverse: boolean;
  
  // Visual config
  protected _color?: Color;
  protected _cornerRadius: number;
  
  constructor(props: StackProps = {}) {
    super(props);
    
    this._direction = props.direction ?? 'column';
    this._gap = props.gap ?? 0;
    this._justify = props.justify ?? 'start';
    this._align = props.align ?? 'stretch';
    this._reverse = props.reverse ?? false;
    this._color = props.color;
    this._cornerRadius = props.cornerRadius ?? 0;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────
  
  setDirection(direction: LayoutDirection): void {
    if (this._direction !== direction) {
      this._direction = direction;
      this.markDirty();
    }
  }
  
  setJustify(justify: JustifyContent): void {
    if (this._justify !== justify) {
      this._justify = justify;
      this.markDirty();
    }
  }
  
  setAlign(align: AlignItems): void {
    if (this._align !== align) {
      this._align = align;
      this.markDirty();
    }
  }
  
  setGap(gap: number): void {
    if (this._gap !== gap) {
      this._gap = gap;
      this.markDirty();
    }
  }
  
  setColor(color: Color | undefined): void {
    this._color = color;
    this.markDirty();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Layout Override
  // ─────────────────────────────────────────────────────────────────────────
  
  protected layoutChildren(contentBounds: ComputedBounds): void {
    if (this._children.length === 0) return;
    
    // Gather child info for layout
    const childInfos: ChildInfo[] = this._children.map(child => {
      // Try to get layout props from child
      const layoutProps = this.getChildLayoutProps(child);
      
      return {
        width: child.getProps().width,
        height: child.getProps().height,
        layoutProps,
        visible: child.visible,
      };
    });
    
    // Compute layout
    const result = computeStackLayout(
      {
        direction: this._direction,
        gap: this._gap,
        justify: this._justify,
        align: this._align,
        wrap: false,
        reverse: this._reverse,
      },
      contentBounds.width,
      contentBounds.height,
      childInfos
    );
    
    // Apply computed layout to children
    for (let i = 0; i < this._children.length; i++) {
      const child = this._children[i];
      const childLayout = result.children[i];
      
      if (child.visible) {
        // Create bounds for this child based on computed layout
        const childBounds: ComputedBounds = {
          x: contentBounds.x + childLayout.x,
          y: contentBounds.y + childLayout.y,
          width: childLayout.width,
          height: childLayout.height,
        };
        
        // Update child props to match computed size
        // This allows children to know their allocated size
        child.setProps({
          x: childLayout.x,
          y: childLayout.y,
          width: childLayout.width,
          height: childLayout.height,
        });
        
        // Layout child (this computes its bounds)
        child.layout(contentBounds);
      }
    }
  }
  
  /**
   * Get layout props from a child component
   */
  private getChildLayoutProps(child: IComponent): ChildLayoutProps | undefined {
    // Check if child has layout props
    const props = child.getProps() as Record<string, unknown>;
    
    if ('flexGrow' in props || 'alignSelf' in props) {
      return {
        flexGrow: props.flexGrow as number | undefined,
        flexShrink: props.flexShrink as number | undefined,
        alignSelf: props.alignSelf as any,
        minWidth: props.minWidth as number | undefined,
        maxWidth: props.maxWidth as number | undefined,
        minHeight: props.minHeight as number | undefined,
        maxHeight: props.maxHeight as number | undefined,
      };
    }
    
    return undefined;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  protected renderSelf(): RenderOutput {
    const output: RenderOutput = {
      quads: [],
      texts: [],
      hitRegions: [],
    };
    
    // Render background if color is set
    if (this._color) {
      output.quads.push({
        x: this._bounds.x,
        y: this._bounds.y,
        width: this._bounds.width,
        height: this._bounds.height,
        color: applyOpacity(this._color, this.opacity),
        cornerRadius: this._cornerRadius,
        zIndex: this.zIndex,
      });
    }
    
    return output;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Convenience: Row and Column
// ───────────────────────────────────────────────────────────────────────────

/**
 * Horizontal stack (row direction)
 */
export class Row extends Stack {
  readonly type: string = 'row';
  
  constructor(props: Omit<StackProps, 'direction'> = {}) {
    super({ ...props, direction: 'row' });
  }
}

/**
 * Vertical stack (column direction)
 */
export class Column extends Stack {
  readonly type: string = 'column';
  
  constructor(props: Omit<StackProps, 'direction'> = {}) {
    super({ ...props, direction: 'column' });
  }
}
