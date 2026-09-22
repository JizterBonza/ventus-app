# Ventus reservations and additional booking emails

## What is implemented

Clients sign in and choose **My Bookings** in the account menu (`/my-bookings`).
They can see upcoming, past and cancelled reservations, booking references, guests,
rooms, benefits, totals and the hotel's payment/cancellation terms. Management of
an existing reservation does not require a current paid membership.

New bookings are linked to the signed-in Ventus user on the backend. The booking's
guest email can differ from the account email: that does not transfer account
ownership. Other clients cannot retrieve or cancel the booking. Agency-wide LE
booking endpoints are no longer exposed through the general `/v2` proxy.

The existing LE guest email remains enabled (`rooms[0].send_email_to_guest = true`).
A separate **Ventus Travel** email is queued after LE confirms the booking, with a
link to My Bookings and the supplier's reservation details. Pending bookings do not
receive a false confirmation. Confirmed cancellations also receive a Ventus email.
Mailgun is preferred, with the existing Resend fallback when Mailgun is not configured.

Emails are saved in `reservation_emails` in the same database transaction as the
reservation update and retried after provider failures/restarts. Database uniqueness
prevents a fresh job for a repeated confirmation/cancellation. Delivery is at least
once: a crash after the email provider accepts a message but before the database
commit can still result in a duplicate. An unsent confirmation is superseded if the
reservation has already been cancelled. No automatic catch-up emails are sent just
because a historical booking is linked by staff.

## Cancellation

1. The client clicks **Review cancellation**.
2. Ventus retrieves the current LE booking and displays its policies/deadline.
3. The client acknowledges those terms and clicks **Confirm cancellation**.
4. The backend rechecks ownership, the five-minute review, unchanged reservation
   details and LE's `is_cancellable` flag before sending `DELETE` once.
5. Only LE's documented HTTP 200 cancellation response marks the booking cancelled.

The supplier's deadline text is displayed as provided; a timezone is not invented
for timestamps without one. The fresh supplier flag and LE's cancellation endpoint
enforce eligibility. When online cancellation is unavailable, the screen directs
the client to Ventus. Late cancellations require staff assistance and hotel terms
still apply. No refund amount or fee is guessed.

Timeouts and ambiguous responses are recorded as uncertain. Neither booking nor
cancellation mutations are automatically retried. A later supplier status refresh
can confirm cancellation. If LE still reports booked, staff must investigate before
clearing `cancellation_state`; do not clear it merely to enable another click.

## Linking existing reservations

LE's documented Booking/BookingRoom schemas do not include a customer email suitable
for assigning account ownership. Existing bookings are therefore reviewed by staff.
Do not infer ownership from matching guest names or a supplied booking ID alone.

1. Set `RESERVATION_MANAGER_EMAILS` on the backend to the designated staff accounts.
   This is a separate explicit permission; it is empty/disabled by default.
2. Staff must also have a matching verified email in the existing staff-verification
   flow at `/admin/homepage`. `HOMEPAGE_EDITOR_EMAILS` controls access to that flow.
   For the current shared staff workflow, use the designated homepage administrators;
   adding someone to that setting also grants homepage editing permission.
3. Open `/admin/reservations`. Search unlinked LE bookings by reference, guest or hotel.
4. Review the booking against the original correspondence, enter the client's verified
   Ventus account email, explicitly confirm ownership, and link it.

The database records the staff user responsible. Linking cannot overwrite an
existing owner, and unverified/nonexistent client accounts are rejected. The client
can then refresh My Bookings. Customers see a contact link for missing reservations.

Uncertain booking submissions that LE accepted but Ventus could not save can also
be recovered through this screen. `reservation_attempts` prevents resubmission of
the original session. Any reassignment or reconciliation must be reviewed by staff.

## Deployment and status updates

Deploy backend and frontend together. Backend startup creates the reservation,
booking-attempt, cancellation-review and email-queue tables. Existing users and
subscriptions are preserved. Use separate staging and production databases/API keys.

Required existing settings:

- `HOTEL_API_BASE` and `HOTEL_API_TOKEN` for the correct LE environment.
- Mailgun's configured domain/key/sender, or Resend plus a verified sender.
- Optional `BOOKING_FROM_EMAIL` to override the default Ventus sender.
- `BOOKING_NOTIFICATION_EMAIL` for replies (defaults to Daniella in code).
- `PUBLIC_APP_URL=https://destinations.ventustravel.co.uk` for email links.

No webhook is required for the immediate Ventus confirmation after a successful
website booking. The backend refreshes stored active reservations in bounded batches
every minute when their last sync is at least five minutes old. Client visits also
refresh older saved details. Supplier outages display a stale-data notice and disable
cancellation until a fresh review succeeds. Queued emails are checked every 15 seconds.

For faster LE-originated status changes, configure optional webhooks with LE:

- Events: `hotel_booking_create`, `hotel_booking_update`, `hotel_booking_cancel`.
- Destination: `https://ventus-backend.onrender.com/api/le/webhook`.
- Set a random `LE_WEBHOOK_ACCESS_KEY` of at least 32 characters on the backend.
- Ask LE to send it in **`x-ventus-webhook-key`**. This header name is Ventus's contract
  and must be agreed with LE; their documentation does not specify the transport.
  Transfer the key securely and do not put it in a URL or source file.

Only known, owned reservations are refreshed on webhook receipt. The endpoint
authenticates the access key, then fetches the booking through the authenticated LE
API; it never trusts the webhook's asserted status or invents ownership for new IDs.
The webhook has not been registered with LE by this code change.

## Validation

Run `npm test` in `backend` with `RESERVATIONS_TEST_DATABASE_URL` set to a disposable
PostgreSQL database. Tests create and remove an isolated schema, mock LE and email
calls, and cover account isolation, repeat bookings, email retries, pending states,
changed/expired cancellation reviews, concurrent cancellation, ambiguous outcomes,
webhook authentication and restricted historical linking. Without that variable the
database integration test is skipped. Frontend tests run with `CI=true npm test --
--watch=false --runInBand` at the repository root.

Before production rollout, use an approved LE staging booking to check the live
supplier contract, verify receipt of both LE and Ventus emails, and cancel that test
booking through My Bookings. Confirm the manager allowlist and linking workflow.
The local tests do not create or cancel real reservations and do not send real email.

## Official LE references

- [OpenAPI definitions](https://api-staging.littleemperors.com/docs/content)
- [Booking lifecycle](https://api-staging.littleemperors.com/docs/hotel-booking)
- [Webhook configuration](https://api-staging.littleemperors.com/docs/webhooks)

Retrieved 23 September 2026. Documented supplier endpoints are GET/POST
`/v2/hotels/bookings` and GET/DELETE `/v2/hotels/bookings/{booking_id}`.
