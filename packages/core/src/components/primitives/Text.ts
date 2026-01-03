// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Text
// 
// Text label component. Renders text using the MSDF font system.
// ═══════════════════════════════════════════════════════════════════════════

import { Component } from '../Component';
import type {
  BaseComponentProps,
  RenderOutput,
  Color,
  TextStyle,
} from '../types';
import { applyOpacity } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// Text Props
// ───────────────────────────────────────────────────────────────────────────

export interface TextProps extends BaseComponentProps, TextStyle {
  /** The text content */
  text: string;
  /** Text color */
  color?: Color;
  /** Font size in pixels */
  fontSize?: number;
  /** Maximum width (for wrapping) */
  maxWidth?: number;
  /** Horizontal alignment */
  align?: 'left' | 'center' | 'right';
  /** Vertical alignment within bounds */
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

// ───────────────────────────────────────────────────────────────────────────
// Text Component
// ───────────────────────────────────────────────────────────────────────────

export class Text extends Component {
  readonly type: string = 'text';
  
  // Text props
  protected _text: string;
  protected _textColor: Color;
  protected _fontSize: number;
  protected _maxWidth?: number;
  protected _align: 'left' | 'center' | 'right';
  protected _verticalAlign: 'top' | 'middle' | 'bottom';
  
  constructor(props: TextProps) {
    super(props);
    
    this._text = props.text;
    this._textColor = props.color ?? [1, 1, 1, 1];
    this._fontSize = props.fontSize ?? 14;
    this._maxWidth = props.maxWidth;
    this._align = props.align ?? 'left';
    this._verticalAlign = props.verticalAlign ?? 'top';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Getters & Setters
  // ─────────────────────────────────────────────────────────────────────────
  
  get text(): string {
    return this._text;
  }
  
  setText(text: string): void {
    if (this._text !== text) {
      this._text = text;
      this.markDirty();
    }
  }
  
  setColor(color: Color): void {
    this._textColor = color;
    this.markDirty();
  }
  
  setFontSize(size: number): void {
    if (this._fontSize !== size) {
      this._fontSize = size;
      this.markDirty();
    }
  }
  
  setAlign(align: 'left' | 'center' | 'right'): void {
    if (this._align !== align) {
      this._align = align;
      this.markDirty();
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  render(): RenderOutput {
    if (!this.visible || !this._text) {
      return this.emptyOutput();
    }
    
    // Calculate text position based on alignment
    let x = this._bounds.x;
    let y = this._bounds.y;
    
    // Vertical alignment
    if (this._bounds.height > 0) {
      switch (this._verticalAlign) {
        case 'middle':
          y = this._bounds.y + (this._bounds.height - this._fontSize) / 2;
          break;
        case 'bottom':
          y = this._bounds.y + this._bounds.height - this._fontSize;
          break;
        // 'top' is default
      }
    }
    
    const output: RenderOutput = {
      quads: [],
      texts: [{
        text: this._text,
        x,
        y,
        fontSize: this._fontSize,
        color: applyOpacity(this._textColor, this.opacity),
        maxWidth: this._maxWidth ?? this._bounds.width,
        align: this._align,
      }],
      hitRegions: [],
    };
    
    this.clearDirty();
    return output;
  }
}
