# Artist Space Mobile App - Architecture Plan

## Overview

Multi-user-type mobile application for music industry professionals:
- **Artists** - Individual performers
- **Bands** - Musical groups
- **Recording Studios** - Recording facilities
- **Venues** - Performance locations
- **Booking Agents** - Talent representation

## Design Principles

1. **User-Type Adaptive UI** - Different features based on user type
2. **Shared Core Features** - Common functionality across all user types
3. **Modular Architecture** - Easy to add features per user type
4. **Offline-First** - Works without constant connectivity
5. **Performance** - Fast, responsive, native feel

---

## App Architecture

### Navigation Structure

```
App
├── Auth Stack (Unauthenticated)
│   ├── Login Screen ✓
│   ├── Register Screen (with user type selection)
│   ├── Forgot Password Screen
│   └── Onboarding Flow
│
└── Main App (Authenticated)
    │
    ├── Bottom Tab Navigator
    │   ├── Home Tab (Dashboard)
    │   ├── Discover Tab (Search/Browse)
    │   ├── Messages Tab (Inbox)
    │   ├── Calendar Tab (Bookings/Events)
    │   └── Profile Tab (Settings)
    │
    └── Modal Screens
        ├── Create Project/Event
        ├── Booking Request Form
        ├── Media Upload
        ├── User Profile (Other Users)
        └── Filters/Advanced Search
```

---

## User Type Specific Features

### Common Features (All Users)
- Profile management
- Search/Discovery
- Direct messaging
- Media gallery (photos, audio, video)
- Notifications
- Settings & preferences

### Artist-Specific Features
- **Portfolio**: Audio/video samples, photos
- **Availability calendar**: Open dates for gigs
- **Booking requests**: Receive and manage booking offers
- **Genre/style tags**: Categorization
- **Performance history**: Past events
- **Press kit**: Bio, photos, links
- **Collaboration**: Connect with other artists/bands

### Band-Specific Features
- Similar to Artist +
- **Band member management**: List members and roles
- **Shared projects**: Collaborative content
- **Band profile**: Group information

### Recording Studio Features
- **Studio specifications**: Equipment, rooms, capacity
- **Hourly/daily rates**: Pricing information
- **Availability calendar**: Open booking slots
- **Portfolio**: Previous recordings/projects
- **Technical specs**: Gear list, software available
- **Booking system**: Accept studio reservations
- **Engineer profiles**: Staff information

### Venue Features
- **Venue details**: Capacity, location, amenities
- **Technical specs**: Stage dimensions, sound system, lighting
- **Photo gallery**: Interior/exterior photos
- **Availability calendar**: Open dates
- **Booking requests**: From artists/agents
- **Event history**: Past shows
- **Pricing**: Rental rates, requirements

### Booking Agent Features
- **Artist roster**: Managed artists/bands
- **Booking management**: Track all bookings
- **Commission tracking**: Financial overview
- **Multi-artist search**: Find talent
- **Venue database**: Browse venues
- **Contract management**: Agreements and terms
- **Calendar overview**: All client bookings
- **Inquiry system**: Receive booking requests

---

## Core Data Models

### User Types
```typescript
type UserType = 'artist' | 'band' | 'studio' | 'venue' | 'booking_agent';

interface BaseUser {
  id: string;
  username: string;
  email: string;
  userType: UserType;
  profileImage?: string;
  bio: string;
  location: Location;
  verified: boolean;
  createdAt: string;
}

interface Artist extends BaseUser {
  userType: 'artist';
  genres: string[];
  instruments: string[];
  availability: AvailabilityCalendar;
  mediaGallery: MediaFile[];
  pressKit: PressKit;
  bookingInfo: BookingInfo;
}

interface Band extends BaseUser {
  userType: 'band';
  members: BandMember[];
  genres: string[];
  availability: AvailabilityCalendar;
  mediaGallery: MediaFile[];
  pressKit: PressKit;
}

interface RecordingStudio extends BaseUser {
  userType: 'studio';
  specifications: StudioSpecs;
  hourlyRate: number;
  dailyRate: number;
  availability: AvailabilityCalendar;
  equipment: Equipment[];
  engineers: Engineer[];
}

interface Venue extends BaseUser {
  userType: 'venue';
  capacity: number;
  technicalSpecs: VenueSpecs;
  availability: AvailabilityCalendar;
  pricing: VenuePricing;
  amenities: string[];
}

interface BookingAgent extends BaseUser {
  userType: 'booking_agent';
  agency?: string;
  roster: string[]; // Artist/Band IDs
  specialties: string[];
  commission?: number;
}
```

### Booking System
```typescript
interface BookingRequest {
  id: string;
  requesterId: string; // Who's requesting
  targetId: string; // Who's being requested
  type: 'performance' | 'recording' | 'venue_rental';
  eventDate: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  details: string;
  offer?: {
    amount: number;
    currency: string;
    terms: string;
  };
  venueId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  venueId: string;
  artistIds: string[];
  description: string;
  ticketUrl?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}
```

### Projects & Media
```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  collaborators: string[];
  mediaFiles: MediaFile[];
  genre: string[];
  releaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface MediaFile {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: number; // For audio/video
  uploadedAt: string;
}
```

### Messaging
```typescript
interface Conversation {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: MediaFile[];
  read: boolean;
  createdAt: string;
}
```

---

## Screen Breakdown

### 1. Home/Dashboard Screen (User-Type Adaptive)

**For Artists/Bands:**
- Upcoming bookings
- Recent messages
- Profile completion status
- Discovery suggestions
- Recent activity

**For Booking Agents:**
- Roster overview
- Pending booking requests
- Calendar of all client events
- Revenue/commission summary
- Action items

**For Studios/Venues:**
- Upcoming reservations
- Booking requests
- Availability calendar
- Revenue summary
- Recent inquiries

### 2. Discover/Search Screen

**Features:**
- Search bar with filters
- User type filter
- Location-based search
- Genre/style filters
- Featured profiles
- Recently active users
- Recommended connections

**Search Results:**
- Grid or list view toggle
- User cards with key info
- Quick action buttons (Message, View Profile, Save)

### 3. Messages Screen

**Conversation List:**
- Recent conversations
- Unread indicators
- Last message preview
- Timestamp
- Search conversations

**Chat Screen:**
- Message thread
- Send text/media
- Attachment support
- Read receipts
- User info header

### 4. Calendar Screen

**For Artists/Bands:**
- Availability management
- Booked dates
- Pending requests
- Add blocked dates

**For Booking Agents:**
- All client bookings
- Multi-calendar view
- Filter by artist/venue
- Add events

**For Studios/Venues:**
- Booking calendar
- Available slots
- Confirmed bookings
- Pricing per slot

### 5. Profile Screen

**My Profile Tab:**
- Profile photo
- Bio/description
- Media gallery
- Contact info
- Social links
- Edit profile button
- Settings

**Other User's Profile:**
- View-only profile
- Action buttons (Message, Book, Save)
- Media gallery
- Reviews/ratings (if applicable)
- Availability

---

## Technical Implementation

### State Management

```typescript
// Context providers
- AuthContext ✓ (Already implemented)
- UserContext (Current user data)
- ThemeContext (Dark/light mode)
- NotificationContext (Push notifications)

// For complex state, consider:
- Redux Toolkit (if app grows complex)
- React Query (for server state & caching)
```

### API Service Structure

```
src/services/
├── api.ts ✓ (Base API client)
├── authService.ts ✓ (Authentication)
├── userService.ts (User profiles, search)
├── bookingService.ts (Booking CRUD)
├── messageService.ts (Messaging)
├── projectService.ts (Projects)
├── mediaService.ts (Uploads)
├── calendarService.ts (Availability, events)
└── notificationService.ts (Push notifications)
```

### Component Structure

```
src/components/
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Avatar.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── user/
│   ├── UserCard.tsx
│   ├── UserList.tsx
│   ├── ProfileHeader.tsx
│   └── UserTypeBadge.tsx
├── media/
│   ├── MediaGallery.tsx
│   ├── AudioPlayer.tsx
│   ├── VideoPlayer.tsx
│   └── ImageUploader.tsx ✓
├── messaging/
│   ├── ConversationList.tsx
│   ├── MessageBubble.tsx
│   └── MessageInput.tsx
├── booking/
│   ├── BookingCard.tsx
│   ├── BookingForm.tsx
│   ├── CalendarView.tsx
│   └── AvailabilitySelector.tsx
└── search/
    ├── SearchBar.tsx
    ├── FilterPanel.tsx
    └── SearchResults.tsx
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
✓ Authentication (Login, Register with user type)
✓ Basic navigation
- User profile viewing/editing
- Settings screen
- API integration

### Phase 2: Core Features (Week 3-4)
- Search and discovery
- User profiles (view others)
- Media upload and gallery
- Basic messaging (conversations, chat)

### Phase 3: User-Specific Features (Week 5-6)
- Calendar/availability management
- Booking request system (create, view, respond)
- User-type specific dashboards
- Filters and advanced search

### Phase 4: Enhanced Features (Week 7-8)
- Push notifications
- Audio/video player
- Project management
- Social features (save/favorite users)

### Phase 5: Polish & Deploy (Week 9-10)
- Testing on real devices
- Performance optimization
- App Store assets (icons, screenshots)
- TestFlight/Internal testing
- Bug fixes and improvements

### Phase 6: Production Release (Week 11-12)
- App Store submission
- Google Play submission
- Marketing materials
- User onboarding improvements

---

## User Flow Examples

### Artist Looking for Studio Booking

```
1. Login as Artist
2. Tap "Discover" tab
3. Filter by "Recording Studios"
4. Apply location/rate filters
5. Browse studio profiles
6. View studio details (equipment, rates, calendar)
7. Tap "Request Booking"
8. Fill booking form (dates, project details)
9. Send request
10. Receive notification when studio responds
11. View booking in Calendar tab
```

### Booking Agent Managing Roster

```
1. Login as Booking Agent
2. View Dashboard (all client bookings)
3. Tap "Messages" - new inquiry from venue
4. Venue wants to book Artist X
5. Tap Artist X profile from roster
6. Check Artist X availability
7. Reply to venue with available dates
8. Create booking request for Artist X
9. Artist X accepts via notification
10. Booking appears in Agent's calendar
11. Commission tracked in dashboard
```

### Venue Finding Artists for Event

```
1. Login as Venue
2. Tap "Discover" tab
3. Filter by "Artists" and genre
4. Add location filter
5. Browse artist profiles
6. Listen to audio samples
7. View artist availability
8. Send booking request with date/offer
9. Artist accepts
10. Event created in Calendar
11. Share event details
```

---

## Design Considerations

### Responsive Design
- Design for various screen sizes (iPhone SE to iPad Pro, Android phones/tablets)
- Portrait-first, but support landscape for tablets
- Adaptive layouts for different user types

### Accessibility
- Screen reader support
- High contrast mode
- Font size adjustments
- Color blind friendly color scheme
- Keyboard navigation support

### Performance
- Image lazy loading
- Pagination for lists
- Efficient FlatList rendering
- Debounced search
- Cached API responses
- Optimistic UI updates

### Offline Support
- Cache user profile
- Queue messages for sending
- Draft mode for bookings/projects
- Sync when connection restored
- Clear offline/online indicators

---

## Testing Strategy

### Unit Tests
- API service methods
- Utility functions
- Data transformations
- Validation logic

### Component Tests
- Render testing
- User interaction
- Props handling
- State management

### Integration Tests
- Auth flow
- Search → Profile → Message flow
- Booking creation flow
- Media upload flow

### E2E Tests
- Complete user journeys
- Cross-user-type interactions
- Payment flows (if applicable)
- Notification handling

---

## Security & Privacy

### Data Security
- Encrypted credential storage ✓
- HTTPS only ✓
- Token-based auth ✓
- Secure file uploads
- Input sanitization

### Privacy
- GDPR compliance
- User data export
- Account deletion
- Privacy settings
- Consent management

### Permissions
- Camera (for photos/videos)
- Microphone (for audio recording)
- Photo library (for uploads)
- Notifications (for push)
- Location (for search, optional)
- Biometric (for auth, optional)

---

## Analytics & Monitoring

### User Analytics
- Screen views
- User type distribution
- Feature usage
- Search queries
- Booking conversion rate

### Performance Monitoring
- App crash tracking
- API response times
- Screen load times
- Network errors
- User session length

### Business Metrics
- User registration by type
- Active users (DAU, MAU)
- Booking volume
- Message volume
- Media uploads

---

## Future Enhancements

### V2.0 Features
- In-app payments/contracts
- Video chat for auditions/meetings
- Advanced calendar sync (Google, Apple)
- Reviews and ratings system
- Social feed/activity stream
- Groups/communities
- Live streaming capability

### V3.0 Features
- AI-powered matching
- Smart recommendations
- Contract templates
- Multi-language support
- Accessibility improvements
- Web app parity

---

## Questions for Product Owner

Before building, we need clarity on:

1. **Booking System:**
   - Is there payment integration? (Stripe, PayPal?)
   - Do we handle contracts in-app?
   - What's the booking approval flow?

2. **Media:**
   - Max file sizes for audio/video?
   - Storage solution? (S3, Cloudinary?)
   - Do we need audio/video editing features?

3. **Search:**
   - What are all the filter criteria?
   - Location-based search radius?
   - Featured/promoted listings?

4. **Messaging:**
   - Real-time (WebSockets)?
   - Or polling-based?
   - Group messages?

5. **Monetization:**
   - Free for all users?
   - Subscription tiers?
   - Commission on bookings?
   - Featured listings?

6. **User Verification:**
   - How do we verify user identity?
   - Badge system?
   - Background checks for venues/studios?

---

## Next Steps

1. **Explore live website** - Document all features you see
2. **Prioritize features** - What's MVP vs. nice-to-have?
3. **Design mockups** - UI/UX for each screen
4. **Backend API** - Confirm endpoints and data models
5. **Start building** - Iterative development based on this plan

---

**Document Status:** Living document - update as requirements evolve
**Last Updated:** 2025-11-14
**Version:** 1.0
