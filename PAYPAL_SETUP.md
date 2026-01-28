# PayPal Integration Setup Guide

This application uses PayPal as the only payment method for both bookings and subscriptions.

## Setup Instructions

### ✅ PayPal Credentials Configured

Your PayPal Client ID and Secret Key have been configured in the following files:

#### Frontend Files (Client ID):
- ✅ `public/index.html` - PayPal SDK script
- ✅ `src/components/shared/BookingForm.tsx` - PayPal SDK script URL
- ✅ `src/components/shared/SubscriptionModal.tsx` - PayPal SDK script URL

#### Backend Configuration (Secret Key):
- ✅ `backend/ENV_example.txt` - PayPal credentials template
- Add to your `.env` file for backend PayPal verification

**Client ID:** `AfaoowvVXx5dXMEisezXWp4ZQpQm_3lRs-7YmDJc4-dDTFb529Tso9nmdCEF6P6Yn_wwnSpP_z0w10dk`  
**Secret Key:** `EMPNpEciL8qsSBvv4emt4G5EFhhtMjm6lddSMbYoS6jyKMxH8fsXClMwyexbbfg7Q925uNfcF_dEZJZm`

### For Production:
- Switch to your **Live Client ID** and **Live Secret Key** from PayPal Dashboard
- Update `PAYPAL_MODE=live` in your backend `.env` file

### 3. Environment Variables (Optional - Recommended)

For better security, consider using environment variables:

1. Create a `.env` file in the root directory:
```env
REACT_APP_PAYPAL_CLIENT_ID=your_client_id_here
```

2. Update the PayPal SDK script URLs to use the environment variable:
```javascript
const paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'YOUR_CLIENT_ID';
script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
```

### 4. Testing

1. **Sandbox Testing**: Use PayPal Sandbox accounts to test payments
   - Create test accounts at: https://developer.paypal.com/dashboard/accounts
   - Use test buyer/seller accounts for testing

2. **Production**: Switch to Live Client ID when ready for production

## Payment Flow

### Bookings
1. User fills out booking form
2. User selects room type and rate
3. PayPal button appears with calculated total
4. User completes PayPal payment
5. Booking is submitted with PayPal order ID

### Subscriptions
1. User selects subscription plan
2. User fills out registration form
3. If price > 0, PayPal button appears
4. User completes PayPal payment
5. Subscription is activated with PayPal order ID

## Backend Integration

The backend currently accepts PayPal payment details. For production, you should verify payments server-side:

1. **Install PayPal SDK on backend:**
   ```bash
   npm install @paypal/checkout-server-sdk
   ```

2. **Add PayPal credentials to backend `.env` file:**
   ```env
   PAYPAL_CLIENT_ID=AfaoowvVXx5dXMEisezXWp4ZQpQm_3lRs-7YmDJc4-dDTFb529Tso9nmdCEF6P6Yn_wwnSpP_z0w10dk
   PAYPAL_SECRET_KEY=EMPNpEciL8qsSBvv4emt4G5EFhhtMjm6lddSMbYoS6jyKMxH8fsXClMwyexbbfg7Q925uNfcF_dEZJZm
   PAYPAL_MODE=sandbox
   ```

3. **Implement server-side verification** in `backend/server.js`:
   - Use the Secret Key to verify PayPal orders
   - This prevents fraud and ensures payments are legitimate
   - See TODO comment in subscription route for implementation details

4. **Store payment transaction IDs** in database for record-keeping

## Notes

- All credit card fields have been removed
- PayPal is now the only payment method
- Free subscriptions (price = 0) don't require payment
- PayPal order ID is stored and sent to backend for verification
