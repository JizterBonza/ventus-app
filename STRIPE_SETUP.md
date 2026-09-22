# Ventus membership checkout

Stripe hosted Checkout now supports the existing £299 payment for one year of
membership. It is a one-off payment, with no automatic renewal. Existing membership
codes are priced by the backend; complimentary codes retain their existing flow.
Stripe is preferred when configured; PayPal remains the fallback.

## Activation

The implementation is local until deployed. Adding credentials alone to the old
production code will not enable Stripe.

On Render's **ventus-backend** service, store these server environment variables:

- `STRIPE_SECRET_KEY`: the Ventus account's secret or appropriately restricted key.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the webhook destination below.
- `PUBLIC_APP_URL=https://destinations.ventustravel.co.uk`

Transfer secrets directly using the hosting platform's environment settings or a
secret manager. Do not send them by email/chat, put them in source control, or use
`REACT_APP_*`. Hosted Checkout does not need a browser publishable key. See
[Stripe's key handling guidance](https://docs.stripe.com/keys-best-practices).

Create a Stripe webhook destination at:

`https://ventus-backend.onrender.com/api/stripe/webhook`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `charge.dispute.created`

Both credentials must belong to the same Stripe account and mode. Configure and
validate test mode on staging first, then use the live key and live destination's
signing secret in production. A restricted key needs Checkout Session create/read
and expiry access, plus read access to the expanded PaymentIntent/Charge and
PaymentIntent retrieval. Validate those permissions in test mode.

Deploy the backend and frontend together. Backend startup creates an order table
and adds a nullable Stripe session reference with a unique index to subscriptions.
It preserves existing subscriptions. The public `/api/subscriptions/config` reports
`stripe.configured: true` when both credential formats are present; this flag is
not proof that the credentials or webhook delivery work.

## Behaviour and validation

- Prices, currency, plan, coupon validity and account ownership are checked on the
  server. The browser cannot activate membership by supplying a success URL.
- The return page and signed webhooks retrieve the payment from Stripe and use the
  same database transaction to activate membership exactly once per checkout.
- Repeated checkout clicks reuse an open session. Applying a different priced code
  expires the earlier session before opening a replacement.
- Full refunds and disputes revoke the corresponding membership. Late completion
  events cannot reactivate it. Partial refunds retain access. Reinstating a resolved
  dispute currently requires an operator decision; it is not automatic.
- Only card payments are enabled. Checkout can display eligible card wallets.
- No real payments were made during local validation. Stripe requests are mocked;
  signature verification uses Stripe's SDK and persistence tests use PostgreSQL.

To run the database integration tests, point `STRIPE_TEST_DATABASE_URL` at a
disposable PostgreSQL database and run `npm test` in `backend`. Each run creates
and removes an isolated schema; it does not contact Stripe. Without that variable,
the database integration test is skipped and credential tests still run.

Before activating live checkout, validate a test payment, a declined payment,
cancellation/back navigation, a discounted payment, repeated webhook delivery,
payment with the browser closed before return, a full refund, and membership
access after signing back in. Check webhook delivery in Stripe. Apply Ventus
branding and support details in the Stripe account's Checkout settings.

References: [Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create),
[fulfilment](https://docs.stripe.com/checkout/fulfillment),
[webhook signatures](https://docs.stripe.com/webhooks/signature).

## Separate hotel booking work

The reservation service now links new bookings to client accounts, supports
viewing and eligible cancellations, and queues additional Ventus emails while
keeping LE emails enabled. Historical bookings can be linked through the restricted
staff screen. See [RESERVATIONS_SETUP.md](RESERVATIONS_SETUP.md) for setup,
validation and the optional LE webhook configuration.
