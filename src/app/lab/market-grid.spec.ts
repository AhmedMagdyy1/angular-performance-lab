import { TestBed } from '@angular/core/testing';
import { LabSettings } from '../core/lab-settings';
import { MarketFeed } from '../core/market';
import { MarketGrid } from './market-grid';

async function renderGrid() {
  const fixture = TestBed.createComponent(MarketGrid);
  const feed = TestBed.inject(MarketFeed);
  feed.setSize(50);
  await fixture.whenStable();
  const rows = () => [...fixture.nativeElement.querySelectorAll('.body .row')] as HTMLElement[];
  return { fixture, feed, rows };
}

describe('MarketGrid', () => {
  it('rebuilds every row on a poll when tracking by object identity (the bug)', async () => {
    const { fixture, feed, rows } = await renderGrid();
    const before = rows();
    expect(before).toHaveLength(50);
    feed.tick();
    await fixture.whenStable();
    expect(rows().filter((r, i) => r === before[i])).toHaveLength(0);
  });

  it('keeps the same row elements when tracking by id (fix 1)', async () => {
    TestBed.inject(LabSettings).toggle('trackById');
    const { fixture, feed, rows } = await renderGrid();
    const before = rows();
    feed.tick();
    await fixture.whenStable();
    expect(rows().every((r, i) => r === before[i])).toBe(true);
  });

  it('renders the same text with methods and with pure pipes (fix 2)', async () => {
    const { fixture, rows } = await renderGrid();
    const slow = rows()[3].textContent;
    TestBed.inject(LabSettings).toggle('purePipes');
    await fixture.whenStable();
    expect(rows()[3].textContent).toBe(slow);
  });
});
