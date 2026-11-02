import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Metrics } from './metrics';

export interface Instrument {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  open: number;
  volume: number;
}

const SECTORS = [
  'Tech',
  'Energy',
  'Health',
  'Finance',
  'Retail',
  'Industrial',
  'Utilities',
  'Media',
];
const WORDS = [
  'North',
  'Blue',
  'Apex',
  'Vertex',
  'Silver',
  'Harbor',
  'Summit',
  'Nova',
  'Pioneer',
  'Crest',
  'Atlas',
  'Delta',
];
const KINDS = [
  'Systems',
  'Labs',
  'Energy',
  'Health',
  'Capital',
  'Foods',
  'Motors',
  'Networks',
  'Bio',
  'Logistics',
];

/** Small seeded PRNG so every visitor (and every test) sees the same market. */
export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInstruments(count: number, seed = 7): Instrument[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = WORDS[Math.floor(rand() * WORDS.length)];
    const b = KINDS[Math.floor(rand() * KINDS.length)];
    const open = Math.round((5 + rand() * 495) * 100) / 100;
    return {
      id: i + 1,
      symbol: (a.slice(0, 2) + b.slice(0, 2)).toUpperCase() + (i % 100).toString().padStart(2, '0'),
      name: `${a} ${b}`,
      sector: SECTORS[Math.floor(rand() * SECTORS.length)],
      price: open,
      open,
      volume: Math.floor(rand() * 2_000_000),
    };
  });
}

/**
 * Simulates polling an API: every tick returns a brand-new array of brand-new
 * objects (like a fresh JSON response), with ~15% of prices moved.
 */
export function nextSnapshot(
  rows: readonly Instrument[],
  rand: () => number,
  moveRatio = 0.15,
): Instrument[] {
  return rows.map((r) => {
    if (rand() > moveRatio) return { ...r };
    const price = Math.max(1, Math.round(r.price * (1 + (rand() - 0.5) * 0.02) * 100) / 100);
    return { ...r, price, volume: r.volume + Math.floor(rand() * 5_000) };
  });
}

@Injectable({ providedIn: 'root' })
export class MarketFeed {
  private readonly metrics = inject(Metrics);
  private readonly rand = mulberry32(99);
  private ticks = new Subject<Instrument[]>();
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly rows = signal<Instrument[]>(createInstruments(2000));
  readonly running = signal(false);
  readonly tickCount = signal(0);
  /** Subscriptions to ticks$ that are still alive. Leaks show up here. */
  readonly activeSubscriptions = signal(0);
  readonly size = computed(() => this.rows().length);

  /** Every subscriber is counted while subscribed, so leaks are visible. */
  readonly ticks$ = new Observable<Instrument[]>((subscriber) => {
    this.activeSubscriptions.update((n) => n + 1);
    const sub = this.ticks.subscribe(subscriber);
    return () => {
      sub.unsubscribe();
      this.activeSubscriptions.update((n) => n - 1);
    };
  });

  setSize(count: number): void {
    this.rows.set(createInstruments(count));
  }

  tick(): void {
    this.metrics.markTick();
    const next = nextSnapshot(this.rows(), this.rand);
    this.rows.set(next);
    this.tickCount.update((n) => n + 1);
    this.ticks.next(next);
  }

  /** Lab-only escape hatch: completes the feed so every subscriber, leaked or not, is released. */
  releaseAllSubscribers(): void {
    const old = this.ticks;
    this.ticks = new Subject<Instrument[]>();
    old.complete();
  }

  start(intervalMs = 250): void {
    this.stop();
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.running.set(true);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running.set(false);
  }
}
