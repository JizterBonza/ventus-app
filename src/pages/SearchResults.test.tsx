import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchResults from './SearchResults';
import { checkHotelAvailability, searchHotelsByLocation, searchHotelsByInspiration } from '../utils/api';

let mockParams = new URLSearchParams();
const mockSearch = { hotels: [], loading: false, error: null, searchAdvanced: jest.fn(), clearResults: jest.fn() };
const mockHotels = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Hotel ${index + 1}`, location: 'United Kingdom', benefits: [], images: [], amenities: [] }));
jest.mock('react-router-dom', () => ({
    useSearchParams: () => [mockParams],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}), { virtual: true });
jest.mock('../hooks/useSearch', () => ({ useSearch: () => mockSearch }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, hasActiveMembership: true }) }));
jest.mock('../utils/api', () => ({
    searchHotelsByLocation: jest.fn(), searchHotelsByInspiration: jest.fn(), searchPredictions: jest.fn(),
    getHotelDetails: jest.fn(), getHotelDetailsBatch: jest.fn(), checkHotelAvailability: jest.fn(),
}));
jest.mock('../utils/currency', () => ({ getVisitorCurrency: () => Promise.resolve('GBP') }));
jest.mock('../components/shared/FavouriteButton', () => () => null);
jest.mock('../components/layout/Header', () => () => null);
jest.mock('../components/layout/Footer', () => () => null);
jest.mock('../components/shared/SearchBarNew', () => () => null);
jest.mock('../components/shared/ProgressiveImage', () => () => null);
jest.mock('../components/shared/Membership', () => () => null);
jest.mock('../components/shared/QuoteForm', () => () => null);
jest.mock('../components/shared/BannerCTA', () => () => null);

beforeEach(() => {
    jest.clearAllMocks();
    const catalogue = async (_id: number, _limit: number, onFirst: (hotels: typeof mockHotels) => void) => {
        onFirst(mockHotels.slice(0, 10));
        return mockHotels;
    };
    (searchHotelsByLocation as jest.Mock).mockImplementation(catalogue);
    (searchHotelsByInspiration as jest.Mock).mockImplementation(catalogue);
    (checkHotelAvailability as jest.Mock).mockImplementation(async ({ hotel_id }) => {
        if (!hotel_id) throw new Error('Supplier country search exceeds memory limit');
        if (hotel_id === 1) throw new Error('Temporary hotel error');
        return [{ hotel_id, is_available: true, lowest_rate: { rate: hotel_id === 2 ? 608 : 700 + hotel_id, currency_code: 'GBP' }, hotel_info: { benefits: ['Breakfast included'] } }];
    });
});

test.each([
    'location=United+Kingdom&locationId=5847',
    'inspirationId=42&title=City+breaks',
])('collection rates survive supplier failures and keep the full catalogue: %s', async (query) => {
    mockParams = new URLSearchParams(`${query}&checkIn=2026-12-23&checkOut=2026-12-26&roomSlots=${encodeURIComponent(JSON.stringify([{ adults: 2, children: 0 }]))}`);
    render(<SearchResults />);
    await screen.findByText('From GBP 608/night for your dates');
    expect(screen.getByText('Rate unavailable — view hotel to check')).toBeInTheDocument();
    expect(screen.queryByText('No rooms available for these dates')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hotel 1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Hotel 12' })).not.toBeInTheDocument();
    expect(checkHotelAvailability).toHaveBeenCalledTimes(10);
    fireEvent.click(screen.getByRole('button', { name: 'View More' }));
    await screen.findByText('From GBP 712/night for your dates');
    expect(screen.getByRole('link', { name: 'Hotel 12' })).toBeInTheDocument();
    await waitFor(() => expect(checkHotelAvailability).toHaveBeenCalledTimes(12));
    for (const [params] of (checkHotelAvailability as jest.Mock).mock.calls) {
        expect(params).toEqual({ hotel_id: expect.any(Number), start_date: '2026-12-23', end_date: '2026-12-26', rooms: [{ adults: 2 }], currency: 'GBP' });
    }
    expect(screen.getAllByText('Breakfast included').length).toBe(11);
});
