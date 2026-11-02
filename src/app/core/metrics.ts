import { Injectable, computed, signal } from '@angular/core';

const WINDOW = 20;

function average(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Live performance numbers shown in the metrics bar. */
@Injectable({ providedIn: 'root' })
export class Metrics {
  readonly fps = signal(0);
  readonly domNodes = signal(0);
  private readonly renders = signal<number[]>([]);
  private readonly created = signal<number[]>([]);

  /** Average ms from a price update until Angular finished rendering it. */
  readonly renderMs = computed(() => average(this.renders()));
  /** Average DOM nodes inserted per update. 0 means rows were patched in place. */
  readonly nodesPerTick = computed(() => average(this.created()));

  private pendingTickAt: number | null = null;
  private addedSinceTick = 0;
  private started = false;

  markTick(): void {
    this.pendingTickAt = performance.now();
    this.addedSinceTick = 0;
  }

  /** Called after every Angular render; closes out the pending tick, if any. */
  onRendered(now = performance.now()): void {
    if (this.pendingTickAt === null) return;
    const ms = now - this.pendingTickAt;
    this.pendingTickAt = null;
    this.renders.update((r) => [...r, ms].slice(-WINDOW));
    // MutationObserver callbacks for this render are already queued as microtasks; read after them.
    queueMicrotask(() => this.created.update((c) => [...c, this.addedSinceTick].slice(-WINDOW)));
  }

  countAdded(nodes: number): void {
    this.addedSinceTick += nodes;
  }

  reset(): void {
    this.renders.set([]);
    this.created.set([]);
  }

  /** Starts the FPS / DOM size sampler (browser only). */
  start(): void {
    if (this.started) return;
    this.started = true;
    let frames = 0;
    let windowStart = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - windowStart >= 1000) {
        this.fps.set(Math.round((frames * 1000) / (now - windowStart)));
        this.domNodes.set(document.getElementsByTagName('*').length);
        frames = 0;
        windowStart = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
