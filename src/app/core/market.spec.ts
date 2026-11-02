import { TestBed } from '@angular/core/testing';
import { MarketFeed, createInstruments, mulberry32, nextSnapshot } from './market';

describe('market data', () => {
  it('is deterministic for a seed', () => {
    expect(createInstruments(50)).toEqual(createInstruments(50));
    expect(createInstruments(3).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('returns new objects on every snapshot, like a fresh API response', () => {
    const rows = createInstruments(200);
    const next = nextSnapshot(rows, mulberry32(1));
    expect(next).toHaveLength(200);
    expect(next.every((r, i) => r !== rows[i] && r.id === rows[i].id)).toBe(true);
    const moved = next.filter((r, i) => r.price !== rows[i].price).length;
    expect(moved).toBeGreaterThan(10);
    expect(moved).toBeLessThan(60);
  });
});

describe('MarketFeed', () => {
  let feed: MarketFeed;
  beforeEach(() => (feed = TestBed.inject(MarketFeed)));
  afterEach(() => feed.stop());

  it('counts live subscriptions so leaks are visible', () => {
    const a = feed.ticks$.subscribe();
    const b = feed.ticks$.subscribe();
    expect(feed.activeSubscriptions()).toBe(2);
    a.unsubscribe();
    expect(feed.activeSubscriptions()).toBe(1);
    b.unsubscribe();
    expect(feed.activeSubscriptions()).toBe(0);
  });

  it('pushes each tick to subscribers and can release leaked ones', () => {
    const seen: number[] = [];
    feed.ticks$.subscribe((rows) => seen.push(rows.length));
    feed.tick();
    feed.tick();
    expect(seen).toEqual([2000, 2000]);
    expect(feed.tickCount()).toBe(2);
    feed.releaseAllSubscribers();
    expect(feed.activeSubscriptions()).toBe(0);
  });

  it('resizes the market', () => {
    feed.setSize(1000);
    expect(feed.size()).toBe(1000);
  });
});
