# Category pages release — 23 September 2026

## Gap review

| Area | Result |
| --- | --- |
| Admin access | Uses the existing content-editor allowlist and email verification. API checks enforce access independently of the header links. |
| Hotel selection | Hotel-only lookup, add/remove/reorder, duplicate prevention and a 50-hotel limit. Supplier requests are split at the proxy's 30-ID limit. |
| Public presentation | Reuses the hotel results template, filters, property links, date/guest selection and member pricing. The selected hotel order is preserved. |
| Homepage | Published, featured categories appear in the inspiration grid. Existing cards and slides can select a published category as their link. |
| Drafts and concurrent edits | Drafts remain private; publishing needs an image and a hotel. Duplicate URLs and stale saves are rejected. |
| Unsaved navigation — fixed during review | Header navigation now asks before leaving edited content. Unsaved content is retained per account and page in the browser tab, with restore/discard controls. Original versions are preserved when restoring. Late uploads/saves cannot populate a different editor page. |
| Deployment readiness — fixed during review | Backend startup now fails if CMS schema setup fails, preventing a successful deployment with missing category tables. |
| Persistence test gap — fixed during review | Added a real PostgreSQL test for idempotent schema creation, durable hotel ordering, draft/public visibility, duplicate URLs and simultaneous edits. |

Validation: 31 frontend tests and 26 backend tests passed, including all database
integration tests with no skips. TypeScript and the production build passed; the
build retains existing unrelated lint warnings. Desktop/mobile browser checks used
synthetic hotel data and covered creation, draft save, hotel selection, reordering,
publishing, homepage links, collection date searches, access denial, navigation
confirmation and recovery of unsaved changes. No supplier booking, payment or
outbound email was made as part of these checks.

## Release target

- Frontend: `https://destinations.ventustravel.co.uk` — Render service
  `ventus-app-staging` (`srv-d461fgbe5dus73cfcs4g`). Despite its name, this service
  serves the live destinations application. It requires a manual deployment.
- Backend: `https://ventus-backend.onrender.com` — Render service
  `srv-d49d499r0fns738gjhtg`.
- Repository branch: `JizterBonza/ventus-app`, `master`.

Deploy the backend before the frontend. Startup creates `category_pages` without
altering existing homepage, account or booking data. No new secrets or environment
variables are required. Existing `HOMEPAGE_EDITOR_EMAILS` accounts can open
**Admin → Category pages → New category** after the deployment.

URLs are `/admin/categories` for management and `/categories/:slug` for published
pages. Changing a saved slug changes its URL; the editor warns to update any manual
links. Unpublish and save to hide a public collection. Unsaved recovery copies are
limited to the current browser tab; explicit saves remain the durable record.

Rollback uses the prior frontend/backend commit `1dc574e83d334678d22c3a541b8248faed1b9fb4`.
The new table is additive and can remain in place during rollback.
