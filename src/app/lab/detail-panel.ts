import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangePipe, PricePipe, changeRatio } from '../core/format';
import { LabSettings } from '../core/lab-settings';
import { Instrument, MarketFeed } from '../core/market';

/** "Top movers" side panel. Its subscription is the memory-leak demo. */
@Component({
  selector: 'lab-detail-panel',
  imports: [PricePipe, ChangePipe],
  template: `
    <h3>Top movers</h3>
    <ol>
      @for (row of movers(); track row.id) {
        <li>
          <span class="sym">{{ row.symbol }}</span>
          <span>{{ row.price | price }}</span>
          <span [class]="row.price >= row.open ? 'up' : 'down'">{{
            row.price | change: row.open
          }}</span>
        </li>
      } @empty {
        <li class="muted">Waiting for the next update…</li>
      }
    </ol>
  `,
  styleUrl: './detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPanel {
  protected readonly movers = signal<Instrument[]>([]);

  constructor() {
    const feed = inject(MarketFeed);
    const fixed = inject(LabSettings).fixes().unsubscribe;
    const source = fixed ? feed.ticks$.pipe(takeUntilDestroyed(inject(DestroyRef))) : feed.ticks$;

    // Sorting every row on every update is real work, so each leaked copy costs CPU.
    source.subscribe((rows) => {
      const top = [...rows]
        .sort((a, b) => Math.abs(changeRatio(b)) - Math.abs(changeRatio(a)))
        .slice(0, 8);
      this.movers.set(top);
    });
  }
}
