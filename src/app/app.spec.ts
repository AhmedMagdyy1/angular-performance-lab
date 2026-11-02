import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { MarketFeed } from './core/market';

describe('App', () => {
  afterEach(() => TestBed.inject(MarketFeed).stop());

  it('renders the lab with four fixes, all off by default', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Angular Performance Lab');
    const switches = [...el.querySelectorAll('[role=switch]')];
    expect(switches).toHaveLength(4);
    expect(switches.every((s) => s.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('opening and closing the panel leaks subscriptions until fix 4 is on', async () => {
    const fixture = TestBed.createComponent(App);
    const feed = TestBed.inject(MarketFeed);
    await fixture.componentInstance.cyclePanel(2);
    expect(feed.activeSubscriptions()).toBe(2);
  });
});
