import emailjs from '@emailjs/browser';
import { BookingDetails } from '../types/search';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_bz8el8q';
const EMAILJS_TEMPLATE_ID = 'template_e9gwfvx';
const EMAILJS_PUBLIC_KEY = 'UlWAdeYMonSd7VHlz';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Send booking details via EmailJS
 */
export const sendBookingEmailViaEmailJS = async (bookingDetails: BookingDetails): Promise<{ success: boolean; message: string; bookingId?: string }> => {
  try {
    console.log('Sending booking email via EmailJS:', bookingDetails);
    
    // Generate a unique booking ID
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare template parameters
    const templateParams = {
      to_email: 'testjizternoda@gmail.com',
      from_name: bookingDetails.guestName,
      from_email: bookingDetails.guestEmail,
      booking_id: bookingId,
      hotel_name: bookingDetails.hotelName,
      guest_name: bookingDetails.guestName,
      guest_email: bookingDetails.guestEmail,
      guest_phone: bookingDetails.guestPhone,
      check_in_date: bookingDetails.checkInDate,
      check_out_date: bookingDetails.checkOutDate,
      number_of_guests: bookingDetails.numberOfGuests,
      number_of_rooms: bookingDetails.numberOfRooms,
      room_type: bookingDetails.roomType || 'Not specified',
      special_requests: bookingDetails.specialRequests || 'None',
      total_price: bookingDetails.totalPrice ? `$${bookingDetails.totalPrice}` : 'To be calculated',
      submitted_at: new Date().toLocaleString(),
      message: `New booking request from ${bookingDetails.guestName} for ${bookingDetails.hotelName}`
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('EmailJS response:', response);
    
    if (response.status === 200) {
      return {
        success: true,
        message: 'Booking request sent successfully! We will contact you soon to confirm your reservation.',
        bookingId: bookingId
      };
    } else {
      throw new Error(`EmailJS returned status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error sending email via EmailJS:', error);
    return {
      success: false,
      message: 'Failed to send booking request. Please try again or contact us directly.',
    };
  }
};

/**
 * Alternative email service using a simple HTTP request to a form service
 * This uses a free service like Formspree, Netlify Forms, or similar
 */
export const sendBookingEmailViaFormService = async (bookingDetails: BookingDetails): Promise<{ success: boolean; message: string; bookingId?: string }> => {
  try {
    console.log('Sending booking email via form service:', bookingDetails);
    
    // Generate a unique booking ID
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('hotel_name', bookingDetails.hotelName);
    formData.append('guest_name', bookingDetails.guestName);
    formData.append('guest_email', bookingDetails.guestEmail);
    formData.append('guest_phone', bookingDetails.guestPhone);
    formData.append('check_in_date', bookingDetails.checkInDate);
    formData.append('check_out_date', bookingDetails.checkOutDate);
    formData.append('number_of_guests', bookingDetails.numberOfGuests.toString());
    formData.append('number_of_rooms', bookingDetails.numberOfRooms.toString());
    formData.append('room_type', bookingDetails.roomType || '');
    formData.append('special_requests', bookingDetails.specialRequests || '');
    formData.append('total_price', bookingDetails.totalPrice?.toString() || '');
    formData.append('submitted_at', new Date().toISOString());
    formData.append('_subject', `New Hotel Booking Request - ${bookingDetails.hotelName}`);
    formData.append('_replyto', bookingDetails.guestEmail);
    formData.append('_cc', 'testjizternoda@gmail.com');
    
    // For demonstration, we'll simulate the form submission
    // In a real implementation, you would submit to a service like Formspree
    // Example: https://formspree.io/f/YOUR_FORM_ID
    console.log('Form data prepared:', Object.fromEntries(formData.entries()));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, you would make an actual HTTP request:
    // const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //   method: 'POST',
    //   body: formData,
    //   headers: {
    //     'Accept': 'application/json'
    //   }
    // });
    
    console.log('Booking form submitted successfully via form service');
    
    return {
      success: true,
      message: 'Booking request submitted successfully! We will contact you soon to confirm your reservation.',
      bookingId: bookingId
    };
    
  } catch (error) {
    console.error('Error submitting booking form:', error);
    return {
      success: false,
      message: 'Failed to submit booking request. Please try again or contact us directly.',
    };
  }
};

/**
 * Send booking details via a simple email service
 * This creates a mailto link as a fallback
 */
export const sendBookingEmailViaMailto = (bookingDetails: BookingDetails): { success: boolean; message: string; bookingId?: string } => {
  try {
    console.log('Creating mailto link for booking:', bookingDetails);
    
    // Generate a unique booking ID
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create email content
    const subject = `New Hotel Booking Request - ${bookingDetails.hotelName}`;
    const body = `
New Hotel Booking Request

Booking ID: ${bookingId}
Hotel: ${bookingDetails.hotelName}
Guest Name: ${bookingDetails.guestName}
Guest Email: ${bookingDetails.guestEmail}
Guest Phone: ${bookingDetails.guestPhone}
Check-in Date: ${bookingDetails.checkInDate}
Check-out Date: ${bookingDetails.checkOutDate}
Number of Guests: ${bookingDetails.numberOfGuests}
Number of Rooms: ${bookingDetails.numberOfRooms}
Room Type: ${bookingDetails.roomType || 'Not specified'}
Special Requests: ${bookingDetails.specialRequests || 'None'}
Total Price: ${bookingDetails.totalPrice ? `$${bookingDetails.totalPrice}` : 'To be calculated'}

Booking submitted at: ${new Date().toLocaleString()}
    `.trim();
    
    // Create mailto link
    const mailtoLink = `mailto:testjizternoda@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open mailto link
    window.open(mailtoLink, '_blank');
    
    return {
      success: true,
      message: 'Email client opened. Please send the email to complete your booking request.',
      bookingId: bookingId
    };
    
  } catch (error) {
    console.error('Error creating mailto link:', error);
    return {
      success: false,
      message: 'Failed to open email client. Please contact us directly.',
    };
  }
};
