// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component System - Container
// 
// Base class for components that can contain children.
// Handles child management, layout propagation, and render aggregation.
// ═══════════════════════════════════════════════════════════════════════════

import { Component } from './Component';
import type {
  Component as IComponent,
  ContainerComponent as IContainerComponent,
  ContainerProps,
  BaseComponentProps,
  ComputedBounds,
  RenderOutput,
  Padding,
} from './types';
import { parsePadding } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Container Props
// ───────────────────────────────────────────────────────────────────────────

export interface ContainerComponentProps extends BaseComponentProps, ContainerProps {
  /** Clip children to container bounds */
  clip?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Container Class
// ───────────────────────────────────────────────────────────────────────────

export abstract class Container extends Component implements IContainerComponent {
  protected _children: IComponent[] = [];
  protected _padding: Padding;
  protected _gap: number;
  protected _clip: boolean;
  
  constructor(props: ContainerComponentProps = {}) {
    super(props);
    this._padding = props.padding ?? 0;
    this._gap = props.gap ?? 0;
    this._clip = props.clip ?? false;
    
    // Add initial children
    if (props.children) {
      for (const child of props.children) {
        this.addChild(child);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Children Management
  // ─────────────────────────────────────────────────────────────────────────
  
  get children(): ReadonlyArray<IComponent> {
    return this._children;
  }
  
  /**
   * Add a child component
   */
  addChild(child: IComponent): void {
    if (child.parent) {
      // Remove from previous parent
      if ('removeChild' in child.parent) {
        (child.parent as Container).removeChild(child);
      }
    }
    
    child.parent = this;
    this._children.push(child);
    
    // Mount if container is mounted
    if (this.state === 'mounted') {
      child.mount();
    }
    
    this.markDirty();
  }
  
  /**
   * Add multiple children
   */
  addChildren(...children: IComponent[]): void {
    for (const child of children) {
      this.addChild(child);
    }
  }
  
  /**
   * Insert child at specific index
   */
  insertChild(child: IComponent, index: number): void {
    if (child.parent) {
      if ('removeChild' in child.parent) {
        (child.parent as Container).removeChild(child);
      }
    }
    
    child.parent = this;
    this._children.splice(index, 0, child);
    
    if (this.state === 'mounted') {
      child.mount();
    }
    
    this.markDirty();
  }
  
  /**
   * Remove a child component
   */
  removeChild(child: IComponent): void {
    const index = this._children.indexOf(child);
    if (index === -1) return;
    
    this._children.splice(index, 1);
    child.parent = null;
    
    if (child.state === 'mounted') {
      child.unmount();
    }
    
    this.markDirty();
  }
  
  /**
   * Remove child by ID
   */
  removeChildById(id: string): void {
    const child = this.findChild(id);
    if (child) {
      this.removeChild(child);
    }
  }
  
  /**
   * Remove all children
   */
  clearChildren(): void {
    for (const child of [...this._children]) {
      this.removeChild(child);
    }
  }
  
  /**
   * Find child by ID (direct children only)
   */
  findChild(id: string): IComponent | undefined {
    return this._children.find(c => c.id === id);
  }
  
  /**
   * Find child by ID (recursive)
   */
  findChildDeep(id: string): IComponent | undefined {
    for (const child of this._children) {
      if (child.id === id) return child;
      
      if ('findChildDeep' in child) {
        const found = (child as Container).findChildDeep(id);
        if (found) return found;
      }
    }
    return undefined;
  }
  
  /**
   * Get child count
   */
  get childCount(): number {
    return this._children.length;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Compute layout for self and children
   */
  layout(parentBounds: ComputedBounds): void {
    // Layout self first
    super.layout(parentBounds);
    
    // Compute content bounds (accounting for padding)
    const padding = parsePadding(this._padding);
    const contentBounds: ComputedBounds = {
      x: this._bounds.x + padding.left,
      y: this._bounds.y + padding.top,
      width: this._bounds.width - padding.left - padding.right,
      height: this._bounds.height - padding.top - padding.bottom,
    };
    
    // Layout children
    this.layoutChildren(contentBounds);
  }
  
  /**
   * Layout children - override for custom layout behavior
   */
  protected layoutChildren(contentBounds: ComputedBounds): void {
    // Default: layout each child relative to content bounds
    for (const child of this._children) {
      if (child.visible) {
        child.layout(contentBounds);
      }
    }
  }
  
  /**
   * Get content bounds (bounds minus padding)
   */
  protected getContentBounds(): ComputedBounds {
    const padding = parsePadding(this._padding);
    return {
      x: this._bounds.x + padding.left,
      y: this._bounds.y + padding.top,
      width: this._bounds.width - padding.left - padding.right,
      height: this._bounds.height - padding.top - padding.bottom,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  
  protected onMount(): void {
    // Mount all children
    for (const child of this._children) {
      child.mount();
    }
  }
  
  protected onUnmount(): void {
    // Unmount all children
    for (const child of this._children) {
      child.unmount();
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Render self and all children
   */
  render(): RenderOutput {
    if (!this.visible) {
      return this.emptyOutput();
    }
    
    // Render self
    const selfOutput = this.renderSelf();
    
    // Render children
    const childOutputs = this._children
      .filter(c => c.visible)
      .map(c => c.render());
    
    // Merge outputs
    const output: RenderOutput = {
      quads: [...selfOutput.quads],
      texts: [...selfOutput.texts],
      hitRegions: [...selfOutput.hitRegions],
    };
    
    for (const childOutput of childOutputs) {
      output.quads.push(...childOutput.quads);
      output.texts.push(...childOutput.texts);
      output.hitRegions.push(...childOutput.hitRegions);
    }
    
    this.clearDirty();
    return output;
  }
  
  /**
   * Render just this container (not children)
   * Override in subclasses to render background, etc.
   */
  protected renderSelf(): RenderOutput {
    return this.emptyOutput();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Root Container
// ───────────────────────────────────────────────────────────────────────────

/**
 * Root container - the top-level container that fills the canvas
 */
export class RootContainer extends Container {
  readonly type: string = 'root';
  
  constructor() {
    super({
      id: 'root',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  }
  
  /**
   * Set root size (call when canvas resizes)
   */
  setSize(width: number, height: number): void {
    this.setProps({ width, height });
  }
  
  /**
   * Override layout to use self bounds as parent bounds
   */
  layout(): void {
    // Root uses its own size as the parent bounds
    const rootBounds: ComputedBounds = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    };
    
    this._bounds = rootBounds;
    
    // Layout children
    for (const child of this._children) {
      if (child.visible) {
        child.layout(rootBounds);
      }
    }
  }
}
