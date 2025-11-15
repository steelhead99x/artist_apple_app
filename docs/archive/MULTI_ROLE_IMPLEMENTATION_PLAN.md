# Multi-Role Features Implementation Plan

## Overview
This document outlines the complete implementation plan for building all user role features in the Artist Space Apple app based on the backend API at `examples/backend`.

---

## User Roles & Their Features

### 1. ARTIST/BAND Role Features

#### Dashboard (`src/screens/ArtistDashboard.tsx`)
**API Endpoints:**
- `GET /api/artist-dashboard/data` - All dashboard data
- `GET /api/artist-dashboard/payment-ledger` - Payment history
- `GET /api/artist-dashboard/band-payment-summary/:bandId` - Band payment summary

**Features to Build:**
- [ ] **My Bands Section**
  - Show all bands user owns or is member of
  - Display role (owner/member) for each band
  - Show booking manager info if assigned
  - Quick actions: View, Edit, Manage Members

- [ ] **Tours/Events Section**
  - Upcoming gigs with countdown
  - Past performances with status
  - Tour details: venue, date, time, payment
  - Map showing tour locations
  - Filter: All, Upcoming, Completed, Cancelled

- [ ] **Media Gallery**
  - Display band media (images, videos, audio, documents)
  - Upload new media
  - Organize by band
  - Media types: promo photos, videos, press kits

- [ ] **Payment Ledger**
  - Individual artist payments from tour dates
  - Payment status: pending, paid, failed
  - Payment method: ETH, bank transfer, etc.
  - View payment details per gig
  - Total earnings summary

- [ ] **Booking Agents Section**
  - List of booking agents/managers
  - Contact information
  - Quick message button

#### Band Management (`src/screens/BandManagement.tsx`)
**API Endpoints:**
- `GET /api/bands/my/all` - Get user's bands
- `GET /api/bands/my/limits` - Get band creation limits
- `POST /api/bands/create` - Create new band
- `POST /api/bands/join` - Join existing band
- `PUT /api/bands/:id` - Update band profile
- `GET /api/bands/:id/subscription` - Get band subscription level

**Features to Build:**
- [ ] **Create Band Flow**
  - Check subscription limits before showing form
  - Band name with duplicate detection
  - Genre, description, website
  - Social links (Instagram, Facebook, Twitter, Spotify)
  - Contact info (email, phone, address)
  - Recovery email
  - Solo artist option (auto-generates name)
  - Upsell message if limit reached

- [ ] **Join Band Flow**
  - Search for band by name
  - Send join request
  - Specify role (vocals, guitar, drums, etc.)
  - Pending approval notification

- [ ] **Band Profile Editor**
  - Edit all band information
  - Assign booking manager
  - Upload band photo
  - Manage social media links
  - Contact preferences

#### Band Members (`src/screens/BandMembers.tsx`)
**API Endpoints:**
- `GET /api/band-members/:bandId` - List members
- `POST /api/band-members/:bandId` - Add member
- `PUT /api/band-members/:bandId/:memberId` - Update member
- `DELETE /api/band-members/:bandId/:memberId` - Remove member
- `PUT /api/band-members/:bandId/:memberId/approve` - Approve pending member

**Features to Build:**
- [ ] **Members List**
  - Show all band members with roles
  - Member status: active, pending, inactive
  - Member permissions display

- [ ] **Member Management** (for band owners)
  - Approve/reject join requests
  - Assign/change roles
  - Set permissions:
    - Can modify profile
    - Can receive band emails
    - Can manage members
    - Is owner
  - Remove members

- [ ] **Invite System**
  - Invite via email
  - Generate invite link
  - Track pending invitations

#### W-2 Documents (`src/screens/W2Documents.tsx`)
**API Endpoints:**
- `GET /api/artist-w2/:bandId` - Get W-2 documents
- `POST /api/artist-w2/:bandId` - Upload W-2
- `GET /api/artist-w2/:bandId/:year` - Download specific year

**Features to Build:**
- [ ] **Document List**
  - List W-2s by year
  - Download/view PDF
  - Upload status

- [ ] **Upload Flow**
  - Select year
  - Choose PDF file
  - Upload progress indicator
  - Success confirmation

---

### 2. RECORDING STUDIO Role Features

#### Studio Dashboard (`src/screens/StudioDashboard.tsx`)
**API Endpoints:**
- `GET /api/studios/:id` - Studio profile
- `GET /api/sessions` - Studio sessions
- `POST /api/sessions` - Create session

**Features to Build:**
- [ ] **Studio Stats**
  - Bookings this week/month
  - Available time slots
  - Total booked hours
  - Revenue summary

- [ ] **Session Calendar**
  - Weekly/monthly view
  - Session status: active, completed, cancelled
  - Quick session details

- [ ] **Session Management**
  - View session details
  - Band info, date, duration
  - Connection type: SonoBus, WebRTC, LiveKit
  - Session notes
  - Recording files
  - Start/end session

- [ ] **Studio Profile Editor**
  - Studio name, description
  - Address/location
  - Equipment list (JSON)
  - DAW software (Pro Tools version, etc.)
  - Hourly rate
  - SonoBus/WebRTC enabled toggles
  - ETH wallet, website

#### Studio Sessions (`src/screens/StudioSessions.tsx`)
**Features to Build:**
- [ ] **Active Session View**
  - LiveKit room integration
  - Connection status indicator
  - Timer/duration tracker
  - Recording controls
  - Session notes editor

- [ ] **Session History**
  - Past sessions with bands
  - Duration, date, status
  - Recording files access
  - Session notes review

---

### 3. VENUE Role Features

#### Venue Dashboard (`src/screens/VenueDashboard.tsx`)
**API Endpoints:**
- `GET /api/bars` - Venue list (bars endpoint)
- `GET /api/venue/premium-content` - Premium video assets
- `GET /api/venue/bands/premium-info` - Band analytics

**Features to Build:**
- [ ] **Venue Stats**
  - Events this month
  - New inquiries
  - Venue capacity
  - Average rating

- [ ] **Event Calendar**
  - Upcoming shows
  - Past events
  - Event details: band, date, time, status
  - Attendance tracking

- [ ] **Premium Features** (for premium subscribers)
  - 5 Mux video assets
  - Band analytics:
    - Total shows at venue
    - Average attendance
    - Total revenue generated
    - Band rating
    - Upcoming shows count
    - Last performance date
  - Band member information
  - Social media stats

- [ ] **Venue Profile Editor**
  - Venue name, address
  - City, state (location picker)
  - Capacity
  - Description
  - Amenities (JSON)
  - ETH wallet

#### KPI Management (`src/screens/VenueKPIs.tsx`)
**API Endpoints:**
- `GET /api/tours/:id/kpis` - Get KPIs
- `POST /api/tours/:id/kpis` - Add KPIs
- `PUT /api/tours/:id/kpis` - Update KPIs

**Features to Build:**
- [ ] **KPI Entry Form**
  - Attendance count
  - Bar sales amount
  - Sales currency selector
  - New customers count
  - Notes

- [ ] **KPI Dashboard**
  - Show KPIs per event
  - Trends/charts
  - Performance comparisons

---

### 4. BOOKING AGENT Role Features

#### Admin Dashboard (`src/screens/AdminDashboard.tsx`)
**API Endpoints:**
- `GET /api/admin/stats` - Overall statistics
- `GET /api/admin/users` - All users
- `GET /api/admin/pending-approvals` - Pending items
- `GET /api/admin-booking-agents/managed-users` - Agent's users

**Features to Build:**
- [ ] **Agent Stats**
  - Total users managed
  - Pending approvals
  - Active bookings
  - Revenue metrics

- [ ] **User Management**
  - List all users by type
  - Filter: All, Artists, Bands, Studios, Venues
  - User status: pending, approved, rejected, deleted
  - Quick actions: Approve, Reject, Edit, Delete

- [ ] **Approval Queue**
  - Pending user registrations
  - Pending band creations
  - Duplicate band warnings
  - Bulk approve/reject

- [ ] **Agent Management** (for admin agents)
  - List booking agents
  - Agent status: pending, active, suspended
  - Assign agent permissions

#### Tour Management (`src/screens/TourManagement.tsx`)
**API Endpoints:**
- `GET /api/tours` - All tour dates
- `POST /api/tours` - Create tour date
- `PUT /api/tours/:id` - Update tour
- `GET /api/tours-management/bands` - Bands for tour
- `POST /api/tours-management/tours/:tourId/dates` - Add tour date

**Features to Build:**
- [ ] **Tour List**
  - All tours with status
  - Filter by: band, venue, date, status
  - Search functionality

- [ ] **Create Tour Booking**
  - Select band (dropdown)
  - Select venue (dropdown)
  - Date picker
  - Start/end time
  - Payment amount & currency
  - Notes

- [ ] **Tour Details**
  - Band & venue info
  - All tour dates
  - Payment status
  - KPIs if available
  - Edit/cancel options

#### Payment Management (`src/screens/PaymentManagement.tsx`)
**API Endpoints:**
- `GET /api/tour-payments` - All payments
- `POST /api/tour-payments` - Create payment
- `PUT /api/tour-payments/:id` - Update payment
- `POST /api/tour-payments/:id/member-payouts` - Distribute to members

**Features to Build:**
- [ ] **Payment Dashboard**
  - Pending payments
  - Completed payments
  - Payment history
  - Total amounts

- [ ] **Payment Entry**
  - Select tour date
  - Venue payment amount
  - Booking agent fee (percentage & amount)
  - Other fees
  - Calculate total band payout
  - Payment method
  - Transaction hash (for crypto)

- [ ] **Member Payout Distribution**
  - List band members
  - Assign payout amount per member
  - Payment method per member
  - Payout status tracking

#### Gift Card System (`src/screens/GiftCardAdmin.tsx`)
**API Endpoints:**
- `GET /api/admin-gift-cards` - List gift cards
- `POST /api/admin-gift-cards` - Create gift card
- `PUT /api/admin-gift-cards/:id` - Update gift card
- `GET /api/admin-gift-cards/:id/transactions` - Card transactions

**Features to Build:**
- [ ] **Gift Card List**
  - All gift cards with status
  - Balance, issued amount
  - Expiration date
  - Recipient info

- [ ] **Create Gift Card**
  - Recipient type: user, band, venue, studio
  - Recipient selector
  - Amount
  - Expiration date
  - Reason/notes

- [ ] **Gift Card Details**
  - Transaction history
  - Balance changes
  - Redemption log
  - Deactivate option

---

### 5. BOOKING MANAGER Role Features

#### Manager Dashboard (`src/screens/ManagerDashboard.tsx`)
**API Endpoints:**
- `GET /api/booking-manager/my-users` - Assigned users
- `PUT /api/booking-manager/users/:userId/status` - Update user status
- `PUT /api/booking-manager/users/:userId/band-limit` - Set band limit
- `DELETE /api/booking-manager/users/:userId` - Soft delete user

**Features to Build:**
- [ ] **Assigned Users List**
  - Filter by user type
  - User status badges
  - Subscription info
  - Quick actions menu

- [ ] **User Editor**
  - Update user status
  - Set custom band limits
  - View subscription details
  - Manage billing adjustments

- [ ] **Feature Assignment**
  - Assign features to users
  - Set feature expiration
  - Enable/disable features

- [ ] **Billing Adjustments**
  - Create billing adjustment
  - Set discount percentage
  - Original vs adjusted amount
  - Adjustment reason

#### User State Management (`src/screens/UserStateManagement.tsx`)
**API Endpoints:**
- `POST /api/booking-manager/users/:userId/states` - Assign state
- `DELETE /api/booking-manager/users/:userId/states/:stateId` - Remove state

**Features to Build:**
- [ ] **State Assignment**
  - State type selector
  - State value input
  - Metadata (JSON)
  - Active toggle

- [ ] **State Viewer**
  - List all user states
  - Filter active/inactive
  - Edit/remove states

---

## Shared Features (All Roles)

### Messaging (`src/screens/Messages.tsx` & `src/screens/Chat.tsx`)
**API Endpoints:**
- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/conversation/:userId` - Messages with user
- `POST /api/messages/send` - Send message
- `POST /api/messages/key-exchange` - E2EE key exchange

**Features to Build:**
- [ ] **Conversation List**
  - All conversations
  - Unread count badges
  - Last message preview
  - Timestamp
  - Search conversations

- [ ] **Chat Screen**
  - Message bubbles (sent/received)
  - E2EE indicator
  - Send text messages
  - Send attachments
  - Message status: sending, sent, delivered, read
  - Typing indicators

- [ ] **Compose New Message**
  - Search users
  - Select recipient
  - Start conversation

### Subscriptions (`src/screens/Subscriptions.tsx`)
**API Endpoints:**
- `GET /api/subscriptions/plans` - Available plans
- `GET /api/subscriptions/my-subscription` - Current subscription
- `POST /api/subscriptions/subscribe` - Subscribe to plan
- `PUT /api/subscriptions/cancel` - Cancel subscription
- `POST /api/payments/create-payment-intent` - Create Stripe payment

**Features to Build:**
- [ ] **Plans List**
  - Free, Premium, Streaming Pro tiers
  - Pricing: monthly/yearly toggle
  - Feature comparison
  - Max bands per plan
  - Highlight recommended plan

- [ ] **Current Subscription**
  - Plan name & price
  - Billing cycle
  - Next payment date
  - Cancel at period end status
  - Payment method

- [ ] **Subscription Flow**
  - Select plan
  - Choose billing cycle
  - Payment method: Stripe, ETH, Gift Card
  - Confirmation screen

- [ ] **Payment Methods**
  - Stripe integration
  - ETH wallet connection
  - Gift card redemption
  - Saved payment methods

### Profile (`src/screens/Profile.tsx`)
**Features to Build:**
- [ ] **Profile Editor**
  - Name, email
  - Recovery email
  - Profile photo upload
  - Bio/description
  - User type badge

- [ ] **Settings**
  - Notification preferences
  - Privacy settings
  - Change password
  - Biometric auth toggle

- [ ] **Account Management**
  - View subscription
  - Payment history
  - Connected accounts
  - Delete account

### Reviews (`src/screens/Reviews.tsx`)
**API Endpoints:**
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review

**Features to Build:**
- [ ] **Reviews Received**
  - Rating (1-5 stars)
  - Review text
  - Reviewer info
  - Associated tour date
  - Status: pending, approved, rejected

- [ ] **Reviews Given**
  - My reviews
  - Edit/delete own reviews

- [ ] **Write Review**
  - Select tour date
  - Rate experience (stars)
  - Write review text
  - Submit for approval

### Calendar (`src/screens/Calendar.tsx`)
**Features to Build:**
- [ ] **Calendar View**
  - Month/week/day views
  - Show all bookings/events
  - Color-coded by status
  - Quick event details

- [ ] **Event Filter**
  - My events
  - All events
  - By status
  - By type (tour, session, venue booking)

---

## Advanced Features

### Live Streaming (`src/screens/LiveStream.tsx`)
**API Endpoints:**
- `GET /api/live-streams` - List streams
- `POST /api/live-streams` - Create stream
- `POST /api/livekit/token` - Get LiveKit token
- `GET /api/mux-player/playback/:playbackId` - Mux playback

**Features to Build:**
- [ ] **Stream List**
  - Upcoming streams
  - Live now indicator
  - Past streams (recordings)

- [ ] **Create Stream**
  - Stream title, description
  - Schedule date/time
  - Select band
  - Set ticket price (optional)

- [ ] **Live Stream Player**
  - Mux video player integration
  - LiveKit for interactive streams
  - Chat integration
  - Viewer count
  - Like/reaction buttons

- [ ] **Stream Management**
  - Start/stop stream
  - View analytics
  - Viewer engagement stats

### Streaming Content (`src/screens/StreamingContent.tsx`)
**API Endpoints:**
- `GET /api/streaming-content` - List content
- `POST /api/streaming-content` - Upload content
- `GET /api/streaming-content/:id` - Get content details
- `POST /api/mux/upload-url` - Get Mux upload URL

**Features to Build:**
- [ ] **Content Library**
  - Videos, audio, live recordings
  - Thumbnail previews
  - Duration, views
  - Published status

- [ ] **Upload Content**
  - File picker (video/audio)
  - Title, description
  - Metadata (genre, tags)
  - Privacy settings
  - Mux upload integration

- [ ] **Content Player**
  - Mux player
  - Playback controls
  - Quality selector
  - Like/comment/share

---

## Implementation Priority Roadmap

### Phase 1: Core Features (Weeks 1-2)
1. **Authentication & User Context**
   - Login/Register
   - User type detection
   - Role-based navigation

2. **Basic Dashboards**
   - Artist dashboard with stats
   - Studio dashboard
   - Venue dashboard
   - Agent dashboard

3. **Profile Management**
   - View/edit profile
   - Upload photo
   - Settings

### Phase 2: Primary Role Features (Weeks 3-5)
1. **Artist Features**
   - Band management (create/join)
   - Band member management
   - Tour dates list
   - Media gallery

2. **Studio Features**
   - Studio profile editor
   - Session calendar
   - Session management

3. **Venue Features**
   - Venue profile editor
   - Event calendar
   - KPI entry

### Phase 3: Booking & Management (Weeks 6-8)
1. **Tour Management**
   - Create tour bookings
   - Tour calendar
   - Status updates

2. **Booking Agent Features**
   - User approval queue
   - Tour management dashboard
   - User management

3. **Booking Manager Features**
   - Assigned users list
   - User editor
   - Billing adjustments

### Phase 4: Payments & Subscriptions (Weeks 9-10)
1. **Subscription System**
   - Plans list
   - Subscribe flow
   - Manage subscription

2. **Payment Features**
   - Payment ledger (artists)
   - Payment entry (agents)
   - Member payouts
   - Gift cards

### Phase 5: Communication & Social (Weeks 11-12)
1. **Messaging**
   - Conversation list
   - Chat screen
   - E2EE implementation

2. **Reviews**
   - Write reviews
   - View reviews
   - Rating system

### Phase 6: Advanced Features (Weeks 13-15)
1. **Live Streaming**
   - Stream list
   - Create stream
   - Live player
   - LiveKit integration

2. **Streaming Content**
   - Content library
   - Upload flow
   - Mux integration

3. **Premium Features**
   - Venue premium content
   - Band analytics
   - Advanced reporting

### Phase 7: Polish & Launch (Weeks 16-18)
1. **Performance Optimization**
   - Image caching
   - Lazy loading
   - Offline support

2. **Testing**
   - Unit tests
   - Integration tests
   - User acceptance testing

3. **Deployment**
   - App icons & splash screens
   - EAS Build setup
   - TestFlight/Internal testing
   - App Store submission

---

## Technical Architecture

### API Integration
```typescript
// API Service Structure
src/services/
  ├── api.ts              // Base API client
  ├── auth.ts             // Authentication
  ├── bands.ts            // Band operations
  ├── tours.ts            // Tour management
  ├── studios.ts          // Studio operations
  ├── venues.ts           // Venue operations
  ├── messages.ts         // Messaging
  ├── payments.ts         // Payment processing
  ├── subscriptions.ts    // Subscription management
  ├── streaming.ts        // Live streaming
  └── admin.ts            // Admin operations
```

### State Management
```typescript
// Context Providers
src/contexts/
  ├── AuthContext.tsx         // User auth & role
  ├── BandContext.tsx         // Band data
  ├── BookingContext.tsx      // Tour bookings
  ├── SubscriptionContext.tsx // Subscription state
  └── StreamingContext.tsx    // Live stream state
```

### Screen Structure
```typescript
src/screens/
  ├── auth/
  │   ├── LoginScreen.tsx
  │   ├── RegisterScreen.tsx
  │   └── ForgotPasswordScreen.tsx
  ├── artist/
  │   ├── ArtistDashboard.tsx
  │   ├── BandManagement.tsx
  │   ├── BandMembers.tsx
  │   ├── MediaGallery.tsx
  │   ├── PaymentLedger.tsx
  │   └── W2Documents.tsx
  ├── studio/
  │   ├── StudioDashboard.tsx
  │   ├── StudioProfile.tsx
  │   ├── StudioSessions.tsx
  │   └── SessionDetails.tsx
  ├── venue/
  │   ├── VenueDashboard.tsx
  │   ├── VenueProfile.tsx
  │   ├── VenueEvents.tsx
  │   ├── VenueKPIs.tsx
  │   └── PremiumContent.tsx
  ├── agent/
  │   ├── AdminDashboard.tsx
  │   ├── UserManagement.tsx
  │   ├── TourManagement.tsx
  │   ├── PaymentManagement.tsx
  │   └── GiftCardAdmin.tsx
  ├── manager/
  │   ├── ManagerDashboard.tsx
  │   ├── AssignedUsers.tsx
  │   ├── UserEditor.tsx
  │   └── BillingAdjustments.tsx
  ├── shared/
  │   ├── Messages.tsx
  │   ├── Chat.tsx
  │   ├── Calendar.tsx
  │   ├── Profile.tsx
  │   ├── Subscriptions.tsx
  │   ├── Reviews.tsx
  │   ├── LiveStream.tsx
  │   └── StreamingContent.tsx
  └── discover/
      └── DiscoverScreen.tsx
```

### Component Library
```typescript
src/components/
  ├── common/
  │   ├── Button.tsx
  │   ├── Input.tsx
  │   ├── Card.tsx
  │   ├── Badge.tsx
  │   ├── Avatar.tsx
  │   └── LoadingSpinner.tsx
  ├── navigation/
  │   ├── TabBar.tsx
  │   └── Header.tsx
  ├── band/
  │   ├── BandCard.tsx
  │   ├── BandMemberItem.tsx
  │   └── BandForm.tsx
  ├── tour/
  │   ├── TourDateCard.tsx
  │   ├── TourForm.tsx
  │   └── TourCalendar.tsx
  ├── payment/
  │   ├── PaymentCard.tsx
  │   ├── PaymentForm.tsx
  │   └── PayoutDistributor.tsx
  ├── media/
  │   ├── MediaGrid.tsx
  │   ├── MediaUploader.tsx
  │   └── VideoPlayer.tsx
  └── messaging/
      ├── ConversationItem.tsx
      ├── MessageBubble.tsx
      └── ChatInput.tsx
```

---

## Integration Requirements

### Third-Party Services
1. **Mux** - Video hosting and live streaming
   - Setup Mux account
   - Get API keys
   - Integrate Mux player SDK

2. **LiveKit** - Real-time audio/video
   - Setup LiveKit server
   - Get API credentials
   - Integrate LiveKit React Native SDK

3. **Stripe** - Payment processing
   - Setup Stripe account
   - Get publishable & secret keys
   - Integrate Stripe React Native SDK

4. **E2EE** - End-to-end encryption for messages
   - Implement key exchange protocol
   - Use crypto library (e.g., crypto-js)
   - Secure key storage

### Backend API Configuration
```typescript
// src/config/api.ts
export const API_CONFIG = {
  baseURL: 'https://your-backend.digitalocean.app',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

export const STREAMING_CONFIG = {
  mux: {
    playbackId: process.env.MUX_PLAYBACK_ID,
  },
  livekit: {
    wsUrl: process.env.LIVEKIT_WS_URL,
  }
};
```

---

## Next Steps

1. **Review this plan** - Confirm features and priorities
2. **Set up API integration** - Connect to your Digital Ocean backend
3. **Start Phase 1** - Authentication and basic dashboards
4. **Iterative development** - Build and test each phase
5. **User feedback** - Test with real users as you build

---

**Estimated Timeline:** 16-18 weeks to full production app
**Team Size:** 1-2 developers
**Status:** Ready to begin implementation

**Last Updated:** 2025-11-14
