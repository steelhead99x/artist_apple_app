# Backend Reference Guide

## Quick Navigation Guide for `examples/backend`

This guide helps you quickly find the backend code you need when building frontend features.

---

## Directory Structure

```
examples/backend/
├── src/
│   ├── routes/          # API endpoints (main feature code)
│   ├── middleware/      # Rate limiting, CSRF protection
│   ├── jobs/           # Background jobs (cleanup, etc.)
│   ├── db.ts           # Database connection
│   ├── index.ts        # Server entry point
│   └── router.ts       # Route registration
├── schema.sql          # Database schema (primary)
├── migration_*.sql     # Database migrations
└── package.json        # Dependencies
```

---

## Key Route Files by Feature

### User Management & Auth
- **`auth.ts`** (910 lines) - Registration, login, password reset
- **`admin.ts`** (1,836 lines) - User management, approvals, admin operations
- **`adminBookingAgents.ts`** (490 lines) - Booking agent management

### Artist/Band Features
- **`bands.ts`** (648 lines) - Create bands, join bands, band limits
- **`bandMembers.ts`** (425 lines) - Member management, permissions
- **`bandMedia.ts`** - Band media uploads
- **`artistDashboard.ts`** (411 lines) - Artist dashboard data
- **`artistW2.ts`** (432 lines) - W-2 document management

### Tour & Booking Features
- **`tours.ts`** (320 lines) - Tour date CRUD, KPIs
- **`toursManagement.ts`** - Multi-date tour management
- **`tourPayments.ts`** - Tour payment processing
- **`eventStatusManagement.ts`** - Event status logic

### Venue Features
- **`bars.ts`** - Venue CRUD (called "bars" in DB)
- **`venue.ts`** (301 lines) - Premium content, band analytics
- **`venuePayments.ts`** - Venue payment management

### Studio Features
- **`studios.ts`** (135 lines) - Studio CRUD
- **`sessions.ts`** - Recording session management

### Booking Manager Features
- **`bookingManager.ts`** (572 lines) - User assignment, billing, features

### Payments & Subscriptions
- **`subscriptions.ts`** (626 lines) - Plan management, subscription CRUD
- **`payments.ts`** (410 lines) - Payment processing
- **`giftCards.ts`** (1,080 lines) - Gift card system
- **`adminGiftCards.ts`** (758 lines) - Admin gift card management

### Communication
- **`messages.ts`** (488 lines) - E2EE messaging
- **`contact.ts`** - Contact form submissions
- **`mailingList.ts`** - Mailing list management

### Streaming & Media
- **`liveStreams.ts`** (388 lines) - Live stream management
- **`streamingContent.ts`** (665 lines) - On-demand content
- **`mux.ts`** - Mux video integration
- **`muxPlayer.ts`** - Mux player endpoints
- **`livekit.ts`** - LiveKit token generation

### Reviews & Ratings
- **`reviews.ts`** - Review CRUD

### Utilities
- **`config.ts`** - Video configuration
- **`diagnostics.ts`** - System diagnostics
- **`passwordReset.ts`** - Password reset flow

---

## Database Schema Quick Reference

### Main Tables

#### Users Table
```sql
user_type: 'booking_agent' | 'booking_manager' | 'band' | 'bar' | 'studio' | 'user'
status: 'pending' | 'approved' | 'rejected' | 'deleted'
```

#### Bands Table
- Links to `users` table
- `booking_manager_id` - assigned manager
- `band_email` - auto-generated unique email
- `admin_email` - primary admin contact
- `status` - approval status

#### Venues Table (stored as `bars`)
- `venue_name`, `address`, `city`, `state`
- `capacity` - integer
- `amenities` - JSON

#### Tour Dates Table
- Links to `bands` and `venues`
- `booking_agent_id` - who created it
- `status`: 'pending', 'confirmed', 'cancelled', 'completed'
- `payment_amount`, `payment_currency`

#### Recording Studios Table
- `equipment` - JSON
- `daw_software` - DAW info
- `hourly_rate` - decimal
- `sonobus_enabled`, `webrtc_enabled` - booleans

#### Studio Sessions Table
- Links to `studios`, `bands`, `users`
- `connection_type`: 'sonobus' | 'webrtc' | 'both' | 'livekit'
- `livekit_room_name` - for LiveKit sessions

#### Subscription Plans Table
- `user_type`: 'user' | 'bar' | 'studio'
- `max_bands` - band limit per plan
- `price_monthly`, `price_yearly`

#### User Subscriptions Table
- Links to `users` and `subscription_plans`
- `billing_cycle`: 'monthly' | 'yearly'
- `status`: 'active' | 'cancelled' | 'expired' | 'past_due'
- `payment_method`

#### Tour Payments Table
- `venue_payment_amount` - total from venue
- `booking_agent_fee_percentage` & `booking_agent_fee_amount`
- `other_fees_amount`
- `total_band_payout` - amount distributed to band
- `payment_status`: 'pending' | 'succeeded' | 'failed' | 'cancelled'

#### Tour Member Payouts Table
- Individual payouts to band members
- `payout_amount`, `payout_status`
- `payment_method`, `transaction_hash`

---

## Common API Patterns

### Authentication
All protected routes use `authenticateToken` middleware:
```typescript
router.get('/protected', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  // user.userId, user.userType available
});
```

### Role Verification
```typescript
// Check user type
if (user.userType !== 'booking_agent') {
  return res.status(403).json({ error: 'Unauthorized' });
}

// Check admin booking agent
const userResult = await query(
  'SELECT is_admin_agent FROM users WHERE id = $1',
  [user.userId]
);
```

### Pagination Pattern
```typescript
const { limit = 20, offset = 0 } = req.query;
// Use LIMIT and OFFSET in queries
```

### Currency Handling
```typescript
import { convertToEth, isValidCurrency } from '../utils/currency.js';

const currency = payment_currency || 'USD';
if (!isValidCurrency(currency)) {
  return res.status(400).json({ error: 'Invalid currency' });
}

const conversion = await convertToEth(amount, currency);
// conversion.ethAmount, conversion.exchangeRate
```

### Soft Delete Pattern
```typescript
// Soft delete
await query(
  'UPDATE users SET deleted_at = NOW(), status = $1 WHERE id = $2',
  ['deleted', userId]
);

// Filter out deleted
WHERE deleted_at IS NULL
```

---

## API Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

### List Response
```json
{
  "success": true,
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

## Environment Variables

Required in backend `.env`:
```bash
# Database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=artist_space

# Auth
JWT_SECRET=your-secret-key

# Server
PORT=8787
CORS_ORIGIN=http://localhost:8081

# LiveKit (optional)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Mux (optional)
MUX_AUTOPLAY_PLAYBACK_ID=
```

---

## Common Queries You'll Need

### Get User's Bands
```typescript
const result = await query(`
  SELECT DISTINCT b.*,
    CASE WHEN b.user_id = $1 THEN 'owner' ELSE 'member' END as role
  FROM bands b
  LEFT JOIN band_members bm ON b.id = bm.band_id AND bm.user_id = $1
  WHERE b.user_id = $1 OR bm.id IS NOT NULL
`, [userId]);
```

### Get Band Subscription Level
```typescript
// Check band owner's subscription
const ownerSub = await query(`
  SELECT sp.max_bands, sp.name
  FROM bands b
  JOIN users u ON b.user_id = u.id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE b.id = $1
`, [bandId]);
```

### Get User's Active Subscription
```typescript
const sub = await query(`
  SELECT us.*, sp.*
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = $1 AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1
`, [userId]);
```

### Get Tour Dates with Details
```typescript
const tours = await query(`
  SELECT
    td.*,
    b.band_name,
    v.venue_name, v.city, v.state,
    tk.attendance, tk.bar_sales
  FROM tour_dates td
  JOIN bands b ON td.band_id = b.id
  JOIN venues v ON td.venue_id = v.id
  LEFT JOIN tour_kpis tk ON td.id = tk.tour_date_id
  WHERE td.band_id = $1
  ORDER BY td.date DESC
`, [bandId]);
```

---

## Testing the Backend Locally

1. **Install dependencies:**
   ```bash
   cd examples/backend
   npm install
   ```

2. **Setup database:**
   ```bash
   # Create database
   createdb artist_space

   # Run schema
   psql artist_space < schema.sql

   # Run migrations as needed
   psql artist_space < migration_*.sql
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run development server:**
   ```bash
   npm run dev
   # Server starts on http://localhost:8787
   ```

5. **Test endpoints:**
   ```bash
   # Health check
   curl http://localhost:8787/health

   # Register user
   curl -X POST http://localhost:8787/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password","name":"Test User","user_type":"user"}'

   # Login
   curl -X POST http://localhost:8787/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

---

## Migration Files to Review

If you need to understand database changes over time:

1. **`schema.sql`** - Base schema (start here!)
2. **`migration_add_band_approval.sql`** - Band approval system
3. **`migration_add_booking_manager_*.sql`** - Booking manager features
4. **`migration_subscription_payment_methods.sql`** - Payment methods
5. **`migration_e2ee_messaging.sql`** - Encrypted messaging
6. **`migration_streaming_content*.sql`** - Streaming features

---

## Key Features by Route File

### `auth.ts` - Authentication
- `POST /api/auth/register` - User registration (with user type)
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register/band` - Band registration with email
- `POST /api/auth/verify-band-email` - Verify band email

### `bands.ts` - Band Management
- `GET /api/bands` - List all bands
- `GET /api/bands/:id` - Get band details
- `GET /api/bands/my/all` - Get user's bands
- `GET /api/bands/my/limits` - Get band creation limits
- `POST /api/bands/create` - Create new band (checks limits)
- `POST /api/bands/join` - Join existing band
- `PUT /api/bands/:id` - Update band profile
- `GET /api/bands/:id/subscription` - Get band subscription level

### `artistDashboard.ts` - Artist Dashboard
- `GET /api/artist-dashboard/data` - All dashboard data (bands, tours, media, agents)
- `GET /api/artist-dashboard/payment-ledger` - Artist's payment history
- `GET /api/artist-dashboard/band-payment-summary/:bandId` - Band payment summary

### `tours.ts` - Tour Management
- `GET /api/tours` - List tour dates (filter by status, band, venue)
- `POST /api/tours` - Create tour date
- `PUT /api/tours/:id` - Update tour date
- `GET /api/tours/:id/kpis` - Get tour KPIs
- `POST /api/tours/:id/kpis` - Add KPIs (attendance, sales, etc.)
- `PUT /api/tours/:id/kpis` - Update KPIs

### `subscriptions.ts` - Subscriptions
- `GET /api/subscriptions/plans` - List subscription plans
- `GET /api/subscriptions/my-subscription` - Current user subscription
- `POST /api/subscriptions/subscribe` - Subscribe to plan
- `PUT /api/subscriptions/update` - Update subscription
- `PUT /api/subscriptions/cancel` - Cancel subscription

### `messages.ts` - Messaging
- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/conversation/:userId` - Get messages with user
- `POST /api/messages/send` - Send message
- `POST /api/messages/key-exchange` - E2EE key exchange
- `PUT /api/messages/:id/read` - Mark message as read

### `admin.ts` - Admin Operations
- `GET /api/admin/users` - List all users (filter by type, status)
- `PUT /api/admin/users/:id/approve` - Approve user
- `PUT /api/admin/users/:id/reject` - Reject user
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/pending-approvals` - Pending items

### `bookingManager.ts` - Booking Manager
- `GET /api/booking-manager/my-users` - Get assigned users
- `PUT /api/booking-manager/users/:id/status` - Update user status
- `PUT /api/booking-manager/users/:id/band-limit` - Set custom band limit
- `PUT /api/booking-manager/users/:id/billing-adjustment` - Create billing adjustment
- `POST /api/booking-manager/users/:id/features` - Assign feature
- `DELETE /api/booking-manager/users/:id` - Soft delete user

---

## Tips for Frontend Development

1. **Start with auth flow** - Register, login, token storage
2. **Test with different user types** - Create accounts for each role
3. **Use TypeScript interfaces** - Match backend response types
4. **Handle loading & error states** - Every API call needs both
5. **Implement optimistic updates** - Better UX while waiting for API
6. **Cache API responses** - Use React Query or similar
7. **Test offline behavior** - App should handle no connection gracefully

---

**Last Updated:** 2025-11-14
