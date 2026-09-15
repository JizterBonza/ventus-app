import { getHotelCalendarRates } from './api';

describe('getHotelCalendarRates', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('falls back to GBP when the supplier rejects the visitor currency', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'validation',
        errors: { currency: ['The selected currency is invalid.'] },
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        content: [{ date: '2026-09-16', rate: '1,800', currency: 'GBP', is_closed: false }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    const rates = await getHotelCalendarRates(987654, 'AUD');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('currency=AUD');
    expect(String(fetchMock.mock.calls[1][0])).toContain('currency=GBP');
    expect(rates).toEqual([
      { date: '2026-09-16', rate: '1,800', currency: 'GBP', is_closed: false },
    ]);
  });
});
