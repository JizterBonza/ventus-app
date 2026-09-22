import { checkHotelAvailability, getHotelCalendarRates, searchHotelsByLocation, submitBooking } from './api';

describe('searchHotelsByLocation progressive results', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('shows the first page before the remaining pages finish, including to concurrent callers', async () => {
    let resolveSecondPage!: (response: Response) => void;
    const secondPage = new Promise<Response>((resolve) => { resolveSecondPage = resolve; });
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((input) =>
      String(input).includes('page=2')
        ? secondPage
        : Promise.resolve(new Response(JSON.stringify({
          content: [{ id: 987658, name: 'First hotel' }],
          page: { total_pages: 2 },
        }), { status: 200 }))
    );
    const firstPage = jest.fn();
    const concurrentFirstPage = jest.fn();

    const request = searchHotelsByLocation(987657, 10, firstPage);
    const concurrentRequest = searchHotelsByLocation(987657, 10, concurrentFirstPage);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstPage).toHaveBeenCalledWith([expect.objectContaining({ id: 987658, name: 'First hotel' })]);
    expect(concurrentFirstPage).toHaveBeenCalledWith([expect.objectContaining({ id: 987658 })]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveSecondPage(new Response(JSON.stringify({
      content: [{ id: 987659, name: 'Second hotel' }],
      page: { total_pages: 2 },
    }), { status: 200 }));
    const [hotels, concurrentHotels] = await Promise.all([request, concurrentRequest]);
    expect(hotels.map((hotel) => hotel.id)).toEqual([987658, 987659]);
    expect(concurrentHotels).toEqual(hotels);
  });
});

describe('reservation submission', () => {
  const request = { hotelId: 42, startDate: '2027-12-01', endDate: '2027-12-04', sessionId: 'session', rateIndex: 'rate', guestName: 'Test Guest', guestEmail: 'guest@example.test', rooms: [{ adults: 2, children: [] }] };
  beforeEach(() => {
    window.localStorage.setItem('ventus_auth_token', 'member-token');
    window.localStorage.setItem('ventus_auth_user', JSON.stringify({ id: '1' }));
  });
  afterEach(() => { jest.restoreAllMocks(); window.localStorage.clear(); });
  it('keeps LE email enabled and submits through the authenticated Ventus backend', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 101, state: 'booked', confirmation_number: 'CONF101' }), { status: 200 }));
    expect((await submitBooking(request)).message).toContain('Booking confirmed');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v2/hotels/bookings');
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer member-token' }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).rooms[0].send_email_to_guest).toBe(true);
  });
  it('does not retry an uncertain booking or claim that a pending booking is confirmed', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network timeout'));
    await expect(submitBooking(request)).rejects.toThrow('before booking again');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 101, state: 'pending' }), { status: 200 }));
    expect((await submitBooking(request)).message).toContain('awaiting supplier confirmation');
  });
});

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

describe('checkHotelAvailability booking sessions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests a fresh session for every exact-hotel check', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{ hotel_id: 987655, session_id: 'first' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ hotel_id: 987655, session_id: 'second' }]), { status: 200 }));
    const params = {
      hotel_id: 987655,
      start_date: '2026-11-27',
      end_date: '2026-11-29',
      currency: 'GBP',
      rooms: [{ adults: 2 }],
    };

    const first = await checkHotelAvailability(params);
    const second = await checkHotelAvailability(params);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first[0].session_id).toBe('first');
    expect(second[0].session_id).toBe('second');
  });

  it('still reuses short-lived location prices, which contain no booking session', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([{ hotel_id: 987656, session_id: null }]), { status: 200 }));
    const params = {
      location_id: 987656,
      start_date: '2026-11-27',
      end_date: '2026-11-29',
      currency: 'GBP',
      rooms: [{ adults: 2 }],
    };

    await checkHotelAvailability(params);
    await checkHotelAvailability(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
