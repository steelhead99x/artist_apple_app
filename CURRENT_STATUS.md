# What We Know So Far - Artist Space Platform

## Platform Information (from HTML metadata)

### Confirmed User Types
1. **Artists** - Individual performers
2. **Bands** - Musical groups
3. **Venues** - Performance locations
4. **Recording Studios** - Recording facilities
5. **Booking Agents** - Talent representation
6. **(Possibly) Band Managers** - mentioned in earlier context

### Core Features (from metadata)
- **Tour Coordination** - Managing tours and performances
- **Recording Sessions** - Booking studio time
- **Event Management** - Managing live events
- **Artist Booking** - Booking talent for shows
- **Venue Booking** - Reserving performance spaces
- **Artist Networking** - Connecting professionals
- **Tour Management** - Planning and executing tours
- **Search Functionality** - Finding users and services
- **Event Booking** - Coordinating events

### Business Model
- **Subscription-based**: $8.99/month (from structured data)
- **Target Rating**: 4.8/5 stars (500 reviews mentioned)

### Technical Stack
- **Frontend**: React SPA (Single Page Application)
- **Routing**: Likely React Router
- **Security**: Cloudflare protection
- **Fonts**: Playfair Display & Inter
- **Email**: accounts@artist-space.com

---

## Mobile App Status

### ✅ What's Built
1. **Authentication System**
   - Login screen with username/password
   - Biometric authentication (Face ID, Touch ID, Fingerprint)
   - Secure token storage
   - Auto-logout on session expire

2. **Navigation Structure**
   - Bottom tab navigation
   - 5 main tabs: Home, Discover, Messages, Calendar, Profile
   - Stack navigation for modals and detail screens

3. **Discover/Search Screen**
   - Search bar
   - User type filters (All, Artists, Bands, Studios, Venues, Agents)
   - User cards with key information
   - Quick actions (View Profile, Message)

4. **Messages Screen**
   - Conversation list
   - Unread message badges
   - Last message preview
   - Search conversations
   - Compose new message button

5. **Calendar/Bookings Screen**
   - Toggle between Bookings and Events
   - Booking cards with status (pending, accepted, rejected, etc.)
   - Accept/Reject actions
   - Offer details display
   - Add booking button

6. **Profile Screen**
   - Profile photo with edit
   - User type badge
   - Quick stats (Bookings, Connections, Projects)
   - Settings menu
   - Logout

7. **Type System**
   - 200+ lines of TypeScript definitions
   - All user types defined
   - Booking system types
   - Message types
   - Event types
   - Media file types

### ❓ What We Need to Know

To complete the mobile app, we need details about:

#### 1. Dashboard Screen
- What widgets/cards are displayed?
- What data is shown? (stats, recent activity, upcoming events)
- What quick actions are available?
- Does it differ by user type?

#### 2. Search/Discovery
- What search filters are available?
- Can you filter by:
  - Location/distance?
  - Genre/style?
  - Price range?
  - Availability?
  - Rating/verified status?
- How are search results sorted?
- Can users save/favorite other users?

#### 3. User Profiles
When viewing another user's profile, what's displayed?
- Bio/description
- Media gallery (photos, audio, videos)
- Genre tags
- Location
- Availability calendar
- Reviews/ratings
- Social media links
- Booking/contact buttons
- Past events/performances

#### 4. Booking System
- How do booking requests work?
- What information is required?
  - Date/time
  - Venue
  - Duration
  - Offer/payment
  - Contract terms
- Can you negotiate offers?
- How are bookings confirmed?
- Is there payment integration?

#### 5. Messaging
- Direct 1-on-1 messages only?
- Or group conversations too?
- Can you send attachments (images, audio, documents)?
- Is it real-time or polling-based?
- Read receipts?
- Typing indicators?

#### 6. Tour Coordination
- How does tour planning work?
- Multiple dates/cities?
- Link venues and artists?
- Itinerary management?
- Tour calendar view?

#### 7. Event Management
- How are events created?
- Public vs private events?
- Ticket integration?
- Event promotion features?
- Attendee management?

#### 8. Recording Sessions (for Studios)
- How do artists book studio time?
- Equipment/room selection?
- Engineer assignment?
- Session rates (hourly, daily, project-based)?
- File sharing/delivery?

#### 9. Roster Management (for Booking Agents)
- How do agents add artists to their roster?
- Can agents create bookings on behalf of artists?
- Commission tracking?
- Multi-artist calendar view?
- Revenue reporting?

#### 10. Settings & Preferences
- What user settings are available?
- Notification preferences?
- Privacy settings?
- Account management?
- Subscription/billing?

---

## How to Help Document Features

### Method 1: Browser DevTools (Best!)
1. Log in to https://stage-www.artist-space.com
2. Press **F12** to open DevTools
3. Go to **Network** tab
4. Navigate around the site (click Dashboard, Search, etc.)
5. Look for **XHR/Fetch** requests in the Network tab
6. Share the API endpoint URLs you see

**Example:**
```
GET /api/users/me
GET /api/bookings?status=pending
POST /api/messages/send
```

### Method 2: Screenshots
Take screenshots of:
1. Dashboard after login
2. Search/discover page
3. User profile (viewing another user)
4. Booking request form
5. Messages/inbox
6. Your profile/settings
7. Any unique features

### Method 3: Screen Recording
Record a short video (1-2 minutes) showing:
- Logging in
- Quick tour of main sections
- Creating a booking request
- Searching for a user
- Sending a message

### Method 4: Simple Description
Just describe in text what you see:
- "After login, I see a dashboard with 3 cards: Upcoming Bookings, Recent Messages, and Suggested Artists"
- "The search page has filters for User Type, Location (with radius), Genre, and Price Range"
- "Clicking an artist shows their profile with bio, 6 photos, 3 audio samples, and a 'Request Booking' button"

---

## Test Credentials Available
- **URL**: https://stage-www.artist-space.com
- **Email**: agent@streamingportfolio.com
- **Password**: LM9L20SRIcTlZXUmAVqqxaRU9hsG9BiB
- **User Type**: Booking Agent

---

## Next Steps

1. **User documents website features** (using one of the methods above)
2. **Update mobile app** with real features
3. **Connect to real API** endpoints
4. **Test authentication** with actual credentials
5. **Add user-type specific features**
6. **Build out missing screens** (artist profiles, booking forms, etc.)
7. **Add native features** (camera for photos, audio player, etc.)
8. **Testing** with real users
9. **Deploy** to App Store & Google Play

---

## Questions to Answer

**Critical Questions:**
1. What's the API base URL? (`https://stage-www.artist-space.com/api`?)
2. What does the authentication response look like?
3. What's the structure of user objects from the API?
4. How are bookings structured in the API response?
5. Are there WebSockets for real-time messaging?

**Feature Questions:**
1. Do all user types see the same navigation menu?
2. Can users have multiple roles? (e.g., artist AND booking agent)
3. Is there a review/rating system?
4. Is there payment processing in-app?
5. Do you handle contracts/agreements in the platform?

**Mobile-Specific Questions:**
1. Should push notifications work for messages, bookings, etc.?
2. Should users be able to upload audio/video from the app?
3. Is offline mode important?
4. Should calendar sync with Google/Apple calendars?
5. Are there any features that shouldn't be in the mobile app?

---

## Current Mobile App Repository

**Branch**: `claude/artist-space-apple-app-01S28i9fVcn9Zt1PPwcwfxvd`

**Files Created**:
- Full React Native + Expo project structure
- 5 main screens
- Tab navigation
- Authentication system
- Type definitions
- API service framework
- Comprehensive documentation

**Ready to**:
- Connect to real API
- Customize based on actual features
- Test and deploy

**To Run**:
```bash
cd /home/user/artist_apple_app
npm install
npm start
```

---

**Last Updated**: 2025-11-14
**Status**: Waiting for feature documentation from live website
