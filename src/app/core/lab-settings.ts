import { Injectable, computed, signal } from '@angular/core';

export type FixId = 'trackById' | 'purePipes' | 'virtualScroll' | 'unsubscribe';

export interface Fix {
  id: FixId;
  title: string;
  problem: string;
  fix: string;
  before: string;
  after: string;
}

export const FIXES: Fix[] = [
  {
    id: 'trackById',
    title: 'Track rows by id',
    problem:
      'Every poll returns new objects. Tracking by object identity makes Angular destroy and rebuild every row, every tick.',
    fix: 'Track by a stable id, so Angular keeps the DOM and only patches the cells that changed.',
    before: '@for (row of rows(); track row)',
    after: '@for (row of rows(); track row.id)',
  },
  {
    id: 'purePipes',
    title: 'No function calls in templates',
    problem:
      'Methods in bindings run on every change detection, for every row. Here each call also builds a new Intl.NumberFormat.',
    fix: 'Pure pipes with a cached formatter. They only re-run when their input changes.',
    before: '{{ formatPrice(row) }}  {{ changeOf(row) }}',
    after: '{{ row.price | price }}  {{ row.price | change: row.open }}',
  },
  {
    id: 'virtualScroll',
    title: 'Virtual scrolling',
    problem:
      'All rows are in the DOM even though only ~20 are visible. More nodes means slower layout, paint and memory.',
    fix: 'CDK virtual scroll renders only the rows in the viewport plus a small buffer.',
    before: '<div class="scroll"> @for (…) </div>',
    after: '<cdk-virtual-scroll-viewport itemSize="36">',
  },
  {
    id: 'unsubscribe',
    title: 'Unsubscribe on destroy',
    problem:
      'The detail panel subscribes to the price feed and never unsubscribes. Each open/close leaves a live subscription doing work forever.',
    fix: 'takeUntilDestroyed() ends the subscription when the panel is destroyed.',
    before: 'feed.ticks$.subscribe(…)',
    after: 'feed.ticks$.pipe(takeUntilDestroyed()).subscribe(…)',
  },
];

@Injectable({ providedIn: 'root' })
export class LabSettings {
  readonly fixes = signal<Record<FixId, boolean>>({
    trackById: false,
    purePipes: false,
    virtualScroll: false,
    unsubscribe: false,
  });
  readonly enabledCount = computed(() => Object.values(this.fixes()).filter(Boolean).length);

  toggle(id: FixId): void {
    this.fixes.update((f) => ({ ...f, [id]: !f[id] }));
  }

  setAll(on: boolean): void {
    this.fixes.set({ trackById: on, purePipes: on, virtualScroll: on, unsubscribe: on });
  }
}
