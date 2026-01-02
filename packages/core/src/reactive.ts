// ═══════════════════════════════════════════════════════════════════════════
// @ciaui/core - Reactive System
// 
// A signal-based reactive system with automatic dependency tracking.
// Inspired by SolidJS/Vue 3 reactivity but designed for our needs.
// ═══════════════════════════════════════════════════════════════════════════

import type { EffectCallback, EffectOptions, EffectCleanup } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Internal Types
// ───────────────────────────────────────────────────────────────────────────

type Subscriber = () => void;
type CleanupFn = () => void;

interface Signal<T> {
  __signal: true;
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  subscribe: (fn: Subscriber) => CleanupFn;
  peek: () => T;  // Read without tracking
}

interface EffectState {
  execute: () => void;
  cleanup?: EffectCleanup;
  dependencies: Set<Signal<any>>;
  options?: EffectOptions;
}

// ───────────────────────────────────────────────────────────────────────────
// Global State
// ───────────────────────────────────────────────────────────────────────────

// The currently executing effect (for auto-tracking)
let currentEffect: EffectState | null = null;

// Batch update queue
let batchDepth = 0;
const pendingEffects = new Set<EffectState>();

// Component context stack (for hooks)
interface ComponentContext {
  signals: Signal<any>[];
  effects: EffectState[];
  cleanups: CleanupFn[];
  refs: { current: unknown }[];
  signalIndex: number;
  effectIndex: number;
  refIndex: number;
}

const contextStack: ComponentContext[] = [];

function getCurrentContext(): ComponentContext {
  const ctx = contextStack[contextStack.length - 1];
  if (!ctx) {
    throw new Error(
      'Hooks can only be called inside a component setup() or render function. ' +
      'Make sure you\'re not calling hooks conditionally or in callbacks.'
    );
  }
  return ctx;
}

// ───────────────────────────────────────────────────────────────────────────
// Signal Implementation
// ───────────────────────────────────────────────────────────────────────────

function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<Subscriber>();
  
  const signal: Signal<T> = {
    __signal: true,
    
    get() {
      // Auto-track: if we're inside an effect, register this signal as a dependency
      if (currentEffect) {
        currentEffect.dependencies.add(signal as Signal<any>);
        subscribers.add(currentEffect.execute);
      }
      return value;
    },
    
    set(newValue: T | ((prev: T) => T)) {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue;
      
      // Only update if value changed (shallow comparison)
      if (!Object.is(value, nextValue)) {
        value = nextValue;
        
        // Notify subscribers
        if (batchDepth > 0) {
          // Inside a batch - queue effects
          subscribers.forEach(fn => {
            const effect = [...pendingEffects].find(e => e.execute === fn);
            if (effect) pendingEffects.add(effect);
          });
        } else {
          // Immediate execution
          subscribers.forEach(fn => fn());
        }
      }
    },
    
    subscribe(fn: Subscriber) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    
    peek() {
      // Read without tracking
      return value;
    },
  };
  
  return signal;
}

// ───────────────────────────────────────────────────────────────────────────
// Effect Implementation
// ───────────────────────────────────────────────────────────────────────────

function createEffect(callback: EffectCallback, options?: EffectOptions): CleanupFn {
  const effectState: EffectState = {
    execute: () => {},
    cleanup: undefined,
    dependencies: new Set(),
    options,
  };
  
  effectState.execute = () => {
    // Skip if condition not met
    if (options?.when === false) return;
    
    // Run cleanup from previous execution
    if (effectState.cleanup) {
      effectState.cleanup();
      effectState.cleanup = undefined;
    }
    
    // Clear old dependencies
    effectState.dependencies.clear();
    
    // Set as current effect for auto-tracking
    const prevEffect = currentEffect;
    
    // Only auto-track if not in manual mode
    if (!options?.manual) {
      currentEffect = effectState;
    }
    
    try {
      // Execute the effect
      const result = callback();
      
      // Handle cleanup function or promise
      if (typeof result === 'function') {
        effectState.cleanup = result;
      }
      
      // Add explicit track dependencies
      if (options?.track) {
        options.track.forEach(dep => {
          if (dep && typeof dep === 'object' && '__signal' in dep) {
            effectState.dependencies.add(dep as Signal<unknown>);
          }
        });
      }
      
    } finally {
      currentEffect = prevEffect;
    }
  };
  
  // Handle debounce/throttle
  let actualExecute = effectState.execute;
  
  if (options?.debounce) {
    let timeoutId: ReturnType<typeof setTimeout>;
    const originalExecute = effectState.execute;
    actualExecute = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(originalExecute, options.debounce);
    };
    effectState.execute = actualExecute;
  }
  
  if (options?.throttle) {
    let lastRun = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const originalExecute = effectState.execute;
    actualExecute = () => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun;
      
      if (timeSinceLastRun >= options.throttle!) {
        lastRun = now;
        originalExecute();
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastRun = Date.now();
          originalExecute();
        }, options.throttle! - timeSinceLastRun);
      }
    };
    effectState.execute = actualExecute;
  }
  
  // Initial execution
  effectState.execute();
  
  // Handle interval
  let intervalId: ReturnType<typeof setInterval>;
  if (options?.interval) {
    intervalId = setInterval(effectState.execute, options.interval);
  }
  
  // Return cleanup function
  return () => {
    if (effectState.cleanup) {
      effectState.cleanup();
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
    effectState.dependencies.clear();
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Batching
// ───────────────────────────────────────────────────────────────────────────

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      // Execute all pending effects
      const effects = [...pendingEffects];
      pendingEffects.clear();
      effects.forEach(effect => effect.execute());
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Public Hook API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create reactive state.
 * 
 * @example
 * const [count, setCount] = useState(0);
 * setCount(count + 1);
 * setCount(prev => prev + 1);
 */
export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  const ctx = getCurrentContext();
  
  // Check if we already have a signal at this index
  let signal = ctx.signals[ctx.signalIndex] as Signal<T> | undefined;
  
  if (!signal) {
    // First render - create the signal
    const initialValue = typeof initial === 'function' 
      ? (initial as () => T)() 
      : initial;
    signal = createSignal(initialValue);
    ctx.signals[ctx.signalIndex] = signal;
  }
  
  ctx.signalIndex++;
  
  // Return tuple that looks like React's useState
  return [signal.get(), signal.set];
}

/**
 * Run side effects with automatic dependency tracking.
 * 
 * @example
 * // Auto-tracked
 * useEffect(() => {
 *   console.log(count); // Re-runs when count changes
 * });
 * 
 * // With options
 * useEffect(async () => {
 *   const data = await fetch(`/api/${id}`);
 * }, { track: [id], debounce: 300 });
 */
export function useEffect(callback: EffectCallback, options?: EffectOptions): void {
  const ctx = getCurrentContext();
  
  // Check if we already have an effect at this index
  let effectEntry = ctx.effects[ctx.effectIndex];
  
  if (!effectEntry) {
    // First render - create the effect
    const cleanup = createEffect(callback, options);
    ctx.effects[ctx.effectIndex] = { execute: () => {}, cleanup: undefined, dependencies: new Set(), options };
    ctx.cleanups.push(cleanup);
  }
  
  ctx.effectIndex++;
}

/**
 * Create a computed value with automatic memoization.
 * 
 * @example
 * const fullName = useComputed(() => `${firstName} ${lastName}`);
 */
export function useComputed<T>(compute: () => T, options?: { equals?: (a: T, b: T) => boolean }): T {
  const ctx = getCurrentContext();
  
  // Use a signal to store the computed value
  let signal = ctx.signals[ctx.signalIndex] as Signal<T> | undefined;
  
  if (!signal) {
    // First render - create signal and effect to update it
    const initialValue = compute();
    signal = createSignal(initialValue);
    ctx.signals[ctx.signalIndex] = signal;
    
    // Create effect that updates the signal when dependencies change
    const equals = options?.equals ?? Object.is;
    createEffect(() => {
      const newValue = compute();
      const currentValue = signal!.peek();
      if (!equals(currentValue, newValue)) {
        signal!.set(newValue);
      }
    });
  }
  
  ctx.signalIndex++;
  
  return signal.get();
}

/**
 * Create a ref (mutable container that doesn't trigger updates).
 * 
 * @example
 * const inputRef = useRef<HTMLInputElement>(null);
 */
export function useRef<T>(initial: T): { current: T } {
  const ctx = getCurrentContext();
  
  let ref = ctx.refs[ctx.refIndex] as { current: T } | undefined;
  
  if (!ref) {
    ref = { current: initial };
    ctx.refs[ctx.refIndex] = ref;
  }
  
  ctx.refIndex++;
  
  return ref;
}

// ───────────────────────────────────────────────────────────────────────────
// Context Management (for component rendering)
// ───────────────────────────────────────────────────────────────────────────

export function pushComponentContext(): ComponentContext {
  const ctx: ComponentContext = {
    signals: [],
    effects: [],
    cleanups: [],
    refs: [],
    signalIndex: 0,
    effectIndex: 0,
    refIndex: 0,
  };
  contextStack.push(ctx);
  return ctx;
}

export function popComponentContext(): ComponentContext | undefined {
  return contextStack.pop();
}

export function resetContextIndices(): void {
  const ctx = contextStack[contextStack.length - 1];
  if (ctx) {
    ctx.signalIndex = 0;
    ctx.effectIndex = 0;
    ctx.refIndex = 0;
  }
}

export function cleanupComponentContext(ctx: ComponentContext): void {
  ctx.cleanups.forEach(cleanup => cleanup());
  ctx.cleanups = [];
  ctx.effects = [];
}

// ───────────────────────────────────────────────────────────────────────────
// Utility: Untrack
// ───────────────────────────────────────────────────────────────────────────

/**
 * Read reactive values without creating a dependency.
 * 
 * @example
 * useEffect(() => {
 *   // mousePos is read but won't cause re-runs
 *   const pos = untrack(() => mousePos);
 *   logClick(pos);
 * });
 */
export function untrack<T>(fn: () => T): T {
  const prevEffect = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
  }
}
