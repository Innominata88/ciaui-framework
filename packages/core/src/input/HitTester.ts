// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Input System - Hit Tester
// 
// Performs hit testing against registered interactive regions.
// Supports 2D point-in-rect testing with z-ordering.
// Extensible for VR ray casting in the future.
// ═══════════════════════════════════════════════════════════════════════════

import type { Rect, HitRegion, HitTestResult, InteractiveRegion, RegionEventHandlers, CursorType } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

/**
 * Check if two rectangles overlap
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Expand a rect by a margin
 */
export function expandRect(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Hit Tester Class
// ───────────────────────────────────────────────────────────────────────────

/**
 * Manages hit regions and performs hit testing
 */
export class HitTester {
  private regions: Map<string, InteractiveRegion> = new Map();
  private sortedRegions: InteractiveRegion[] = [];
  private needsSort: boolean = false;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Region Management
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Register an interactive region
   */
  register(
    id: string,
    bounds: Rect,
    handlers: RegionEventHandlers = {},
    options: Partial<Pick<HitRegion, 'zIndex' | 'cursor' | 'enabled' | 'hitTest' | 'data'>> = {}
  ): InteractiveRegion {
    const region: InteractiveRegion = {
      id,
      bounds,
      handlers,
      zIndex: options.zIndex ?? 0,
      cursor: options.cursor ?? 'default',
      enabled: options.enabled ?? true,
      hitTest: options.hitTest,
      data: options.data,
    };
    
    this.regions.set(id, region);
    this.needsSort = true;
    
    return region;
  }
  
  /**
   * Unregister a region
   */
  unregister(id: string): boolean {
    const existed = this.regions.delete(id);
    if (existed) {
      this.needsSort = true;
    }
    return existed;
  }
  
  /**
   * Get a region by ID
   */
  get(id: string): InteractiveRegion | undefined {
    return this.regions.get(id);
  }
  
  /**
   * Check if a region exists
   */
  has(id: string): boolean {
    return this.regions.has(id);
  }
  
  /**
   * Update a region's bounds
   */
  updateBounds(id: string, bounds: Rect): boolean {
    const region = this.regions.get(id);
    if (region) {
      region.bounds = bounds;
      return true;
    }
    return false;
  }
  
  /**
   * Update a region's z-index
   */
  updateZIndex(id: string, zIndex: number): boolean {
    const region = this.regions.get(id);
    if (region && region.zIndex !== zIndex) {
      region.zIndex = zIndex;
      this.needsSort = true;
      return true;
    }
    return false;
  }
  
  /**
   * Update a region's enabled state
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const region = this.regions.get(id);
    if (region) {
      region.enabled = enabled;
      return true;
    }
    return false;
  }
  
  /**
   * Update a region's cursor
   */
  setCursor(id: string, cursor: CursorType): boolean {
    const region = this.regions.get(id);
    if (region) {
      region.cursor = cursor;
      return true;
    }
    return false;
  }
  
  /**
   * Update handlers for a region
   */
  setHandlers(id: string, handlers: Partial<RegionEventHandlers>): boolean {
    const region = this.regions.get(id);
    if (region) {
      region.handlers = { ...region.handlers, ...handlers };
      return true;
    }
    return false;
  }
  
  /**
   * Clear all regions
   */
  clear(): void {
    this.regions.clear();
    this.sortedRegions = [];
    this.needsSort = false;
  }
  
  /**
   * Get all region IDs
   */
  getRegionIds(): string[] {
    return Array.from(this.regions.keys());
  }
  
  /**
   * Get region count
   */
  get count(): number {
    return this.regions.size;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Hit Testing
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Sort regions by z-index (descending - highest first)
   */
  private ensureSorted(): void {
    if (!this.needsSort) return;
    
    this.sortedRegions = Array.from(this.regions.values());
    this.sortedRegions.sort((a, b) => b.zIndex - a.zIndex);
    this.needsSort = false;
  }
  
  /**
   * Test a single point against all regions
   * Returns the topmost hit region
   */
  hitTest(x: number, y: number): HitTestResult {
    this.ensureSorted();
    
    const allHits: InteractiveRegion[] = [];
    
    for (const region of this.sortedRegions) {
      // Skip disabled regions
      if (!region.enabled) continue;
      
      // Check hit
      let hit = false;
      
      if (region.hitTest) {
        // Custom hit test function
        hit = region.hitTest(x, y);
      } else {
        // Default rectangle test
        hit = pointInRect(x, y, region.bounds);
      }
      
      if (hit) {
        allHits.push(region);
      }
    }
    
    return {
      hit: allHits.length > 0,
      region: allHits[0] ?? null,
      allHits,
      x,
      y,
    };
  }
  
  /**
   * Test if a specific region contains a point
   */
  hitTestRegion(id: string, x: number, y: number): boolean {
    const region = this.regions.get(id);
    if (!region || !region.enabled) return false;
    
    if (region.hitTest) {
      return region.hitTest(x, y);
    }
    
    return pointInRect(x, y, region.bounds);
  }
  
  /**
   * Find all regions within a rectangle
   */
  queryRect(rect: Rect): InteractiveRegion[] {
    this.ensureSorted();
    
    return this.sortedRegions.filter(region => {
      if (!region.enabled) return false;
      return rectsOverlap(rect, region.bounds);
    });
  }
  
  /**
   * Get the cursor that should be shown at a position
   */
  getCursorAt(x: number, y: number): CursorType {
    const result = this.hitTest(x, y);
    return result.region?.cursor ?? 'default';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Factory Function
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create a new hit tester instance
 */
export function createHitTester(): HitTester {
  return new HitTester();
}
