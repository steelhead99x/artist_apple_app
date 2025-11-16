## Supporter User Type: Backend/API Backlog

This document tracks the initial implementation tasks required to launch the Supporter persona introduced in the registration flow.

### 1. Auth & Identity
- Add `supporter` to backend `user_type` enum, validation, and seed data.
- Extend `/auth/register` to accept Supporter metadata plus optional `referrer_code`.
- Stand up OAuth endpoints for Facebook, Google, Patreon, and Artist Space SSO (`/auth/oauth/:provider/callback`), returning `supporter`-scoped JWTs.
- Store linked social accounts for revocation management and future re-auth flows.

### 2. Supporter Profile Service
- Create `supporter_profiles` table (preferences, loyalty tier, wallet tokens, default payment method).
- Provide CRUD endpoints (`/supporters/profile`, `/supporters/preferences`).
- Add notification preference ingestion for presale alerts and wallet auto-add.

### 3. Events & Inventory
- Define `events`, `event_showtimes`, `ticket_types`, `ticket_inventory`, and `event_add_ons` tables owned by venues/booking agents.
- Build public read endpoints (`/supporter/events`, `/supporter/events/:id`) with filtering (city, date, genre, venue).
- Allow venues/agents to allocate presale/GA/VIP quantities and sync capacity limits with tour dates.

### 4. Ticket Orders
- Create `orders`, `order_items`, `tickets`, and `ticket_transfers` tables with status flows (pending → confirmed → checked_in/refunded).
- Implement `/supporter/orders` (create/list/detail) with payment intents (Stripe, Apple Pay, Google Pay wallets).
- Attach asynchronous Stripe webhook processor to confirm payment and mint ticket records.
- Emit transactional emails/push notifications on purchase, reminders, and transfer events.

### 5. Wallet & Credentialing
- Service to generate unique QR payload + short code per ticket; persist signature + nonce.
- Apple Wallet: configure PKPass template per venue, add `/tickets/:id/wallet/apple` endpoint that signs + returns `.pkpass`.
- Google Pay: JWT signing flow + `/tickets/:id/wallet/google` endpoint that returns `saveToGooglePayUrl`.
- Scheduled job to refresh wallet passes when event metadata changes or ticket status updates.

### 6. Entry Validation
- `/tickets/:id/check-in` endpoint accessible by venues/agents with role-based auth; enforces single-use or multi-entry rules.
- Event-day websocket or SSE feed for real-time scan audit trail and capacity dashboards.
- Rate limiting + anomaly detection (duplicate scans, geographic anomalies).

### 7. Social & Engagement
- Follow/favorite endpoints so supporters can subscribe to artists/venues and receive event alerts.
- Patreon entitlement sync service to map tiers → presale unlocks.
- Review/feedback submission endpoint post-event with moderation queue.

### 8. Admin & Support Tooling
- Backoffice UI/API to resend wallet passes, refund orders, revoke tickets, or complete manual check-ins.
- Audit logs for each critical action (purchase, refund, transfer, credential issue).
- Reporting endpoints for ticket sales, attendance, and wallet adoption metrics.

> Track progress by referencing this backlog in PR descriptions (e.g., `Supporter Backlog #3`).


