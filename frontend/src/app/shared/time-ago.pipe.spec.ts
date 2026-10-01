import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-10-01T12:00:00Z').getTime();

  it('says "just now" for very recent times', () => {
    expect(pipe.transform(new Date(now - 10_000), now)).toBe('just now');
  });

  it('formats minutes, hours and days', () => {
    expect(pipe.transform(new Date(now - 5 * 60_000), now)).toBe('5 minutes ago');
    expect(pipe.transform(new Date(now - 3 * 3_600_000), now)).toBe('3 hours ago');
    expect(pipe.transform(new Date(now - 24 * 3_600_000), now)).toBe('yesterday');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
