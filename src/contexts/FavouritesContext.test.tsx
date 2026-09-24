import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FavouritesProvider, useFavourites } from './FavouritesContext';
import FavouriteButton from '../components/shared/FavouriteButton';
import Favourites from '../pages/Favourites';
import { useAuth } from './AuthContext';
import { getFavourites, addFavourite, removeFavourite } from '../utils/favouritesService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>, useNavigate: () => mockNavigate, useLocation: () => ({ pathname: '/hotel/42', search: '', hash: '' }) }), { virtual: true });
jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../utils/favouritesService', () => ({ getFavourites: jest.fn(), addFavourite: jest.fn(), removeFavourite: jest.fn() }));
jest.mock('../components/layout/Layout', () => ({ children }: any) => <div>{children}</div>);
const hotel = { id: 42, name: 'Passalacqua', location: 'Lake Como', image: '/assets/hotel.jpg' };
const auth = (id: number | null) => (useAuth as jest.Mock).mockReturnValue({ user: id ? { id } : null, isAuthenticated: Boolean(id), isLoading: false });
const Harness = () => { const { hotels } = useFavourites(); return <><FavouriteButton hotel={hotel} /><span data-testid="saved">{hotels.map(h => h.name).join(',')}</span></>; };

beforeEach(() => {
  jest.clearAllMocks(); auth(1);
  (getFavourites as jest.Mock).mockResolvedValue([]);
  (addFavourite as jest.Mock).mockResolvedValue(hotel);
  (removeFavourite as jest.Mock).mockResolvedValue(undefined);
});

test('saving a heart updates the account list and removing it clears all matching hearts', async () => {
  render(<FavouritesProvider><Harness /><FavouriteButton hotel={hotel} /></FavouritesProvider>);
  await waitFor(() => expect(screen.getAllByRole('button')[0]).toBeEnabled());
  fireEvent.click(screen.getAllByRole('button')[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: /Remove Passalacqua/ })).toHaveLength(2));
  expect(screen.getByTestId('saved')).toHaveTextContent('Passalacqua');
  fireEvent.click(screen.getAllByRole('button')[1]);
  await waitFor(() => expect(screen.getByTestId('saved')).toBeEmptyDOMElement());
  expect(removeFavourite).toHaveBeenCalledWith(42);
});

test('a failed save is visible and never marks the hotel as saved', async () => {
  (addFavourite as jest.Mock).mockRejectedValue(new Error('Please try again.'));
  render(<FavouritesProvider><Harness /></FavouritesProvider>);
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please try again.');
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
});

test('guests return to the hotel after signing in without saving to shared browser storage', () => {
  auth(null);
  render(<FavouritesProvider><Harness /></FavouritesProvider>);
  fireEvent.click(screen.getByRole('button'));
  expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: { pathname: '/hotel/42', search: '', hash: '' } } });
  expect(addFavourite).not.toHaveBeenCalled();
  expect(getFavourites).not.toHaveBeenCalled();
});

test('switching accounts clears the previous list and ignores an in-flight save', async () => {
  let completeSave: (value: typeof hotel) => void = () => {};
  (addFavourite as jest.Mock).mockReturnValue(new Promise(resolve => { completeSave = resolve; }));
  const { rerender } = render(<FavouritesProvider><Harness /></FavouritesProvider>);
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  fireEvent.click(screen.getByRole('button'));
  auth(2); rerender(<FavouritesProvider><Harness /></FavouritesProvider>);
  await waitFor(() => expect(getFavourites).toHaveBeenCalledTimes(2));
  await act(async () => { completeSave(hotel); });
  expect(screen.getByTestId('saved')).toBeEmptyDOMElement();
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
});

test('saved hotel index loads from the account and removes a card through its heart', async () => {
  (getFavourites as jest.Mock).mockResolvedValue([hotel]);
  render(<FavouritesProvider><Favourites /></FavouritesProvider>);
  expect(await screen.findByText('Passalacqua')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Passalacqua' })).toHaveAttribute('href', '/hotel/42');
  fireEvent.click(screen.getByRole('button', { name: /Remove Passalacqua/ }));
  expect(await screen.findByText('Your next journey starts here')).toBeInTheDocument();
});
