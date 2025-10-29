import React, { useState } from 'react';
import { sendBookingEmail } from '../utils/api';
import { BookingDetails } from '../types/search';

const BookingTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testBooking = async () => {
    setIsLoading(true);
    setTestResult('');

    const testBookingDetails: BookingDetails = {
      hotelId: 1,
      hotelName: 'Test Hotel',
      guestName: 'John Doe',
      guestEmail: 'john.doe@example.com',
      guestPhone: '+1-555-0123',
      checkInDate: '2024-02-01',
      checkOutDate: '2024-02-03',
      numberOfGuests: 2,
      numberOfRooms: 1,
      roomType: 'Deluxe Room',
      specialRequests: 'Test booking request',
      totalPrice: 299
    };

    try {
      const result = await sendBookingEmail(testBookingDetails);
      setTestResult(`Success: ${result.message}`);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h4>Booking Email Test</h4>
            </div>
            <div className="card-body">
              <p>This page tests the booking email functionality.</p>
              <p><strong>Target Email:</strong> testjizternoda@gmail.com</p>
              
              <button 
                className="btn btn-primary" 
                onClick={testBooking}
                disabled={isLoading}
              >
                {isLoading ? 'Testing...' : 'Send Test Booking Email'}
              </button>

              {testResult && (
                <div className={`alert ${testResult.startsWith('Success') ? 'alert-success' : 'alert-danger'} mt-3`}>
                  {testResult}
                </div>
              )}

              <div className="mt-4">
                <h5>Test Booking Details:</h5>
                <ul>
                  <li>Hotel: Test Hotel</li>
                  <li>Guest: John Doe (john.doe@example.com)</li>
                  <li>Phone: +1-555-0123</li>
                  <li>Check-in: 2024-02-01</li>
                  <li>Check-out: 2024-02-03</li>
                  <li>Guests: 2</li>
                  <li>Rooms: 1</li>
                  <li>Room Type: Deluxe Room</li>
                  <li>Price: $299</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTest;
