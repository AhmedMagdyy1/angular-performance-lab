import { TestBed } from '@angular/core/testing';
import { LabSettings } from '../core/lab-settings';
import { MarketFeed } from '../core/market';
import { DetailPanel } from './detail-panel';

describe('DetailPanel subscription', () => {
  it('leaks a subscription per open/close without the fix', () => {
    const feed = TestBed.inject(MarketFeed);
    for (let i = 0; i < 3; i++) TestBed.createComponent(DetailPanel).destroy();
    expect(feed.activeSubscriptions()).toBe(3);
  });

  it('releases it on destroy with takeUntilDestroyed (fix 4)', () => {
    const feed = TestBed.inject(MarketFeed);
    TestBed.inject(LabSettings).toggle('unsubscribe');
    for (let i = 0; i < 3; i++) TestBed.createComponent(DetailPanel).destroy();
    expect(feed.activeSubscriptions()).toBe(0);
  });

  it('shows the top movers after an update', async () => {
    const fixture = TestBed.createComponent(DetailPanel);
    TestBed.inject(MarketFeed).tick();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(8);
  });
});
