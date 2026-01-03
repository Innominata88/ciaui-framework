// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component System - Base Component
// 
// Abstract base class for all components. Handles:
// - Props management
// - Lifecycle (mount/unmount)
// - Layout computation
// - Dirty tracking for efficient re-renders
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Component as IComponent,
  ComponentState,
  BaseComponentProps,
  ComputedBounds,
  RenderOutput,
  LayoutProps,
} from './types';
import { generateComponentId } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Base Component Class
// ───────────────────────────────────────────────────────────────────────────

export abstract class Component implements IComponent {
  // Identity
  readonly id: string;
  abstract readonly type: string;
  
  // Lifecycle
  private _state: ComponentState = 'created';
  private _dirty: boolean = true;
  
  // Hierarchy
  parent: IComponent | null = null;
  
  // Layout
  protected _props: BaseComponentProps;
  protected _bounds: ComputedBounds = { x: 0, y: 0, width: 0, height: 0 };
  
  constructor(props: BaseComponentProps = {}) {
    this.id = props.id ?? generateComponentId(this.constructor.name.toLowerCase());
    this._props = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: 0,
      visible: true,
      opacity: 1,
      ...props,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────
  
  get state(): ComponentState {
    return this._state;
  }
  
  get bounds(): ComputedBounds {
    return this._bounds;
  }
  
  get visible(): boolean {
    return this._props.visible !== false;
  }
  
  get x(): number {
    return this._props.x ?? 0;
  }
  
  get y(): number {
    return this._props.y ?? 0;
  }
  
  get width(): number {
    return this._props.width ?? 0;
  }
  
  get height(): number {
    return this._props.height ?? 0;
  }
  
  get zIndex(): number {
    return this._props.zIndex ?? 0;
  }
  
  get opacity(): number {
    return this._props.opacity ?? 1;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Props Management
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Update component props
   */
  setProps(props: Partial<BaseComponentProps>): void {
    const changed = Object.keys(props).some(
      key => (this._props as Record<string, unknown>)[key] !== (props as Record<string, unknown>)[key]
    );
    
    if (changed) {
      this._props = { ...this._props, ...props };
      this.markDirty();
    }
  }
  
  /**
   * Get current props
   */
  getProps(): BaseComponentProps {
    return { ...this._props };
  }
  
  /**
   * Get a specific prop value
   */
  protected getProp<K extends keyof BaseComponentProps>(key: K): BaseComponentProps[K] {
    return this._props[key];
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Compute layout bounds based on parent
   */
  layout(parentBounds: ComputedBounds): void {
    // Default layout: position relative to parent
    this._bounds = {
      x: parentBounds.x + (this._props.x ?? 0),
      y: parentBounds.y + (this._props.y ?? 0),
      width: this._props.width ?? parentBounds.width,
      height: this._props.height ?? parentBounds.height,
    };
    
    // Allow subclasses to do additional layout
    this.onLayout();
  }
  
  /**
   * Override in subclasses for custom layout logic
   */
  protected onLayout(): void {
    // Default: no-op
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Mount the component
   */
  mount(): void {
    if (this._state === 'mounted') return;
    
    this._state = 'mounted';
    this.onMount();
  }
  
  /**
   * Unmount the component
   */
  unmount(): void {
    if (this._state === 'unmounted') return;
    
    this._state = 'unmounted';
    this.onUnmount();
  }
  
  /**
   * Override in subclasses for mount logic
   */
  protected onMount(): void {
    // Default: no-op
  }
  
  /**
   * Override in subclasses for unmount logic
   */
  protected onUnmount(): void {
    // Default: no-op
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Dirty Tracking
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Mark component as needing re-render
   */
  markDirty(): void {
    this._dirty = true;
    
    // Propagate up to parent
    if (this.parent && 'markDirty' in this.parent) {
      (this.parent as Component).markDirty();
    }
  }
  
  /**
   * Check if component needs re-render
   */
  isDirty(): boolean {
    return this._dirty;
  }
  
  /**
   * Clear dirty flag (called after render)
   */
  protected clearDirty(): void {
    this._dirty = false;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Render the component - must be implemented by subclasses
   */
  abstract render(): RenderOutput;
  
  /**
   * Create empty render output
   */
  protected emptyOutput(): RenderOutput {
    return { quads: [], texts: [], hitRegions: [] };
  }
}
