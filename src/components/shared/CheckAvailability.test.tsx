import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckAvailability from './CheckAvailability';
import { checkHotelAvailability } from '../../utils/api';
import { getDisplayCurrency, setDisplayCurrency } from '../../utils/currency';

const mockSearchParams = new URLSearchParams('checkIn=2027-06-01&checkOut=2027-06-03');
const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}), { virtual: true });
jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, hasActiveMembership: true }),
}));
jest.mock('../../utils/api', () => ({ checkHotelAvailability: jest.fn() }));

afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
});

test('changing currency clears the selected room, fetches a new quote and ignores older replies', async () => {
    const quote = (currency: string, rate: number) => [{
        hotel_id: 123, is_available: true, default_currency: currency,
        room_types: [{ name: 'Superior room', currency, rates: [{ rate_index: currency, rate, currency_code: currency }] }],
    }];
    let resolveEuro!: (value: unknown) => void;
    (checkHotelAvailability as jest.Mock).mockImplementation(({ currency }) => currency === 'EUR'
        ? new Promise(resolve => { resolveEuro = resolve; })
        : Promise.resolve(quote(currency, currency === 'GBP' ? 299 : 400)));
    const onResult = jest.fn();
    const onStart = jest.fn();
    render(<CheckAvailability hotelId={123} hotelName="Test hotel" onAvailabilityResult={onResult} onAvailabilityStart={onStart} />);
    await screen.findByText('GBP 299');
    fireEvent.click(screen.getByRole('button', { name: 'Select room' }));
    expect(screen.getByRole('button', { name: 'Selected' })).toBeInTheDocument();
    onStart.mockClear();
    act(() => setDisplayCurrency('EUR'));
    expect(onStart).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Selected' })).not.toBeInTheDocument();
    expect(screen.queryByText('GBP 299')).not.toBeInTheDocument();
    act(() => setDisplayCurrency('USD'));
    await screen.findByText('USD 400');
    await act(async () => resolveEuro(quote('EUR', 350)));
    expect(screen.queryByText('EUR 350')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select room' }));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({
        formData: expect.objectContaining({ currency: 'USD' }), selectedRateIndex: 'USD',
    })));
});

test.each(['en', 'en-PH', 'en-AU'])('requests and selects GBP prices regardless of locale %s or an old PHP cache', async (language) => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue(language);
    localStorage.setItem('ventus:visitor-currency:v1', JSON.stringify({ currency: 'PHP', expiresAt: Date.now() + 86400000 }));
    (checkHotelAvailability as jest.Mock).mockClear().mockResolvedValue([{
        hotel_id: 123,
        is_available: true,
        default_currency: 'PHP',
        room_types: [{
            name: 'Superior room',
            currency: 'PHP',
            rates: [{ title: 'Best Available Rate', rate_index: 'room-1', rate: 23108,
                currency_code: 'PHP', rate_in_requested_currency: 299,
                total_to_book: 46216, total_to_book_in_requested_currency: 598 }],
        }],
    }]);
    const onResult = jest.fn();
    render(<CheckAvailability hotelId={123} hotelName="Test hotel" onAvailabilityResult={onResult} />);

    await screen.findByText('GBP 299');
    expect(screen.queryByText('PHP 23,108')).not.toBeInTheDocument();
    expect(screen.queryByText('GBP 23,108')).not.toBeInTheDocument();
    for (const [params] of (checkHotelAvailability as jest.Mock).mock.calls) {
        expect(params.currency).toBe('GBP');
    }
    // Search results and calendars resolve the same currency as the room rates.
    expect(getDisplayCurrency()).toBe('GBP');
    fireEvent.click(screen.getByRole('button', { name: 'Select room' }));
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({
        formData: expect.objectContaining({ currency: 'GBP' }), selectedRateIndex: 'room-1',
    }));
});
