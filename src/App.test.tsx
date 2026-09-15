import { ensureMinimumCheckOutDateString } from './utils/searchSession';

test('keeps check-out at least one day after check-in', () => {
  expect(ensureMinimumCheckOutDateString('2026-09-17', '2026-09-17')).toBe('2026-09-18');
  expect(ensureMinimumCheckOutDateString('2026-09-17', '2026-09-16')).toBe('2026-09-18');
  expect(ensureMinimumCheckOutDateString('2026-09-17', '2026-09-20')).toBe('2026-09-20');
});
