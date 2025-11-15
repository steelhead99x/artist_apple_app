# Quick Feature Extraction Guide for Artist Space

## Login Instructions
- URL: https://stage-www.artist-space.com
- Email: agent@streamingportfolio.com
- Password: LM9L20SRIcTlZXUmAVqqxaRU9hsG9BiB
- User Type: Booking Agent

---

## Method 1: Use the API Extractor (5 minutes)

1. **Log in** to the site
2. **Open Browser Console** (F12 → Console tab)
3. **Copy/paste** the contents of `api-extractor.js` from the repo
4. **Press Enter** to run it
5. **Navigate the site** for 30 seconds (click Dashboard, Search, Profiles, etc.)
6. **Type** `showExtractedData()` in console
7. **Copy the JSON output** and paste it here

---

## Method 2: Manual Documentation (10 minutes)

After logging in as a booking agent, answer these questions:

### 1. Navigation Menu
What menu items do you see at the top/sidebar?
```
Example: Dashboard | Find Artists | My Roster | Bookings | Messages | Calendar | Settings
```

### 2. Dashboard Overview
What sections/widgets are on the main dashboard page?
```
Example:
- Upcoming Bookings (shows 5 bookings)
- Pending Requests (shows 3 requests)
- Revenue This Month ($8,450)
- Artist Roster (12 artists)
```

### 3. Find Artists/Search
How do you search for artists?
```
Example:
- There's a "Find Artists" page
- Filters: Genre (Jazz, Rock, etc.), Location (city + radius), Price Range
- Results show as cards with: photo, name, genre, location, "Request Booking" button
```

### 4. Artist Profile Page
When you click on an artist, what information is shown?
```
Example:
- Profile photo
- Bio/description
- Audio samples (3 tracks)
- Photo gallery (6 photos)
- Genre tags
- Location
- Availability calendar
- "Request Booking" button
- Social media links
```

### 5. Booking Request Process
How do you create a booking request?
```
Example:
- Click "Request Booking" on artist profile
- Fill out form:
  - Event date
  - Venue selection
  - Performance duration (hours)
  - Offer amount ($$$)
  - Additional details
- Submit → Goes to artist for approval
```

### 6. My Roster (Booking Agent Specific)
What's in the "My Roster" section?
```
Example:
- List of 12 artists I represent
- Each shows: name, genre, upcoming gigs, revenue
- Can add new artists
- Can view their calendars
- Can create bookings on their behalf
```

### 7. Messages/Inbox
How does messaging work?
```
Example:
- Inbox shows conversations with artists/venues
- Click to open chat
- Can send text + attachments
- Real-time or needs refresh?
```

### 8. Bookings/Calendar
What's in the bookings/calendar section?
```
Example:
- Calendar view showing all bookings
- Can filter by: All, Pending, Confirmed, Past
- Each booking shows: artist, venue, date, status, amount
- Can accept/reject pending bookings
```

### 9. Other User Types
If you can switch user types or have access to other accounts:

**Artist View:**
- What's different on their dashboard?
- What features do they have?

**Venue View:**
- What's on their dashboard?
- How do they receive booking requests?

**Studio View:**
- How do they manage booking slots?
- What are their features?

**Band View:**
- How is it different from artist?
- Band member management?

### 10. Unique Features
Any other features I should know about?
```
Example:
- Payment processing
- Contract signing
- Tour planning
- Analytics/reports
- Review/rating system
- Promotional tools
```

---

## Method 3: Screenshots (Fastest!)

Just take 5-6 screenshots:
1. Dashboard (after login)
2. Search/Find Artists page
3. An artist profile
4. Booking request form
5. Messages/inbox
6. Your roster (if applicable)

Upload them or describe what you see.

---

## What I'll Do With This Info

Once you provide the details, I'll:
1. ✅ Update the mobile app to match exact features
2. ✅ Create the correct API endpoints in `api.ts`
3. ✅ Build any missing screens
4. ✅ Connect real data structures
5. ✅ Customize dashboards per user type
6. ✅ Add all booking/calendar features
7. ✅ Implement messaging correctly

---

## Current App Status

The mobile app I built has:
- ✅ User-adaptive dashboards (with mock data)
- ✅ Search with filters
- ✅ Messaging interface
- ✅ Calendar/bookings
- ✅ Profile management
- ✅ All 6 user types supported

**Just needs**: Real feature details from your website to customize everything perfectly!

---

**Which method works best for you?** 🎵
