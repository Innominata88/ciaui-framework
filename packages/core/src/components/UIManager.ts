// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Component System - UI Manager
// 
// The UIManager is the main coordinator between:
// - Component tree (layout, state)
// - Renderer (quads, text)
// - Input system (hit testing)
// ═══════════════════════════════════════════════════════════════════════════

import { RootContainer } from './Container';
import type {
  Component,
  UIManager as IUIManager,
  RenderOutput,
  HitRegionData,
} from './types';
import { InputManager } from '../input/InputManager';

// ───────────────────────────────────────────────────────────────────────────
// UI Manager Options
// ───────────────────────────────────────────────────────────────────────────

export interface UIManagerOptions {
  /** Initial width */
  width: number;
  /** Initial height */
  height: number;
  /** Input manager (optional - can be set later) */
  inputManager?: InputManager;
  /** Pixel ratio */
  pixelRatio?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// UI Manager Class
// ───────────────────────────────────────────────────────────────────────────

export class UIManager implements IUIManager {
  private _root: RootContainer;
  private _inputManager: InputManager | null = null;
  private _pixelRatio: number;
  private _lastRenderOutput: RenderOutput | null = null;
  private _registeredRegions: Set<string> = new Set();
  
  constructor(options: UIManagerOptions) {
    this._root = new RootContainer();
    this._root.setSize(options.width, options.height);
    this._root.mount();
    this._pixelRatio = options.pixelRatio ?? 1;
    
    if (options.inputManager) {
      this.setInputManager(options.inputManager);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Root Access
  // ─────────────────────────────────────────────────────────────────────────
  
  get root(): RootContainer {
    return this._root;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Component Management
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Add a component to the root
   */
  add(component: Component): void {
    this._root.addChild(component);
    this.layout();
  }
  
  /**
   * Add multiple components
   */
  addAll(...components: Component[]): void {
    for (const component of components) {
      this._root.addChild(component);
    }
    this.layout();
  }
  
  /**
   * Remove a component from the root
   */
  remove(component: Component): void {
    this._root.removeChild(component);
    
    // Unregister hit region
    if (this._inputManager && this._registeredRegions.has(component.id)) {
      this._inputManager.unregister(component.id);
      this._registeredRegions.delete(component.id);
    }
  }
  
  /**
   * Remove component by ID
   */
  removeById(id: string): void {
    const component = this.find(id);
    if (component) {
      this.remove(component);
    }
  }
  
  /**
   * Find a component by ID (recursive)
   */
  find(id: string): Component | undefined {
    return this._root.findChildDeep(id);
  }
  
  /**
   * Clear all components
   */
  clear(): void {
    // Unregister all hit regions
    if (this._inputManager) {
      for (const id of this._registeredRegions) {
        this._inputManager.unregister(id);
      }
      this._registeredRegions.clear();
    }
    
    this._root.clearChildren();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Input Manager
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Set the input manager
   */
  setInputManager(inputManager: InputManager): void {
    this._inputManager = inputManager;
  }
  
  /**
   * Get the input manager
   */
  getInputManager(): InputManager | null {
    return this._inputManager;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Recompute layout for all components
   */
  layout(): void {
    this._root.layout();
  }
  
  /**
   * Update canvas size
   */
  setSize(width: number, height: number): void {
    this._root.setSize(width, height);
    this.layout();
  }
  
  /**
   * Set pixel ratio
   */
  setPixelRatio(ratio: number): void {
    this._pixelRatio = ratio;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Render all components and get output
   */
  render(): RenderOutput {
    // Always layout before rendering to ensure bounds are up-to-date
    // This handles cases where setProps changed positions
    this._root.layout();
    
    // Render component tree
    const output = this._root.render();
    
    // Sort quads and texts by z-index (lower z-index first = rendered first = behind)
    output.quads.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    output.texts.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    
    // Update hit regions in input manager
    this.syncHitRegions(output.hitRegions);
    
    this._lastRenderOutput = output;
    return output;
  }
  
  /**
   * Get the last render output (without re-rendering)
   */
  getLastRenderOutput(): RenderOutput | null {
    return this._lastRenderOutput;
  }
  
  /**
   * Check if any component needs re-render
   */
  needsRender(): boolean {
    return this._root.isDirty();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Hit Region Sync
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Synchronize hit regions with input manager
   */
  private syncHitRegions(regions: HitRegionData[]): void {
    if (!this._inputManager) return;
    
    const newRegionIds = new Set(regions.map(r => r.id));
    
    // Remove old regions that are no longer present
    for (const id of this._registeredRegions) {
      if (!newRegionIds.has(id)) {
        this._inputManager.unregister(id);
        this._registeredRegions.delete(id);
      }
    }
    
    // Add/update regions
    for (const region of regions) {
      if (this._registeredRegions.has(region.id)) {
        // Update existing region
        this._inputManager.updateBounds(region.id, region.bounds);
        this._inputManager.updateZIndex(region.id, region.zIndex);
      } else {
        // Register new region
        this._inputManager.register(
          region.id,
          region.bounds,
          region.handlers,
          {
            cursor: region.cursor,
            zIndex: region.zIndex,
            data: region.data,
          }
        );
        this._registeredRegions.add(region.id);
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get component count
   */
  getComponentCount(): number {
    let count = 0;
    const countChildren = (component: Component) => {
      count++;
      if ('children' in component) {
        for (const child of (component as any).children) {
          countChildren(child);
        }
      }
    };
    
    for (const child of this._root.children) {
      countChildren(child);
    }
    
    return count;
  }
  
  /**
   * Get hit region count
   */
  getHitRegionCount(): number {
    return this._registeredRegions.size;
  }
  
  /**
   * Destroy the UI manager
   */
  destroy(): void {
    this.clear();
    this._root.unmount();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Factory Function
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create a UI manager
 */
export function createUIManager(options: UIManagerOptions): UIManager {
  return new UIManager(options);
}
