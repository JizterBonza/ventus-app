# Ventus Mailgun email setup

## Current implementation

Confirmed LE bookings now also queue a separate branded Ventus confirmation and
cancellation email through the reservation service. LE's own guest email remains
enabled. This is distinct from the booking-request acknowledgement described below.
See [reservation setup](RESERVATIONS_SETUP.md) for durable retries, status updates,
historical linking and deployment checks.

The backend supports Mailgun for password-reset messages, booking-request notifications to the Ventus team, and separate booking acknowledgements to guests. Mailgun is preferred when its API key, sending domain and sender are configured. Existing Resend and EmailJS configurations remain available when Mailgun is not configured; delivery errors do not trigger a second provider and risk duplicate messages.

Booking requests are saved to PostgreSQL before notifications are attempted. A notification failure is logged without undoing the saved request. Notifications currently run in the server process, without a durable retry queue. Password-reset requests report a delivery error if the provider rejects the message. Mailgun acceptance means queued, not confirmed inbox delivery.

Mailgun credentials are used only by `backend/mailgun.js`. No Mailgun key belongs in a `REACT_APP_*` variable or browser code. Tracking is disabled for these transactional emails, including password-reset links.

## Mailgun account setup

The approved setup uses the existing **Vinadamo / Foundation 50k** account with a dedicated Ventus domain and domain-scoped sending key. It does not require a plan change or a subaccount.

### Live setup status — 16 September 2026

- Signed in successfully to Vinadamo (`info@vinadamo.com`). The account activation banner has cleared.
- Created **mg.ventustravel.co.uk** in the **EU** region, using shared IPs and a **2048-bit DKIM** key.
- Created a domain sending key described as **Ventus backend — mg.ventustravel.co.uk**. The key is scoped to this domain, rather than the whole Vinadamo account.
- Both SPF (`mg.ventustravel.co.uk`) and the 2048-bit DKIM record (`email._domainkey.mg.ventustravel.co.uk`) are saved in Squarespace and resolve publicly. Mailgun reports SPF **Verified** and DKIM **Active**.
- Render CLI access is available for `ventus-backend` (`srv-d49d499r0fns738gjhtg`). Its source is `JizterBonza/ventus-app`, branch `master`, root directory `backend`.
- Saved and verified `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`, `MAILGUN_FROM_EMAIL`, and `BOOKING_NOTIFICATION_EMAIL` on the Render backend. The user explicitly approved saving the key to this service; it was transferred directly through the browser and was not written to a local file. Deployment uses the backend integration in this repository via Render’s `master` branch. A live Mailgun EU API test using this saved key returned HTTP 200 in test mode, with no email delivered.

[Mailgun domain settings](https://app.eu.mailgun.com/mg/sending/mg.ventustravel.co.uk/settings?tab=dns) contain the live verification status. See `MAILGUN_DNS_SETUP.md` for the exact DNS records. Preserve the root domain's Google mail MX records.

## Backend configuration

On the `ventus-backend` Render service, configure:

| Variable | Value |
| --- | --- |
| `MAILGUN_API_KEY` | Sending key scoped to `mg.ventustravel.co.uk` |
| `MAILGUN_DOMAIN` | `mg.ventustravel.co.uk` (verified) |
| `MAILGUN_REGION` | `EU` |
| `MAILGUN_FROM_EMAIL` | Sender on that domain, e.g. `Ventus Travel <no-reply@mg.ventustravel.co.uk>` |
| `PASSWORD_RESET_REPLY_TO` | `daniella@ventustravel.co.uk` |
| `BOOKING_NOTIFICATION_EMAIL` | `daniella@ventustravel.co.uk` |
| `PUBLIC_APP_URL` | `https://destinations.ventustravel.co.uk` |

`PASSWORD_RESET_FROM_EMAIL` and `BOOKING_FROM_EMAIL` override the default sender for their respective messages. Review any existing overrides before switching providers. Use the actual verified sender/domain, not an unverified example. The API defaults to the US region if `MAILGUN_REGION` is omitted.

For local configuration, copy `backend/ENV_example.txt` to `backend/.env`, which is ignored by Git. Run the backend with Node.js 18 or newer. The existing server already requires the built-in Fetch API; Mailgun also uses its built-in FormData implementation.

The backend code and saved environment configuration must be deployed together when activating the integration. The frontend does not need a Mailgun key or a rebuild for this provider change. Contact and Buy Outs form delivery are not connected by this integration.

## Verification

Run the isolated email tests:

```sh
cd backend
npm test
```

All eight isolated email tests pass. They mock provider requests and send no real emails. They cover password-reset content and tracking, US/EU routing, separate booking recipients, error handling, invalid configuration, and the existing provider paths.

After production activation, request a password reset for an approved test account, then submit an approved test booking through the normal member flow. Check Mailgun's accepted/delivered events and the recipient inboxes. Confirm that the reset link works and that the guest acknowledgement says the booking is a request awaiting confirmation.

## References

- [Mailgun test mode](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/test-mode)
- [Sending messages over HTTP](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-http)
