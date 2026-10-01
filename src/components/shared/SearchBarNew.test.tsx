import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchBarNew from './SearchBarNew';
import { getHotelCalendarRates } from '../../utils/api';
import { setDisplayCurrency } from '../../utils/currency';
import { getDefaultSearchDateStrings } from '../../utils/searchSession';

const mockDates = getDefaultSearchDateStrings();
const mockParams = new URLSearchParams({ checkIn: mockDates.start_date, checkOut: mockDates.end_date });
const mockSetParams = jest.fn();
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    useSearchParams: () => [mockParams, mockSetParams],
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/hotel/123' }),
}), { virtual: true });
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ hasActiveMembership: true }) }));
jest.mock('../../utils/api', () => ({ getHotelCalendarRates: jest.fn(), searchPredictions: jest.fn() }));
afterEach(() => localStorage.clear());

test('calendar changes refresh prices, clear old amounts and ignore slower previous currency replies', async () => {
    const rate = (currency: string, value: string) => [{ date: mockDates.start_date, rate: value, currency, is_closed: false }];
    let resolveEuro!: (value: unknown) => void;
    (getHotelCalendarRates as jest.Mock).mockImplementation((_hotelId, currency) => currency === 'EUR'
        ? new Promise(resolve => { resolveEuro = resolve; })
        : Promise.resolve(rate(currency, currency === 'GBP' ? '100' : '150')));
    render(<SearchBarNew hotelId={123} />);
    const checkIn = new Date(mockDates.start_date + 'T12:00:00');
    const label = checkIn.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    fireEvent.click(screen.getByText(label));
    await screen.findByText('£100');
    act(() => setDisplayCurrency('EUR'));
    expect(screen.queryByText('£100')).not.toBeInTheDocument();
    act(() => setDisplayCurrency('USD'));
    await screen.findByText('$150');
    await act(async () => resolveEuro(rate('EUR', '120')));
    expect(screen.queryByText('€120')).not.toBeInTheDocument();
    expect(getHotelCalendarRates).toHaveBeenLastCalledWith(123, 'USD');
});
