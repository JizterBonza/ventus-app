import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchAvailability } from './useSearchAvailability';
import { checkHotelAvailability } from '../utils/api';
import { getVisitorCurrency } from '../utils/currency';
import { AvailabilityResponse } from '../types/search';

jest.mock('../utils/api', () => ({ checkHotelAvailability: jest.fn() }));
jest.mock('../utils/currency', () => ({ getVisitorCurrency: jest.fn() }));
const criteria = { start_date: '2026-12-23', end_date: '2026-12-26', rooms: [{ adults: 2 }] };
const response = (id: number, rate = 608) => [{ hotel_id: id, is_available: true, lowest_rate: rate, default_currency: 'GBP' }] as AvailabilityResponse[];
const deferred = () => {
    let resolve!: (value: AvailabilityResponse[]) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<AvailabilityResponse[]>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
beforeEach(() => {
    jest.resetAllMocks();
    (getVisitorCurrency as jest.Mock).mockResolvedValue('GBP');
});

test('shows successful prices progressively, isolates errors and caps simultaneous hotel checks at four', async () => {
    const calls = Array.from({ length: 6 }, deferred);
    (checkHotelAvailability as jest.Mock).mockImplementation(({ hotel_id }) => calls[hotel_id - 1].promise);
    const { result } = renderHook(() => useSearchAvailability(criteria, 'UK', true));
    act(() => result.current.requestHotels([1, 2, 3, 4, 5, 6]));
    await waitFor(() => expect(checkHotelAvailability).toHaveBeenCalledTimes(4));
    await act(async () => calls[1].resolve(response(2)));
    expect(result.current.results[2]?.result.lowest_rate).toBe(608);
    expect(result.current.results[1]).toBeUndefined();
    expect(checkHotelAvailability).toHaveBeenCalledTimes(5);
    await act(async () => calls[0].reject(new Error('Supplier timeout')));
    expect(result.current.results[1]).toBeNull();
    expect(result.current.results[2]?.result.is_available).toBe(true);
    expect(checkHotelAvailability).toHaveBeenCalledTimes(6);
    for (const [params] of (checkHotelAvailability as jest.Mock).mock.calls) {
        expect(params).toEqual({ ...criteria, hotel_id: expect.any(Number), currency: 'GBP' });
    }
});

test('view more and filter changes reuse checked/in-flight hotels within the current search', async () => {
    const pending = deferred();
    (checkHotelAvailability as jest.Mock).mockImplementation(({ hotel_id }) => hotel_id === 1 ? pending.promise : Promise.resolve(response(hotel_id)));
    const { result, rerender } = renderHook(() => useSearchAvailability({ ...criteria }, 'UK', true));
    act(() => result.current.requestHotels([1, 2]));
    await waitFor(() => expect(result.current.results[2]).toBeDefined());
    rerender();
    act(() => result.current.requestHotels([2, 1, 3]));
    await waitFor(() => expect(result.current.results[3]).toBeDefined());
    expect(checkHotelAvailability).toHaveBeenCalledTimes(3);
    await act(async () => pending.resolve(response(1)));
    expect(result.current.results[1]).toBeDefined();
});

test('new dates discard old results and stop starting queued work from the old search', async () => {
    const old = deferred();
    (checkHotelAvailability as jest.Mock).mockImplementation(({ start_date, hotel_id }) => start_date === criteria.start_date ? old.promise : Promise.resolve(response(hotel_id, 700)));
    const { result, rerender } = renderHook(({ start }) => useSearchAvailability({ ...criteria, start_date: start }, 'UK', true), { initialProps: { start: criteria.start_date } });
    act(() => result.current.requestHotels([1, 2, 3, 4, 5]));
    await waitFor(() => expect(checkHotelAvailability).toHaveBeenCalledTimes(4));
    rerender({ start: '2026-12-24' });
    expect(result.current.results).toEqual({});
    act(() => result.current.requestHotels([1]));
    await waitFor(() => expect(result.current.results[1]?.result.lowest_rate).toBe(700));
    await act(async () => old.resolve(response(1, 608)));
    expect(result.current.results[1]?.result.lowest_rate).toBe(700);
    expect(checkHotelAvailability).toHaveBeenCalledTimes(5);
});

test('guests do not request prices; losing membership clears prices and ignores pending results', async () => {
    const pending = deferred();
    (checkHotelAvailability as jest.Mock).mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ enabled }) => useSearchAvailability(criteria, 'UK', enabled), { initialProps: { enabled: false } });
    act(() => result.current.requestHotels([1]));
    expect(checkHotelAvailability).not.toHaveBeenCalled();
    rerender({ enabled: true });
    act(() => result.current.requestHotels([1]));
    await waitFor(() => expect(checkHotelAvailability).toHaveBeenCalledTimes(1));
    rerender({ enabled: false });
    await act(async () => pending.resolve(response(1)));
    expect(result.current.results).toEqual({});
});

test('mismatched supplier hotels are not displayed as another hotel’s price', async () => {
    (checkHotelAvailability as jest.Mock).mockResolvedValue(response(99));
    const { result } = renderHook(() => useSearchAvailability(criteria, 'UK', true));
    act(() => result.current.requestHotels([1]));
    await waitFor(() => expect(result.current.results[1]).toBeNull());
});
