import { Pipe, PipeTransform } from '@angular/core';
import { Instrument } from './market';

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const pctFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  signDisplay: 'always',
});
const volumeFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatPrice = (price: number) => priceFormat.format(price);
export const changeRatio = (row: Pick<Instrument, 'price' | 'open'>) =>
  (row.price - row.open) / row.open;
export const formatChange = (row: Pick<Instrument, 'price' | 'open'>) =>
  pctFormat.format(changeRatio(row));
export const formatVolume = (volume: number) => volumeFormat.format(volume);

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(price: number): string {
    return formatPrice(price);
  }
}

/** Takes price and open (not the row) so it stays pure when a poll returns a new object. */
@Pipe({ name: 'change' })
export class ChangePipe implements PipeTransform {
  transform(price: number, open: number): string {
    return formatChange({ price, open });
  }
}

@Pipe({ name: 'volume' })
export class VolumePipe implements PipeTransform {
  transform(volume: number): string {
    return formatVolume(volume);
  }
}
