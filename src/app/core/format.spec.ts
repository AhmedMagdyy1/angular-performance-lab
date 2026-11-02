import { ChangePipe, PricePipe, VolumePipe, changeRatio } from './format';

describe('format pipes', () => {
  it('formats price, change and volume', () => {
    expect(new PricePipe().transform(1234.5)).toBe('$1,234.50');
    expect(new ChangePipe().transform(110, 100)).toBe('+10.00%');
    expect(new ChangePipe().transform(95, 100)).toBe('-5.00%');
    expect(new VolumePipe().transform(1_250_000)).toBe('1.3M');
    expect(changeRatio({ price: 50, open: 40 })).toBeCloseTo(0.25);
  });
});
