import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyBookings from './MyBookings';
import { cancelReservation, getCancellationPreview, getReservations, Reservation } from '../utils/reservationsService';

jest.mock('react-router-dom', () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../utils/reservationsService', () => ({ ...jest.requireActual('../utils/reservationsService'), getReservations: jest.fn(), getCancellationPreview: jest.fn(), cancelReservation: jest.fn() }));

const booking: Reservation = { id: '101', hotel_id: '42', hotel_name: 'Example Hotel', city: 'London', address: '',
  check_in: '2099-12-01', check_out: '2099-12-04', state: 'booked', confirmation_number: 'CONF101', total_cost: '1500', currency: 'GBP',
  is_cancellable: true, can_cancel: true, cancellation_deadline: '2099-11-30 12:00:00',
  rooms: [{ guest_name: 'Sample Guest', room_type: 'Suite', adults: 2, cancellation_policy: 'Cancellation is free before the deadline.', deposit_policy: '', benefits: [] }] };

beforeEach(() => {
  jest.clearAllMocks();
  (getReservations as jest.Mock).mockResolvedValue({ bookings: [booking, { ...booking, id: '102', hotel_name: 'Past Hotel', check_out: '2020-01-01' }, { ...booking, id: '103', hotel_name: 'Cancelled Hotel', state: 'cancelled' }] });
  (getCancellationPreview as jest.Mock).mockResolvedValue({ reviewId: 'review-1', booking });
});

test('clients can browse upcoming, past and cancelled reservations', async () => {
  render(<MyBookings />);
  await screen.findByText('Example Hotel');
  expect(screen.queryByText('Past Hotel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Past stays/ }));
  expect(screen.getByText('Past Hotel')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }));
  expect(screen.getByText('Cancelled Hotel')).toBeInTheDocument();
});

test('cancellation requires a fresh review and explicit acknowledgement', async () => {
  (cancelReservation as jest.Mock).mockResolvedValue({ booking: { ...booking, state: 'cancelled', can_cancel: false } });
  render(<MyBookings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review cancellation' }));
  const confirm = await screen.findByRole('button', { name: 'Confirm cancellation' });
  expect(confirm).toBeDisabled();
  expect(cancelReservation).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(confirm);
  await screen.findByText(/Cancellation confirmed for Example Hotel/);
  expect(cancelReservation).toHaveBeenCalledTimes(1);
  expect(cancelReservation).toHaveBeenCalledWith('101', 'review-1');
});

test('an uncertain cancellation does not display success or retry automatically', async () => {
  (cancelReservation as jest.Mock).mockRejectedValue(new Error('Cancellation could not be confirmed. Contact Ventus.'));
  render(<MyBookings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review cancellation' }));
  await screen.findByRole('button', { name: 'Confirm cancellation' });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  await screen.findByRole('alert');
  expect(screen.queryByText(/Cancellation confirmed for/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirm cancellation' })).not.toBeInTheDocument();
  expect(cancelReservation).toHaveBeenCalledTimes(1);
});

test('stale or ineligible reservations do not offer cancellation', async () => {
  (getReservations as jest.Mock).mockResolvedValue({ bookings: [{ ...booking, stale: true, can_cancel: false }] });
  render(<MyBookings />);
  await waitFor(() => expect(screen.getByText(/Showing the last saved details/)).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Review cancellation' })).not.toBeInTheDocument();
});
