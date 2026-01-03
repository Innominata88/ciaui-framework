// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Box
// 
// Basic rectangle component. The fundamental building block.
// Can be interactive (respond to clicks, hover, drag).
// ═══════════════════════════════════════════════════════════════════════════

import { Component } from '../Component';
import type {
  BaseComponentProps,
  InteractiveProps,
  BackgroundStyle,
  RenderOutput,
  Color,
  InteractionState,
} from '../types';
import { lightenColor, darkenColor, applyOpacity } from '../types';
import type { 
  PointerEvent as InputPointerEvent, 
  ClickEvent, 
  DragEvent,
} from '../../input/types';

// ───────────────────────────────────────────────────────────────────────────
// Box Props
// ───────────────────────────────────────────────────────────────────────────

export interface BoxProps extends BaseComponentProps, InteractiveProps, BackgroundStyle {
  /** Background color */
  color?: Color;
  /** Corner radius */
  cornerRadius?: number;
  /** Hover color (auto-computed if not provided) */
  hoverColor?: Color;
  /** Pressed color (auto-computed if not provided) */
  pressedColor?: Color;
}

// ───────────────────────────────────────────────────────────────────────────
// Box Component
// ───────────────────────────────────────────────────────────────────────────

export class Box extends Component {
  readonly type: string = 'box';
  
  // Box-specific props
  protected _color: Color;
  protected _cornerRadius: number;
  protected _hoverColor?: Color;
  protected _pressedColor?: Color;
  
  // Interactive props
  protected _interactive: boolean;
  protected _disabled: boolean;
  protected _cursor: string;
  
  // Event handlers
  protected _onClick?: () => void;
  protected _onDoubleClick?: () => void;
  protected _onPointerEnter?: () => void;
  protected _onPointerLeave?: () => void;
  protected _onPointerDown?: () => void;
  protected _onPointerUp?: () => void;
  protected _onDragStart?: (x: number, y: number) => void;
  protected _onDrag?: (x: number, y: number, dx: number, dy: number) => void;
  protected _onDragEnd?: (x: number, y: number) => void;
  
  // Interaction state
  protected _interaction: InteractionState = {
    hovered: false,
    pressed: false,
    focused: false,
    disabled: false,
  };
  
  constructor(props: BoxProps = {}) {
    super(props);
    
    // Visual props
    this._color = props.color ?? [0.1, 0.1, 0.15, 1];
    this._cornerRadius = props.cornerRadius ?? 0;
    this._hoverColor = props.hoverColor;
    this._pressedColor = props.pressedColor;
    
    // Interactive props
    this._interactive = props.interactive ?? false;
    this._disabled = props.disabled ?? false;
    this._cursor = props.cursor ?? (this._interactive ? 'pointer' : 'default');
    
    // Event handlers
    this._onClick = props.onClick;
    this._onDoubleClick = props.onDoubleClick;
    this._onPointerEnter = props.onPointerEnter;
    this._onPointerLeave = props.onPointerLeave;
    this._onPointerDown = props.onPointerDown;
    this._onPointerUp = props.onPointerUp;
    this._onDragStart = props.onDragStart;
    this._onDrag = props.onDrag;
    this._onDragEnd = props.onDragEnd;
    
    // Auto-enable interactive if handlers provided
    if (this._onClick || this._onDragStart) {
      this._interactive = true;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────
  
  setColor(color: Color): void {
    this._color = color;
    this.markDirty();
  }
  
  setCornerRadius(radius: number): void {
    this._cornerRadius = radius;
    this.markDirty();
  }
  
  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
    this._interaction.disabled = disabled;
    this.markDirty();
  }
  
  setInteractive(interactive: boolean): void {
    this._interactive = interactive;
    this.markDirty();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Interaction State
  // ─────────────────────────────────────────────────────────────────────────
  
  get interaction(): Readonly<InteractionState> {
    return this._interaction;
  }
  
  /**
   * Get current display color based on interaction state
   */
  protected getCurrentColor(): Color {
    if (this._disabled) {
      return applyOpacity(this._color, 0.5);
    }
    
    if (this._interaction.pressed) {
      return this._pressedColor ?? darkenColor(this._color, 0.1);
    }
    
    if (this._interaction.hovered) {
      return this._hoverColor ?? lightenColor(this._color, 0.1);
    }
    
    return this._color;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers (called by input system)
  // ─────────────────────────────────────────────────────────────────────────
  
  protected handlePointerEnter(): void {
    if (this._disabled) return;
    this._interaction.hovered = true;
    this._onPointerEnter?.();
    this.markDirty();
  }
  
  protected handlePointerLeave(): void {
    this._interaction.hovered = false;
    this._interaction.pressed = false;
    this._onPointerLeave?.();
    this.markDirty();
  }
  
  protected handlePointerDown(): void {
    if (this._disabled) return;
    this._interaction.pressed = true;
    this._onPointerDown?.();
    this.markDirty();
  }
  
  protected handlePointerUp(): void {
    this._interaction.pressed = false;
    this._onPointerUp?.();
    this.markDirty();
  }
  
  protected handleClick(): void {
    if (this._disabled) return;
    this._onClick?.();
  }
  
  protected handleDoubleClick(): void {
    if (this._disabled) return;
    this._onDoubleClick?.();
  }
  
  protected handleDragStart(x: number, y: number): void {
    if (this._disabled) return;
    this._onDragStart?.(x, y);
  }
  
  protected handleDrag(x: number, y: number, dx: number, dy: number): void {
    if (this._disabled) return;
    this._onDrag?.(x, y, dx, dy);
  }
  
  protected handleDragEnd(x: number, y: number): void {
    this._interaction.pressed = false;
    this._onDragEnd?.(x, y);
    this.markDirty();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  render(): RenderOutput {
    if (!this.visible) {
      return this.emptyOutput();
    }
    
    const output: RenderOutput = {
      quads: [],
      texts: [],
      hitRegions: [],
    };
    
    // Add quad for background
    const displayColor = this.getCurrentColor();
    output.quads.push({
      x: this._bounds.x,
      y: this._bounds.y,
      width: this._bounds.width,
      height: this._bounds.height,
      color: applyOpacity(displayColor, this.opacity),
      cornerRadius: this._cornerRadius,
    });
    
    // Add hit region if interactive
    if (this._interactive && !this._disabled) {
      output.hitRegions.push({
        id: this.id,
        bounds: {
          x: this._bounds.x,
          y: this._bounds.y,
          width: this._bounds.width,
          height: this._bounds.height,
        },
        cursor: this._cursor as any,
        zIndex: this.zIndex,
        handlers: {
          onPointerEnter: () => this.handlePointerEnter(),
          onPointerLeave: () => this.handlePointerLeave(),
          onPointerDown: () => this.handlePointerDown(),
          onPointerUp: () => this.handlePointerUp(),
          onClick: () => this.handleClick(),
          onDoubleClick: () => this.handleDoubleClick(),
          onDragStart: (e: DragEvent) => this.handleDragStart(e.x, e.y),
          onDrag: (e: DragEvent) => this.handleDrag(e.x, e.y, e.totalDeltaX, e.totalDeltaY),
          onDragEnd: (e: DragEvent) => this.handleDragEnd(e.x, e.y),
        },
      });
    }
    
    this.clearDirty();
    return output;
  }
}
