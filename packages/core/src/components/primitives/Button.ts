// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Button
// 
// Interactive button component. Combines a Box with centered Text.
// Supports hover, pressed, and disabled states.
// ═══════════════════════════════════════════════════════════════════════════

import { Box, BoxProps } from './Box';
import type {
  RenderOutput,
  Color,
} from '../types';
import { applyOpacity, lightenColor, darkenColor } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// Button Props
// ───────────────────────────────────────────────────────────────────────────

export interface ButtonProps extends Omit<BoxProps, 'interactive'> {
  /** Button label text */
  label: string;
  /** Text color */
  textColor?: Color;
  /** Font size */
  fontSize?: number;
  /** Icon (future: icon name or component) */
  icon?: string;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Button variant */
  variant?: 'solid' | 'outline' | 'ghost';
}

// ───────────────────────────────────────────────────────────────────────────
// Button Component
// ───────────────────────────────────────────────────────────────────────────

export class Button extends Box {
  override readonly type: string = 'button';
  
  // Button-specific props
  protected _label: string;
  protected _textColor: Color;
  protected _fontSize: number;
  protected _variant: 'solid' | 'outline' | 'ghost';
  
  constructor(props: ButtonProps) {
    // Buttons are always interactive
    super({
      ...props,
      interactive: true,
      cursor: props.cursor ?? 'pointer',
      cornerRadius: props.cornerRadius ?? 6,
      color: props.color ?? [0.2, 0.4, 0.8, 1], // Default blue
    });
    
    this._label = props.label;
    this._textColor = props.textColor ?? [1, 1, 1, 1];
    this._fontSize = props.fontSize ?? 14;
    this._variant = props.variant ?? 'solid';
    
    // Auto-size if width/height not provided
    if (!props.width) {
      // Rough estimate: fontSize * 0.6 per character + padding
      const estimatedWidth = this._label.length * this._fontSize * 0.6 + 32;
      this._props.width = Math.max(80, estimatedWidth);
    }
    if (!props.height) {
      this._props.height = this._fontSize + 20;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────
  
  setLabel(label: string): void {
    if (this._label !== label) {
      this._label = label;
      this.markDirty();
    }
  }
  
  setTextColor(color: Color): void {
    this._textColor = color;
    this.markDirty();
  }
  
  setVariant(variant: 'solid' | 'outline' | 'ghost'): void {
    if (this._variant !== variant) {
      this._variant = variant;
      this.markDirty();
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Color Overrides
  // ─────────────────────────────────────────────────────────────────────────
  
  protected getCurrentColor(): Color {
    // Ghost variant has no background
    if (this._variant === 'ghost') {
      if (this._disabled) return [0, 0, 0, 0];
      if (this._interaction.pressed) return [1, 1, 1, 0.1];
      if (this._interaction.hovered) return [1, 1, 1, 0.05];
      return [0, 0, 0, 0];
    }
    
    // Outline variant
    if (this._variant === 'outline') {
      if (this._disabled) return [0, 0, 0, 0];
      if (this._interaction.pressed) return applyOpacity(this._color, 0.2);
      if (this._interaction.hovered) return applyOpacity(this._color, 0.1);
      return [0, 0, 0, 0];
    }
    
    // Solid variant (default)
    return super.getCurrentColor();
  }
  
  protected getCurrentTextColor(): Color {
    if (this._disabled) {
      return applyOpacity(this._textColor, 0.5);
    }
    
    // For outline/ghost, use the button color as text color
    if (this._variant === 'outline' || this._variant === 'ghost') {
      if (this._interaction.pressed) return darkenColor(this._color, 0.1);
      if (this._interaction.hovered) return lightenColor(this._color, 0.1);
      return this._color;
    }
    
    return this._textColor;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  render(): RenderOutput {
    if (!this.visible) {
      return this.emptyOutput();
    }
    
    // Get base box render output
    const output = super.render();
    
    // Add outline for outline variant
    if (this._variant === 'outline' && !this._disabled) {
      // TODO: Add border rendering support
      // For now, we'll slightly modify the background
    }
    
    // Add centered text
    const textColor = this.getCurrentTextColor();
    output.texts.push({
      text: this._label,
      x: this._bounds.x + this._bounds.width / 2 - (this._label.length * this._fontSize * 0.3),
      y: this._bounds.y + (this._bounds.height - this._fontSize) / 2,
      fontSize: this._fontSize,
      color: applyOpacity(textColor, this.opacity),
      align: 'left', // We manually center
    });
    
    return output;
  }
}
