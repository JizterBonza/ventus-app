import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CheckAvailability from './CheckAvailability';
import { checkHotelAvailability } from '../../utils/api';
import { getVisitorCurrency } from '../../utils/currency';

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
    await expect(getVisitorCurrency()).resolves.toBe('GBP');
    fireEvent.click(screen.getByRole('button', { name: 'Select room' }));
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({
        formData: expect.objectContaining({ currency: 'GBP' }), selectedRateIndex: 'room-1',
    }));
});
