// ═══════════════════════════════════════════════════════════════════════════
// CIAUI Input System - Input Manager
// 
// Coordinates all input handling:
// - Listens to DOM events
// - Converts to unified CIAUI events  
// - Performs hit testing
// - Dispatches to appropriate handlers
// - Manages interaction state (hover, drag, focus)
// ═══════════════════════════════════════════════════════════════════════════

import { HitTester } from './HitTester';
import { 
  PointerState, 
  PointerEvent, 
  ClickEvent, 
  DragEvent, 
  ScrollEvent,
  KeyboardEvent,
  CursorType,
  createPointerState,
  createBaseEvent,
  InteractiveRegion,
  RegionEventHandlers,
  Rect,
  EventHandler,
  AnyInputEvent,
} from './types';

// ───────────────────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────────────────

export interface InputManagerOptions {
  /** Target element to attach listeners to */
  target: HTMLElement;
  
  /** Pixel threshold before drag starts */
  dragThreshold?: number;
  
  /** Time threshold for double click (ms) */
  doubleClickTime?: number;
  
  /** Enable keyboard input */
  keyboard?: boolean;
  
  /** Enable scroll/wheel input */
  scroll?: boolean;
  
  /** Enable touch input */
  touch?: boolean;
  
  /** Enable context menu (right-click) */
  contextMenu?: boolean;
  
  /** Pixel ratio for coordinate conversion */
  pixelRatio?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Input Manager Class
// ───────────────────────────────────────────────────────────────────────────

export class InputManager {
  private target: HTMLElement;
  private hitTester: HitTester;
  private options: Required<Omit<InputManagerOptions, 'target'>>;
  
  // Pointer state
  private pointer: PointerState;
  private hoveredRegion: InteractiveRegion | null = null;
  
  // Drag state
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragRegion: InteractiveRegion | null = null;
  private potentialDrag: boolean = false;
  
  // Click tracking
  private lastClickTime: number = 0;
  private lastClickX: number = 0;
  private lastClickY: number = 0;
  private clickCount: number = 0;
  
  // Global event handlers
  private globalHandlers: Map<string, Set<EventHandler>> = new Map();
  
  // Bound event handlers (for cleanup)
  private boundHandlers: Map<string, EventListener> = new Map();
  
  // Active state
  private active: boolean = false;
  
  constructor(options: InputManagerOptions) {
    this.target = options.target;
    this.hitTester = new HitTester();
    this.pointer = createPointerState(0, 'mouse');
    
    this.options = {
      dragThreshold: options.dragThreshold ?? 5,
      doubleClickTime: options.doubleClickTime ?? 300,
      keyboard: options.keyboard ?? true,
      scroll: options.scroll ?? true,
      touch: options.touch ?? true,
      contextMenu: options.contextMenu ?? true,
      pixelRatio: options.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Start listening for input events
   */
  start(): void {
    if (this.active) return;
    this.active = true;
    
    // Mouse events
    this.addListener('mousedown', this.handleMouseDown);
    this.addListener('mouseup', this.handleMouseUp);
    this.addListener('mousemove', this.handleMouseMove);
    this.addListener('mouseleave', this.handleMouseLeave);
    
    // Wheel events
    if (this.options.scroll) {
      this.addListener('wheel', this.handleWheel, { passive: false });
    }
    
    // Context menu
    if (this.options.contextMenu) {
      this.addListener('contextmenu', this.handleContextMenu);
    }
    
    // Touch events
    if (this.options.touch) {
      this.addListener('touchstart', this.handleTouchStart, { passive: false });
      this.addListener('touchend', this.handleTouchEnd);
      this.addListener('touchmove', this.handleTouchMove, { passive: false });
      this.addListener('touchcancel', this.handleTouchCancel);
    }
    
    // Keyboard events (on document for global capture)
    if (this.options.keyboard) {
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
    }
    
    console.log('[InputManager] Started');
  }
  
  /**
   * Stop listening for input events
   */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    
    // Remove all listeners
    for (const [event, handler] of this.boundHandlers) {
      this.target.removeEventListener(event, handler);
    }
    this.boundHandlers.clear();
    
    // Remove keyboard listeners
    if (this.options.keyboard) {
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
    }
    
    console.log('[InputManager] Stopped');
  }
  
  /**
   * Add event listener with automatic binding
   */
  private addListener<K extends keyof HTMLElementEventMap>(
    event: K, 
    handler: (e: HTMLElementEventMap[K]) => void, 
    options?: AddEventListenerOptions
  ): void {
    const bound = handler.bind(this) as EventListener;
    this.boundHandlers.set(event, bound);
    this.target.addEventListener(event, bound, options);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Region Management (Delegates to HitTester)
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Register an interactive region
   */
  register(
    id: string,
    bounds: Rect,
    handlers: RegionEventHandlers = {},
    options: Partial<Pick<InteractiveRegion, 'zIndex' | 'cursor' | 'enabled' | 'hitTest' | 'data'>> = {}
  ): InteractiveRegion {
    return this.hitTester.register(id, bounds, handlers, options);
  }
  
  /**
   * Unregister a region
   */
  unregister(id: string): boolean {
    // Clear hover if this was the hovered region
    if (this.hoveredRegion?.id === id) {
      this.hoveredRegion = null;
    }
    if (this.dragRegion?.id === id) {
      this.cancelDrag();
    }
    return this.hitTester.unregister(id);
  }
  
  /**
   * Update a region's bounds
   */
  updateBounds(id: string, bounds: Rect): void {
    this.hitTester.updateBounds(id, bounds);
  }
  
  /**
   * Update a region's z-index
   */
  updateZIndex(id: string, zIndex: number): void {
    this.hitTester.updateZIndex(id, zIndex);
  }
  
  /**
   * Enable or disable a region
   */
  setEnabled(id: string, enabled: boolean): void {
    this.hitTester.setEnabled(id, enabled);
  }
  
  /**
   * Clear all regions
   */
  clearRegions(): void {
    this.hoveredRegion = null;
    this.cancelDrag();
    this.hitTester.clear();
  }
  
  /**
   * Get a region by ID
   */
  getRegion(id: string): InteractiveRegion | undefined {
    return this.hitTester.get(id);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Global Event Handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Add a global event handler
   */
  on<E extends AnyInputEvent>(type: string, handler: EventHandler<E>): () => void {
    if (!this.globalHandlers.has(type)) {
      this.globalHandlers.set(type, new Set());
    }
    this.globalHandlers.get(type)!.add(handler as EventHandler);
    
    // Return unsubscribe function
    return () => {
      this.globalHandlers.get(type)?.delete(handler as EventHandler);
    };
  }
  
  /**
   * Remove a global event handler
   */
  off(type: string, handler: EventHandler): void {
    this.globalHandlers.get(type)?.delete(handler);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // State Accessors
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get current pointer state
   */
  getPointer(): Readonly<PointerState> {
    return this.pointer;
  }
  
  /**
   * Get currently hovered region
   */
  getHoveredRegion(): InteractiveRegion | null {
    return this.hoveredRegion;
  }
  
  /**
   * Check if dragging is active
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }
  
  /**
   * Get the region count
   */
  getRegionCount(): number {
    return this.hitTester.count;
  }
  
  /**
   * Set pixel ratio (call when canvas resizes)
   */
  setPixelRatio(ratio: number): void {
    this.options.pixelRatio = ratio;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Coordinate Conversion
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Convert DOM event coordinates to canvas coordinates
   */
  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.target.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * this.options.pixelRatio,
      y: (clientY - rect.top) * this.options.pixelRatio,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Event Dispatch
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Dispatch event to global handlers and region handlers
   */
  private dispatch<E extends AnyInputEvent>(event: E, region?: InteractiveRegion | null): void {
    // Global handlers first
    const handlers = this.globalHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        if (event.consumed) break;
        handler(event);
      }
    }
    
    // Region handler
    if (!event.consumed && region?.handlers) {
      const handlerName = this.getHandlerName(event.type);
      const handler = region.handlers[handlerName as keyof RegionEventHandlers];
      if (handler) {
        (handler as EventHandler<E>)(event);
      }
    }
  }
  
  /**
   * Map event type to handler name
   */
  private getHandlerName(type: string): string {
    const map: Record<string, string> = {
      'pointerenter': 'onPointerEnter',
      'pointerleave': 'onPointerLeave',
      'pointermove': 'onPointerMove',
      'pointerdown': 'onPointerDown',
      'pointerup': 'onPointerUp',
      'click': 'onClick',
      'dblclick': 'onDoubleClick',
      'contextmenu': 'onContextMenu',
      'dragstart': 'onDragStart',
      'drag': 'onDrag',
      'dragend': 'onDragEnd',
      'scroll': 'onScroll',
    };
    return map[type] || `on${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Pointer Event Creation
  // ─────────────────────────────────────────────────────────────────────────
  
  private createPointerEvent(
    type: PointerEvent['type'],
    button: PointerEvent['button'] = null,
    targetId: string | null = null
  ): PointerEvent {
    return {
      ...createBaseEvent(type, targetId),
      type,
      pointer: { ...this.pointer },
      button,
      deltaX: this.pointer.x - this.pointer.prevX,
      deltaY: this.pointer.y - this.pointer.prevY,
    } as PointerEvent;
  }
  
  private createClickEvent(
    type: ClickEvent['type'],
    targetId: string | null = null
  ): ClickEvent {
    return {
      ...createBaseEvent(type, targetId),
      type,
      pointer: { ...this.pointer },
      x: this.pointer.x,
      y: this.pointer.y,
    } as ClickEvent;
  }
  
  private createDragEvent(type: DragEvent['type']): DragEvent {
    return {
      ...createBaseEvent(type, this.dragRegion?.id ?? null),
      type,
      pointer: { ...this.pointer },
      x: this.pointer.x,
      y: this.pointer.y,
      startX: this.dragStartX,
      startY: this.dragStartY,
      totalDeltaX: this.pointer.x - this.dragStartX,
      totalDeltaY: this.pointer.y - this.dragStartY,
    } as DragEvent;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Mouse Event Handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleMouseDown = (e: MouseEvent): void => {
    const coords = this.toCanvasCoords(e.clientX, e.clientY);
    this.updatePointerPosition(coords.x, coords.y);
    
    this.pointer.buttons.primary = e.button === 0 ? 'down' : this.pointer.buttons.primary;
    this.pointer.buttons.secondary = e.button === 2 ? 'down' : this.pointer.buttons.secondary;
    this.pointer.buttons.auxiliary = e.button === 1 ? 'down' : this.pointer.buttons.auxiliary;
    this.pointer.active = true;
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    const button = e.button === 0 ? 'primary' : e.button === 2 ? 'secondary' : 'auxiliary';
    
    // Create and dispatch event
    const event = this.createPointerEvent('pointerdown', button, hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    // Track potential drag
    if (e.button === 0 && hitResult.region) {
      this.potentialDrag = true;
      this.dragStartX = coords.x;
      this.dragStartY = coords.y;
      this.dragRegion = hitResult.region;
    }
  };
  
  private handleMouseUp = (e: MouseEvent): void => {
    const coords = this.toCanvasCoords(e.clientX, e.clientY);
    this.updatePointerPosition(coords.x, coords.y);
    
    const wasDown = this.pointer.buttons.primary === 'down' && e.button === 0;
    
    this.pointer.buttons.primary = e.button === 0 ? 'up' : this.pointer.buttons.primary;
    this.pointer.buttons.secondary = e.button === 2 ? 'up' : this.pointer.buttons.secondary;
    this.pointer.buttons.auxiliary = e.button === 1 ? 'up' : this.pointer.buttons.auxiliary;
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    const button = e.button === 0 ? 'primary' : e.button === 2 ? 'secondary' : 'auxiliary';
    
    // End drag if active
    if (this.isDragging && e.button === 0) {
      this.endDrag();
    }
    
    // Create and dispatch pointer up event
    const event = this.createPointerEvent('pointerup', button, hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    // Generate click event if applicable
    if (wasDown && e.button === 0 && !this.isDragging) {
      this.handleClick(hitResult.region, coords.x, coords.y);
    }
    
    this.potentialDrag = false;
    this.dragRegion = null;
  };
  
  private handleMouseMove = (e: MouseEvent): void => {
    const coords = this.toCanvasCoords(e.clientX, e.clientY);
    this.updatePointerPosition(coords.x, coords.y);
    
    // Check for drag start
    if (this.potentialDrag && !this.isDragging) {
      const dx = coords.x - this.dragStartX;
      const dy = coords.y - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= this.options.dragThreshold) {
        this.startDrag();
      }
    }
    
    // Handle drag
    if (this.isDragging) {
      const event = this.createDragEvent('drag');
      this.dispatch(event, this.dragRegion);
      return;
    }
    
    // Hit test and update hover
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    this.updateHover(hitResult.region);
    
    // Dispatch pointer move
    const event = this.createPointerEvent('pointermove', null, hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    // Update cursor
    this.updateCursor(hitResult.region?.cursor ?? 'default');
  };
  
  private handleMouseLeave = (_e: MouseEvent): void => {
    this.pointer.active = false;
    this.updateHover(null);
    this.updateCursor('default');
    
    if (this.isDragging) {
      this.endDrag();
    }
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Hover Management
  // ─────────────────────────────────────────────────────────────────────────
  
  private updateHover(newRegion: InteractiveRegion | null): void {
    if (this.hoveredRegion === newRegion) return;
    
    const oldRegion = this.hoveredRegion;
    this.hoveredRegion = newRegion;
    
    // Dispatch leave event
    if (oldRegion) {
      const leaveEvent = this.createPointerEvent('pointerleave', null, oldRegion.id);
      this.dispatch(leaveEvent, oldRegion);
    }
    
    // Dispatch enter event
    if (newRegion) {
      const enterEvent = this.createPointerEvent('pointerenter', null, newRegion.id);
      this.dispatch(enterEvent, newRegion);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Drag Management
  // ─────────────────────────────────────────────────────────────────────────
  
  private startDrag(): void {
    if (!this.dragRegion) return;
    
    this.isDragging = true;
    this.potentialDrag = false;
    
    const event = this.createDragEvent('dragstart');
    this.dispatch(event, this.dragRegion);
    
    this.updateCursor('grabbing');
  }
  
  private endDrag(): void {
    if (!this.isDragging) return;
    
    const event = this.createDragEvent('dragend');
    this.dispatch(event, this.dragRegion);
    
    this.isDragging = false;
    this.dragRegion = null;
    
    this.updateCursor(this.hoveredRegion?.cursor ?? 'default');
  }
  
  private cancelDrag(): void {
    this.isDragging = false;
    this.potentialDrag = false;
    this.dragRegion = null;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Click Handling
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleClick(region: InteractiveRegion | null, x: number, y: number): void {
    const now = performance.now();
    const timeSinceLastClick = now - this.lastClickTime;
    const distance = Math.sqrt(
      Math.pow(x - this.lastClickX, 2) + 
      Math.pow(y - this.lastClickY, 2)
    );
    
    // Check for double click
    if (timeSinceLastClick < this.options.doubleClickTime && distance < 10) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    
    this.lastClickTime = now;
    this.lastClickX = x;
    this.lastClickY = y;
    
    // Dispatch click event
    const clickEvent = this.createClickEvent('click', region?.id ?? null);
    this.dispatch(clickEvent, region);
    
    // Dispatch double click if applicable
    if (this.clickCount === 2) {
      const dblClickEvent = this.createClickEvent('dblclick', region?.id ?? null);
      this.dispatch(dblClickEvent, region);
      this.clickCount = 0;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Context Menu
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleContextMenu = (e: MouseEvent): void => {
    const coords = this.toCanvasCoords(e.clientX, e.clientY);
    this.updatePointerPosition(coords.x, coords.y);
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    
    if (hitResult.region?.handlers.onContextMenu) {
      e.preventDefault();
      const event = this.createClickEvent('contextmenu', hitResult.region.id);
      this.dispatch(event, hitResult.region);
    }
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Wheel/Scroll
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleWheel = (e: WheelEvent): void => {
    const coords = this.toCanvasCoords(e.clientX, e.clientY);
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    
    const event: ScrollEvent = {
      ...createBaseEvent('scroll', hitResult.region?.id ?? null),
      type: 'scroll',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: 0,
      mode: e.deltaMode === 0 ? 'pixel' : e.deltaMode === 1 ? 'line' : 'page',
      x: coords.x,
      y: coords.y,
    } as ScrollEvent;
    
    this.dispatch(event, hitResult.region);
    
    if (event.consumed) {
      e.preventDefault();
    }
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Touch Events (Basic Support)
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const coords = this.toCanvasCoords(touch.clientX, touch.clientY);
    
    this.pointer.source = 'touch';
    this.pointer.id = touch.identifier;
    this.updatePointerPosition(coords.x, coords.y);
    this.pointer.buttons.primary = 'down';
    this.pointer.active = true;
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    
    const event = this.createPointerEvent('pointerdown', 'primary', hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    if (hitResult.region) {
      this.potentialDrag = true;
      this.dragStartX = coords.x;
      this.dragStartY = coords.y;
      this.dragRegion = hitResult.region;
    }
    
    e.preventDefault();
  };
  
  private handleTouchEnd = (e: TouchEvent): void => {
    const coords = { x: this.pointer.x, y: this.pointer.y };
    
    const wasDown = this.pointer.buttons.primary === 'down';
    this.pointer.buttons.primary = 'up';
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    
    if (this.isDragging) {
      this.endDrag();
    }
    
    const event = this.createPointerEvent('pointerup', 'primary', hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    if (wasDown && !this.isDragging) {
      this.handleClick(hitResult.region, coords.x, coords.y);
    }
    
    this.potentialDrag = false;
    this.dragRegion = null;
    this.pointer.active = false;
  };
  
  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const coords = this.toCanvasCoords(touch.clientX, touch.clientY);
    this.updatePointerPosition(coords.x, coords.y);
    
    // Check for drag start
    if (this.potentialDrag && !this.isDragging) {
      const dx = coords.x - this.dragStartX;
      const dy = coords.y - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= this.options.dragThreshold) {
        this.startDrag();
      }
    }
    
    if (this.isDragging) {
      const event = this.createDragEvent('drag');
      this.dispatch(event, this.dragRegion);
      e.preventDefault();
      return;
    }
    
    const hitResult = this.hitTester.hitTest(coords.x, coords.y);
    const event = this.createPointerEvent('pointermove', null, hitResult.region?.id ?? null);
    this.dispatch(event, hitResult.region);
    
    e.preventDefault();
  };
  
  private handleTouchCancel = (_e: TouchEvent): void => {
    this.cancelDrag();
    this.pointer.buttons.primary = 'up';
    this.pointer.active = false;
    this.updateHover(null);
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Events
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleKeyDown = (e: globalThis.KeyboardEvent): void => {
    const event: KeyboardEvent = {
      ...createBaseEvent('keydown'),
      type: 'keydown',
      key: e.key,
      code: e.code,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
      repeat: e.repeat,
    } as KeyboardEvent;
    
    // Dispatch to global handlers
    const handlers = this.globalHandlers.get('keydown');
    if (handlers) {
      for (const handler of handlers) {
        if (event.consumed) break;
        handler(event);
      }
    }
    
    if (event.consumed) {
      e.preventDefault();
    }
  };
  
  private handleKeyUp = (e: globalThis.KeyboardEvent): void => {
    const event: KeyboardEvent = {
      ...createBaseEvent('keyup'),
      type: 'keyup',
      key: e.key,
      code: e.code,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
      repeat: false,
    } as KeyboardEvent;
    
    const handlers = this.globalHandlers.get('keyup');
    if (handlers) {
      for (const handler of handlers) {
        if (event.consumed) break;
        handler(event);
      }
    }
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────
  
  private updatePointerPosition(x: number, y: number): void {
    this.pointer.prevX = this.pointer.x;
    this.pointer.prevY = this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.timestamp = performance.now();
  }
  
  private updateCursor(cursor: CursorType): void {
    if (this.target.style.cursor !== cursor) {
      this.target.style.cursor = cursor;
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Factory Function
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create an input manager for a target element
 */
export function createInputManager(options: InputManagerOptions): InputManager {
  return new InputManager(options);
}
