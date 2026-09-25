import { useCallback, useEffect, useRef, useState } from 'react';
import { AvailabilityParams, AvailabilityResponse } from '../types/search';
import { checkHotelAvailability } from '../utils/api';
import { getVisitorCurrency } from '../utils/currency';

type SearchCriteria = Pick<AvailabilityParams, 'start_date' | 'end_date' | 'rooms'>;
type HotelResult = { result: AvailabilityResponse; currency: string } | null;
type SearchState = { key: string; hotels: Record<number, HotelResult> };

/** Search-card prices only. Booking forms always obtain a fresh supplier session. */
export function useSearchAvailability(criteria: SearchCriteria, searchKey: string, enabled: boolean) {
    const key = JSON.stringify([searchKey, criteria.start_date, criteria.end_date, criteria.rooms]);
    const [state, setState] = useState<SearchState>({ key, hotels: {} });
    const queueRef = useRef<{ key: string; enqueue: (ids: number[]) => void } | null>(null);

    useEffect(() => {
        setState({ key, hotels: {} });
        if (!enabled) return;

        // A country-wide availability response can exhaust the supplier's memory.
        // Check just the visible hotels, with a single bounded queue per search.
        const seen = new Set<number>();
        const pending: number[] = [];
        let active = 0;
        let disposed = false;
        let currencyRequest: Promise<string> | undefined;
        const pump = () => {
            while (!disposed && active < 4 && pending.length > 0) {
                const hotelId = pending.shift()!;
                active += 1;
                currencyRequest ??= getVisitorCurrency();
                void currencyRequest.then(async (currency): Promise<HotelResult> => {
                    if (disposed) return null;
                    const results = await checkHotelAvailability({ ...criteria, hotel_id: hotelId, currency });
                    const result = results.find((item) => Number(item.hotel_id) === hotelId);
                    return result ? { result, currency } : null;
                }).catch(() => null).then((result) => {
                    if (!disposed) {
                        setState((current) => current.key === key
                            ? { key, hotels: { ...current.hotels, [hotelId]: result } }
                            : current);
                    }
                }).finally(() => {
                    active -= 1;
                    pump();
                });
            }
        };
        queueRef.current = {
            key,
            enqueue(ids) {
                for (const id of ids) {
                    if (!seen.has(id)) {
                        seen.add(id);
                        pending.push(id);
                    }
                }
                pump();
            },
        };
        return () => {
            disposed = true;
            queueRef.current = null;
        };
        // `key` contains every criterion; object identity changes must not restart requests.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, enabled]);

    const requestHotels = useCallback((ids: number[]) => {
        if (enabled && queueRef.current?.key === key) queueRef.current.enqueue(ids);
    }, [enabled, key]);

    return {
        results: enabled && state.key === key ? state.hotels : {},
        requestHotels,
    };
}
