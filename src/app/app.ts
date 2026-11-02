import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterEveryRender,
  inject,
  signal,
} from '@angular/core';
import { FIXES, LabSettings } from './core/lab-settings';
import { MarketFeed } from './core/market';
import { Metrics } from './core/metrics';
import { DetailPanel } from './lab/detail-panel';
import { MarketGrid } from './lab/market-grid';

export interface BenchResult {
  label: string;
  fps: number;
  renderMs: number;
  nodesPerTick: number;
  domNodes: number;
  subscriptions: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Component({
  selector: 'app-root',
  imports: [MarketGrid, DetailPanel, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly feed = inject(MarketFeed);
  protected readonly settings = inject(LabSettings);
  protected readonly metrics = inject(Metrics);
  protected readonly fixList = FIXES;
  protected readonly sizes = [1000, 2000, 5000];

  protected readonly panelOpen = signal(false);
  protected readonly benchRunning = signal(false);
  protected readonly benchStatus = signal('');
  protected readonly results = signal<BenchResult[]>([]);

  constructor() {
    afterEveryRender(() => this.metrics.onRendered());
    this.metrics.start();
    this.feed.start();
  }

  protected togglePlay(): void {
    if (this.feed.running()) this.feed.stop();
    else this.feed.start();
  }

  protected setSize(value: string): void {
    this.feed.setSize(Number(value));
    this.metrics.reset();
  }

  protected toggleFix(id: (typeof FIXES)[number]['id']): void {
    this.settings.toggle(id);
    this.metrics.reset();
  }

  protected setAll(on: boolean): void {
    this.settings.setAll(on);
    this.metrics.reset();
  }

  /** Opens and closes the panel, like a user clicking around. Leaks show up in the subscription count. */
  async cyclePanel(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      this.panelOpen.set(true);
      await sleep(30);
      this.panelOpen.set(false);
      await sleep(30);
    }
  }

  protected releaseLeaks(): void {
    this.panelOpen.set(false);
    this.feed.releaseAllSubscribers();
  }

  async runBenchmark(): Promise<void> {
    if (this.benchRunning()) return;
    this.benchRunning.set(true);
    this.results.set([]);
    const wasRunning = this.feed.running();
    this.feed.start();
    const scenarios: [string, boolean][] = [
      ['Before: no fixes', false],
      ['After: all 4 fixes', true],
    ];
    for (const [label, on] of scenarios) {
      this.releaseLeaks();
      this.settings.setAll(on);
      this.benchStatus.set(`${label}: opening and closing the panel 20 times…`);
      await this.cyclePanel(20);
      this.benchStatus.set(`${label}: measuring for 5 seconds…`);
      await sleep(1000);
      this.metrics.reset();
      const fps: number[] = [];
      for (let s = 0; s < 4; s++) {
        await sleep(1000);
        fps.push(this.metrics.fps());
      }
      this.results.update((r) => [
        ...r,
        {
          label,
          fps: Math.round(fps.reduce((a, b) => a + b, 0) / fps.length),
          renderMs: this.metrics.renderMs(),
          nodesPerTick: this.metrics.nodesPerTick(),
          domNodes: this.metrics.domNodes(),
          subscriptions: this.feed.activeSubscriptions(),
        },
      ]);
    }
    this.releaseLeaks();
    if (!wasRunning) this.feed.stop();
    this.benchStatus.set('Done. Your settings were switched to "all fixes on".');
    this.benchRunning.set(false);
  }

  protected ratio(before: number, after: number): string {
    if (!after) return before ? '∞' : '–';
    return `${(before / after).toFixed(1)}×`;
  }
}
