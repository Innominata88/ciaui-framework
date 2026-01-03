// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Panel
// 
// Container component with a visible background.
// Can hold child components and optionally have a title.
// ═══════════════════════════════════════════════════════════════════════════

import { Container, ContainerComponentProps } from '../Container';
import type {
  RenderOutput,
  Color,
  ComputedBounds,
} from '../types';
import { applyOpacity, parsePadding } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// Panel Props
// ───────────────────────────────────────────────────────────────────────────

export interface PanelProps extends ContainerComponentProps {
  /** Background color */
  color?: Color;
  /** Corner radius */
  cornerRadius?: number;
  /** Panel title */
  title?: string;
  /** Title font size */
  titleFontSize?: number;
  /** Title color */
  titleColor?: Color;
  /** Show header bar */
  showHeader?: boolean;
  /** Header height */
  headerHeight?: number;
  /** Header color */
  headerColor?: Color;
}

// ───────────────────────────────────────────────────────────────────────────
// Panel Component
// ───────────────────────────────────────────────────────────────────────────

export class Panel extends Container {
  readonly type: string = 'panel';
  
  // Panel-specific props
  protected _color: Color;
  protected _cornerRadius: number;
  protected _title?: string;
  protected _titleFontSize: number;
  protected _titleColor: Color;
  protected _showHeader: boolean;
  protected _headerHeight: number;
  protected _headerColor?: Color;
  
  constructor(props: PanelProps = {}) {
    super({
      ...props,
      padding: props.padding ?? 12,
    });
    
    this._color = props.color ?? [0.06, 0.06, 0.09, 0.95];
    this._cornerRadius = props.cornerRadius ?? 8;
    this._title = props.title;
    this._titleFontSize = props.titleFontSize ?? 14;
    this._titleColor = props.titleColor ?? [0.9, 0.9, 0.95, 1];
    this._showHeader = props.showHeader ?? !!props.title;
    this._headerHeight = props.headerHeight ?? 40;
    this._headerColor = props.headerColor;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────
  
  setColor(color: Color): void {
    this._color = color;
    this.markDirty();
  }
  
  setTitle(title: string | undefined): void {
    this._title = title;
    this._showHeader = !!title;
    this.markDirty();
  }
  
  setCornerRadius(radius: number): void {
    this._cornerRadius = radius;
    this.markDirty();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Layout Override
  // ─────────────────────────────────────────────────────────────────────────
  
  protected getContentBounds(): ComputedBounds {
    const padding = parsePadding(this._padding);
    const headerOffset = this._showHeader ? this._headerHeight : 0;
    
    return {
      x: this._bounds.x + padding.left,
      y: this._bounds.y + padding.top + headerOffset,
      width: this._bounds.width - padding.left - padding.right,
      height: this._bounds.height - padding.top - padding.bottom - headerOffset,
    };
  }
  
  protected layoutChildren(contentBounds: ComputedBounds): void {
    // Adjust content bounds for header
    const adjustedBounds = this.getContentBounds();
    
    for (const child of this._children) {
      if (child.visible) {
        child.layout(adjustedBounds);
      }
    }
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
    
    // Main panel background
    output.quads.push({
      x: this._bounds.x,
      y: this._bounds.y,
      width: this._bounds.width,
      height: this._bounds.height,
      color: applyOpacity(this._color, this.opacity),
      cornerRadius: this._cornerRadius,
    });
    
    // Header background (if showing)
    if (this._showHeader) {
      const headerColor = this._headerColor ?? [
        this._color[0] + 0.02,
        this._color[1] + 0.02,
        this._color[2] + 0.03,
        this._color[3],
      ];
      
      output.quads.push({
        x: this._bounds.x,
        y: this._bounds.y,
        width: this._bounds.width,
        height: this._headerHeight,
        color: applyOpacity(headerColor as Color, this.opacity),
        cornerRadius: this._cornerRadius, // Only top corners should be rounded ideally
      });
      
      // Title text
      if (this._title) {
        const padding = parsePadding(this._padding);
        output.texts.push({
          text: this._title,
          x: this._bounds.x + padding.left,
          y: this._bounds.y + (this._headerHeight - this._titleFontSize) / 2,
          fontSize: this._titleFontSize,
          color: applyOpacity(this._titleColor, this.opacity),
        });
      }
    }
    
    return output;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Card Component (alias for Panel with different defaults)
// ───────────────────────────────────────────────────────────────────────────

export interface CardProps extends PanelProps {
  /** Make card interactive */
  interactive?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Enable drag */
  draggable?: boolean;
  onDragStart?: (x: number, y: number) => void;
  onDrag?: (x: number, y: number, dx: number, dy: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

export class Card extends Panel {
  override readonly type: string = 'card';
  
  protected _interactive: boolean;
  protected _draggable: boolean;
  protected _onClick?: () => void;
  protected _onDragStart?: (x: number, y: number) => void;
  protected _onDrag?: (x: number, y: number, dx: number, dy: number) => void;
  protected _onDragEnd?: (x: number, y: number) => void;
  
  // Interaction state
  protected _hovered: boolean = false;
  protected _pressed: boolean = false;
  
  constructor(props: CardProps = {}) {
    super({
      ...props,
      cornerRadius: props.cornerRadius ?? 8,
      showHeader: props.showHeader ?? false,
    });
    
    this._interactive = props.interactive ?? false;
    this._draggable = props.draggable ?? false;
    this._onClick = props.onClick;
    this._onDragStart = props.onDragStart;
    this._onDrag = props.onDrag;
    this._onDragEnd = props.onDragEnd;
    
    // Auto-enable interactive
    if (this._onClick || this._draggable) {
      this._interactive = true;
    }
  }
  
  protected renderSelf(): RenderOutput {
    const output = super.renderSelf();
    
    // Modify color for hover/pressed state
    if (this._interactive && output.quads.length > 0) {
      const baseColor = output.quads[0].color;
      if (this._pressed) {
        output.quads[0].color = [
          baseColor[0] + 0.05,
          baseColor[1] + 0.05,
          baseColor[2] + 0.07,
          baseColor[3],
        ];
      } else if (this._hovered) {
        output.quads[0].color = [
          baseColor[0] + 0.03,
          baseColor[1] + 0.03,
          baseColor[2] + 0.04,
          baseColor[3],
        ];
      }
    }
    
    // Add hit region if interactive
    if (this._interactive) {
      output.hitRegions.push({
        id: this.id,
        bounds: {
          x: this._bounds.x,
          y: this._bounds.y,
          width: this._bounds.width,
          height: this._bounds.height,
        },
        cursor: this._draggable ? 'grab' : 'pointer',
        zIndex: this.zIndex,
        handlers: {
          onPointerEnter: () => {
            this._hovered = true;
            this.markDirty();
          },
          onPointerLeave: () => {
            this._hovered = false;
            this._pressed = false;
            this.markDirty();
          },
          onPointerDown: () => {
            this._pressed = true;
            this.markDirty();
          },
          onPointerUp: () => {
            this._pressed = false;
            this.markDirty();
          },
          onClick: () => {
            this._onClick?.();
          },
          onDragStart: this._draggable ? (e) => {
            this._onDragStart?.(e.x, e.y);
          } : undefined,
          onDrag: this._draggable ? (e) => {
            this._onDrag?.(e.x, e.y, e.totalDeltaX, e.totalDeltaY);
          } : undefined,
          onDragEnd: this._draggable ? (e) => {
            this._pressed = false;
            this._onDragEnd?.(e.x, e.y);
            this.markDirty();
          } : undefined,
        },
      });
    }
    
    return output;
  }
}
