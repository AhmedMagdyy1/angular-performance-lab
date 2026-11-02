import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { ChangePipe, PricePipe, VolumePipe } from '../core/format';
import { LabSettings } from '../core/lab-settings';
import { Instrument, MarketFeed } from '../core/market';
import { Metrics } from '../core/metrics';

@Component({
  selector: 'lab-market-grid',
  imports: [ScrollingModule, NgTemplateOutlet, PricePipe, ChangePipe, VolumePipe],
  templateUrl: './market-grid.html',
  styleUrl: './market-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketGrid {
  protected readonly feed = inject(MarketFeed);
  protected readonly fixes = inject(LabSettings).fixes;
  protected readonly rows = this.feed.rows;
  protected readonly rowHeight = 36;

  /** Fix 1: the tracking key. Object identity (slow) vs a stable id (fast). */
  protected readonly trackKey = computed(() =>
    this.fixes().trackById ? (row: Instrument) => row.id : (row: Instrument) => row,
  );
  protected readonly trackBy = (_: number, row: Instrument) => this.trackKey()(row);

  constructor() {
    // Count elements Angular inserts, to show when rows are rebuilt instead of patched.
    const metrics = inject(Metrics);
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new MutationObserver((records) => {
        let added = 0;
        for (const r of records)
          for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) added++;
        metrics.countAdded(added);
      });
      observer.observe(host, { childList: true, subtree: true });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // Fix 2, "before": methods called from the template. They run for every row on
  // every change detection, and each call builds a new formatter, as often seen in real apps.
  protected formatPrice(row: Instrument): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.price);
  }
  protected changeOf(row: Instrument): string {
    const pct = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      signDisplay: 'always',
    });
    return pct.format((row.price - row.open) / row.open);
  }
  protected volumeOf(row: Instrument): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
      row.volume,
    );
  }
}
