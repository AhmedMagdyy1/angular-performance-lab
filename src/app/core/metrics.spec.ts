import { TestBed } from '@angular/core/testing';
import { Metrics } from './metrics';

describe('Metrics', () => {
  it('measures render time and inserted elements per tick', async () => {
    const m = TestBed.inject(Metrics);
    m.onRendered(); // no pending tick: ignored
    expect(m.renderMs()).toBe(0);

    m.markTick();
    m.countAdded(30);
    m.onRendered(performance.now() + 10);
    await Promise.resolve();
    expect(m.renderMs()).toBeGreaterThanOrEqual(10);
    expect(m.nodesPerTick()).toBe(30);

    m.reset();
    expect(m.nodesPerTick()).toBe(0);
  });
});
