// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component - Spacer
// 
// Flexible element that expands to fill available space in a Stack.
// Use between elements to push them apart.
// ═══════════════════════════════════════════════════════════════════════════

import { Component } from '../Component';
import type {
  BaseComponentProps,
  RenderOutput,
} from '../types';

// ───────────────────────────────────────────────────────────────────────────
// Spacer Props
// ───────────────────────────────────────────────────────────────────────────

export interface SpacerProps extends BaseComponentProps {
  /** Fixed size (if not flexible) */
  size?: number;
  /** Flex grow factor (default: 1) */
  flexGrow?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Spacer Component
// ───────────────────────────────────────────────────────────────────────────

export class Spacer extends Component {
  readonly type: string = 'spacer';
  
  protected _size?: number;
  protected _flexGrow: number;
  
  constructor(props: SpacerProps = {}) {
    super({
      ...props,
      // Use size for both dimensions if provided
      width: props.size ?? props.width ?? 0,
      height: props.size ?? props.height ?? 0,
    });
    
    this._size = props.size;
    this._flexGrow = props.flexGrow ?? 1;
  }
  
  // Expose flexGrow for layout system
  getProps(): BaseComponentProps & { flexGrow: number } {
    return {
      ...super.getProps(),
      flexGrow: this._flexGrow,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  render(): RenderOutput {
    // Spacer renders nothing - it just takes up space
    return this.emptyOutput();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Convenience: Fixed Spacer
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create a fixed-size spacer
 */
export function fixedSpacer(size: number): Spacer {
  return new Spacer({ size, flexGrow: 0 });
}

/**
 * Create a flexible spacer that grows
 */
export function flexSpacer(grow: number = 1): Spacer {
  return new Spacer({ flexGrow: grow });
}
