# Booking Email Setup Guide

This guide explains how to set up email functionality for the booking system to send booking details to `testjizternoda@gmail.com`.

## Current Implementation

The booking system includes multiple fallback methods for sending emails:

1. **EmailJS** (Primary method)
2. **Form Service** (Secondary method)
3. **Mailto Link** (Fallback method)

## Setup Instructions

### Option 1: EmailJS Setup (Recommended)

1. **Create an EmailJS account:**
   - Go to [https://www.emailjs.com/](https://www.emailjs.com/)
   - Sign up for a free account

2. **Create an email service:**
   - In the EmailJS dashboard, go to "Email Services"
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the setup instructions for your email provider

3. **Create an email template:**
   - Go to "Email Templates"
   - Click "Create New Template"
   - Use this template content:

   ```
   Subject: New Hotel Booking Request - {{hotel_name}}
   
   Dear Hotel Management,
   
   You have received a new booking request:
   
   Booking ID: {{booking_id}}
   Hotel: {{hotel_name}}
   Guest Name: {{guest_name}}
   Guest Email: {{guest_email}}
   Guest Phone: {{guest_phone}}
   Check-in Date: {{check_in_date}}
   Check-out Date: {{check_out_date}}
   Number of Guests: {{number_of_guests}}
   Number of Rooms: {{number_of_rooms}}
   Room Type: {{room_type}}
   Special Requests: {{special_requests}}
   Total Price: {{total_price}}
   
   Submitted at: {{submitted_at}}
   
   Please contact the guest to confirm the booking.
   
   Best regards,
   Ventus Hotel Booking System
   ```

4. **Update the configuration:**
   - Open `src/utils/emailService.ts`
   - Replace the placeholder values:
     ```typescript
     const EMAILJS_SERVICE_ID = 'your_service_id_here';
     const EMAILJS_TEMPLATE_ID = 'your_template_id_here';
     const EMAILJS_PUBLIC_KEY = 'your_public_key_here';
     ```

### Option 2: Form Service Setup (Alternative)

1. **Create a Formspree account:**
   - Go to [https://formspree.io/](https://formspree.io/)
   - Sign up for a free account

2. **Create a new form:**
   - Create a new form in Formspree
   - Set the email to `testjizternoda@gmail.com`
   - Copy the form endpoint URL

3. **Update the form service:**
   - Open `src/utils/emailService.ts`
   - Find the `sendBookingEmailViaFormService` function
   - Replace the comment with actual form submission:
     ```typescript
     const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
       method: 'POST',
       body: formData,
       headers: {
         'Accept': 'application/json'
       }
     });
     ```

### Option 3: Mailto Fallback (No Setup Required)

The system includes a mailto fallback that opens the user's default email client with pre-filled booking details. This works without any additional setup.

## Testing the Booking System

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Navigate to a hotel:**
   - Go to the search page
   - Click on a hotel
   - Click "Book Now"

3. **Fill out the booking form:**
   - Enter guest details
   - Select dates and room preferences
   - Click "Send Booking Request"

4. **Check the email:**
   - The booking details should be sent to `testjizternoda@gmail.com`
   - Check the console for any error messages

## Email Content

The booking email will include:

- **Booking ID**: Unique identifier for the booking
- **Hotel Information**: Name and details
- **Guest Information**: Name, email, phone
- **Stay Details**: Check-in/out dates, number of guests/rooms
- **Room Preferences**: Room type and special requests
- **Pricing**: Total price (if provided)
- **Timestamp**: When the booking was submitted

## Troubleshooting

### Common Issues:

1. **EmailJS not working:**
   - Check that the service ID, template ID, and public key are correct
   - Verify the email service is properly configured
   - Check the browser console for error messages

2. **Form service not working:**
   - Verify the form endpoint URL is correct
   - Check that the form is set to accept submissions
   - Ensure CORS is properly configured

3. **Mailto not working:**
   - Check that the user has a default email client configured
   - Verify the browser allows mailto links

### Debug Mode:

Enable debug logging by checking the browser console. All email sending attempts are logged with detailed information.

## Security Considerations

- Never expose API keys in client-side code in production
- Use environment variables for sensitive configuration
- Implement rate limiting for booking requests
- Validate all form inputs on both client and server side

## Production Deployment

For production deployment:

1. Set up proper email service configuration
2. Use environment variables for sensitive data
3. Implement proper error handling and logging
4. Add email confirmation for guests
5. Set up automated responses

## Support

If you encounter issues with the email setup, check:

1. Browser console for error messages
2. EmailJS/Formspree dashboard for service status
3. Network tab for failed requests
4. Email spam folder for test emails
