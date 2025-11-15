# COMPREHENSIVE REACT NATIVE APP CODEBASE ANALYSIS

## Executive Summary

This is a full-stack React Native music industry application called "Artist Space" with:
- **Frontend**: React Native (Expo) mobile app with TypeScript
- **Backend**: Node.js/Express API with PostgreSQL database
- **Infrastructure**: Multi-user system supporting Artists, Bands, Venues, Recording Studios, Booking Agents
- **Status**: Actively developed with multi-role support and payment integration

---

## 1. DIRECTORY STRUCTURE

### Frontend Root Structure
```
/home/user/artist_apple_app/
├── src/                          # Main source code
│   ├── screens/                  # 15 main application screens
│   │   ├── LoginScreen.tsx
│   │   ├── ArtistDashboardScreen.tsx
│   │   ├── StudioDashboardScreen.tsx
│   │   ├── VenueDashboardScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── PaymentLedgerScreen.tsx
│   │   ├── MessagesScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── [10+ others]
│   ├── services/                 # Business logic & API integration
│   │   ├── AuthContext.tsx       # Authentication state management
│   │   ├── api.ts                # Axios client & API endpoints
│   │   ├── bands.ts
│   │   ├── messages.ts           # E2EE messaging (partial)
│   │   ├── payments.ts
│   │   ├── subscriptions.ts
│   │   ├── studios.ts
│   │   └── [6+ others]
│   ├── components/               # Reusable UI components
│   │   └── common/               # Button, Input, Card, etc.
│   ├── navigation/               # Navigation structure
│   │   └── TabNavigator.tsx      # Bottom tab navigation
│   └── types/                    # TypeScript type definitions (700+ lines)
├── examples/
│   └── backend/                  # Express backend reference implementation
│       ├── src/
│       │   ├── index.ts          # Express app entry & middleware
│       │   ├── db.ts             # PostgreSQL connection pool
│       │   ├── router.ts         # Route aggregation
│       │   ├── routes/           # 40+ API endpoints
│       │   │   ├── auth.ts       # 910 lines - Authentication
│       │   │   ├── admin.ts      # 1,836 lines - Admin features
│       │   │   ├── bands.ts      # 648 lines
│       │   │   ├── messages.ts   # 488 lines - E2EE messages
│       │   │   ├── payments.ts   # 410 lines
│       │   │   ├── giftCards.ts  # 1,080 lines
│       │   │   ├── subscriptions.ts
│       │   │   └── [30+ more]
│       │   ├── middleware/       # Security & validation
│       │   │   ├── rateLimiter.ts
│       │   │   ├── csrfProtection.ts
│       │   │   └── auth.ts
│       │   ├── services/         # Payment & crypto
│       │   │   ├── stripe.service.ts
│       │   │   ├── paypal.service.ts
│       │   │   ├── braintree.service.ts
│       │   │   └── crypto.service.ts
│       │   └── utils/            # Helpers
│       │       ├── auth.ts       # JWT & token management
│       │       ├── passwordHash.ts
│       │       ├── validation.ts
│       │       └── email.ts
│       ├── schema.sql            # PostgreSQL schema
│       ├── [50+ migration files]
│       └── package.json
├── App.tsx                       # Main app entry point
├── app.json                      # Expo configuration
├── package.json                  # Frontend dependencies
└── [Documentation files]
```

### Key File Sizes (Backend)
- admin.ts: 1,836 lines (admin operations)
- giftCards.ts: 1,080 lines (gift card system)
- auth.ts: 910 lines (authentication)
- messages.ts: 488 lines (messaging)
- bandMembers.ts: 425 lines
- payments.ts: 410 lines

---

## 2. AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### Frontend Auth (AuthContext.tsx)

**Methods:**
1. Email/Password login
2. PIN-based passwordless login (6-9 digit PIN sent to email)
3. Biometric authentication (Face ID, Touch ID, Fingerprint)
4. Wallet-based login (cryptocurrency)

**Storage:**
- JWT token: `expo-secure-store` (encrypted at rest)
- User data: `expo-secure-store` with fallback caching
- Biometric credentials: Securely stored for biometric login

**Key Flow:**
```typescript
Login → API call → JWT token returned → Stored in SecureStore
       ↓
Token added to every request via axios interceptor
       ↓
On 401: Token cleared, user logged out
       ↓
Biometric: Retrieves saved credentials + authenticates locally
```

### Backend Auth (auth.ts - 910 lines)

**Registration Flow:**
- Email or wallet-based registration
- Password strength validation (12+ chars, uppercase, lowercase, number, special char)
- Solo artist vs band registration
- Auto-creates bands for users
- Pending approval workflow (except booking agents = auto-approved)

**Login Methods:**
1. Email/Password - bcrypt comparison
2. PIN Code - Database lookup with 15-min expiration
3. Wallet Address - Direct lookup

**Token Management:**
```typescript
JWT_SECRET from env or random (dev mode)
Payload: { id, userId, email, userType, is_admin_agent, agent_status }
Expiration: 7 days
Refresh: Auto-refresh if admin status changes during request
```

**Protective Measures:**
- Timing-attack resistant password comparison
- PIN codes expire in 15 minutes
- Rate limiting: 5 attempts per 15 minutes
- No user enumeration (returns same response for valid/invalid emails)
- Account deletion soft-delete with suspension reasons

### Authorization

**Role-Based Access Control:**
- `user` (Artists)
- `band` (Musical groups)
- `studio` (Recording Studios)
- `bar` (Venues)
- `booking_agent` (Booking management)
- `booking_manager` (Manager role)

**Features by Role:**
- Booking agents: All access + admin functions
- Booking managers: Limited admin functions
- Studios: Can message all, limited bookings
- Bands/Artists: Can message studios/booking agents
- Venues: Can message booking agents/studios

---

## 3. API INTEGRATION & CONFIGURATION

### Frontend API Configuration (api.ts)

```typescript
API_BASE_URL = __DEV__
  ? 'http://localhost:8787/api'
  : 'https://your-backend.digitalocean.app/api'
```

**Axios Interceptors:**
1. Request: Automatically adds JWT token to Authorization header
2. Response: Handles 401 errors by clearing token

**Timeout:** 15 seconds
**Headers:** Content-Type: application/json

### Backend Environment Configuration (.env.example)

**Database:**
```
PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
DATABASE_POOL_MIN=2, DATABASE_POOL_MAX=10
DATABASE_SSL (optional)
```

**Authentication:**
```
JWT_SECRET=your-secure-secret-key-change-in-production
```

**Payment Gateways:**
```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
BRAINTREE_MERCHANT_ID
BRAINTREE_PUBLIC_KEY
BRAINTREE_PRIVATE_KEY
```

**Cryptocurrency:**
```
PLATFORM_WALLET_ADDRESS (Ethereum)
ETH_RPC_URL
```

**Email Service:**
```
MAILJET_API_KEY
MAILJET_API_SECRET
OUTBOUND_EMAIL
APP_URL
```

**Streaming:**
```
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_URL
MUX_AUTOPLAY_PLAYBACK_ID
```

**API Endpoints:** 40+ routes across:
- /auth (authentication)
- /bands (band management)
- /messages (E2EE messaging)
- /payments (payment processing)
- /subscriptions (billing)
- /tours (booking management)
- /admin (admin operations)
- /studios (studio bookings)
- /venues (venue management)

---

## 4. ENCRYPTION & SECURITY CODE

### Password Security (passwordHash.ts)
```typescript
Algorithm: bcrypt
Salt rounds: 10
Verification: Constant-time comparison (prevents timing attacks)
```

### Message Encryption (messages.ts & MessageService)

**Status:** PARTIAL IMPLEMENTATION

**What's Implemented:**
- Database schema for encrypted_content and iv fields
- Message sending accepts encrypted_content
- Backend stores encrypted messages

**What's NOT Implemented (TODOs):**
```typescript
generateKeyPair() // TODO: Implement using crypto library
encryptMessage() // Currently returns message as-is (NOT encrypted)
decryptMessage() // Currently returns encrypted_message as-is (NOT decrypted)
```

**Security Gap:** End-to-end encryption is NOT fully functional. Messages are encrypted in transit (HTTPS) but not encrypted at rest.

### Backend Encryption (crypto.service.ts)

**Features:**
- Ethereum integration using ethers.js v6
- Transaction verification
- Amount validation with 5% slippage
- RPC endpoint: Alchemy provider
- CoinGecko API for ETH price conversion

**Limitations:**
- RPC URL placeholder in code
- No private key management (expects external signing)

### CSRF Protection (csrfProtection.ts)

**Pattern:** Double Submit Cookie
```
Server generates token → Sent in cookie + response header
Client sends token in X-CSRF-Token header
Server verifies cookie matches header (constant-time comparison)
```

**Configuration:**
- HttpOnly: false (allows JavaScript access)
- Secure: true (HTTPS only in production)
- SameSite: strict
- Max age: 24 hours

---

## 5. BACKEND REFERENCE IMPLEMENTATION

### Database (PostgreSQL)

**Tables (60+ total):**
- users (with soft delete)
- password_resets
- login_pin_codes
- bands & band_members
- venues (bars)
- tour_dates & tour_kpis
- recording_studios & studio_sessions
- messages (encrypted_content, iv)
- payment_intents
- user_subscriptions & subscription_plans
- audit_logs
- billing_adjustments
- gift_cards
- reviews
- mailing_list_subscribers

**Extensions:**
- uuid-ossp (UUID generation)
- pgvector (vector similarity searches - not yet used)

### Security Middleware

**Rate Limiting (rateLimiter.ts):**
```
Auth endpoints: 5 attempts per 15 minutes
Password reset: 3 requests per hour
PIN verification: 10 attempts per hour
General API: 1000 requests per 15 minutes
Health checks: Unlimited
```

**Security Headers (index.ts):**
```
X-Frame-Options: DENY (prevents clickjacking)
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: Restrictive with whitelisted CDNs
Strict-Transport-Security: max-age=31536000 (production only)
```

**CORS Configuration:**
```
Origin: Configurable via env (CORS_ORIGIN)
Credentials: true
```

### API Security Features

1. **Token Verification:**
   - Checks if user deleted/suspended on each request
   - Auto-refreshes token if admin status changes
   - Prevents payment-overdue users from accessing most endpoints

2. **Input Validation:**
   - Email format validation
   - Password complexity requirements
   - User type validation
   - Float/number validation
   - Sequential character detection in passwords

3. **Error Handling:**
   - Generic error messages (doesn't reveal user existence)
   - Specific error codes for development

---

## 6. COMPONENT ORGANIZATION

### Screen Structure (15 main screens)

**Authentication Screens:**
- LoginScreen - Email/password/biometric/wallet login
- ForgotPasswordScreen - Password reset (not shown in list but referenced)

**User-Agnostic Screens:**
- HomeScreen - Dashboard
- DiscoverScreen - Search/browse
- CalendarScreen - Events/bookings
- MessagesScreen - Direct messaging
- ProfileScreen - User settings

**Role-Specific Dashboards:**
- ArtistDashboardScreen - Artist portfolio & bookings
- StudioDashboardScreen - Studio operations
- VenueDashboardScreen - Venue management

**Band Management:**
- CreateBandScreen - Band creation
- JoinBandScreen - Join existing bands
- MyBandsScreen - User's bands
- BandDetailsScreen - Band profile
- ManageMembersScreen - Member permissions

**Financial:**
- PaymentLedgerScreen - Payment history

### Component Library (common/)

Reusable Components:
- Button (primary/outline/secondary variants)
- Input (with icons and validation)
- Card (container)
- LoadingSpinner
- ErrorMessage
- EmptyState
- StatusBadge

### Navigation (TabNavigator.tsx)

```
Bottom Tab Navigator:
├── Home (home/home-outline)
├── Discover (search/search-outline)
├── Messages (chatbubbles)
├── Calendar (calendar)
└── Profile (person)
```

---

## 7. STATE MANAGEMENT

### Frontend State Management

**Authentication State (AuthContext.tsx):**
- Centralized auth state with React Context API
- Provides: user, isAuthenticated, isLoading, error, biometricAvailable, biometricEnabled

**Service-Based State:**
- Each API service (bands.ts, messages.ts, etc.) is a class with methods
- No Redux/Zustand (pure Context + service classes)
- User manages local state in screens with useState

**Local Storage:**
```
SecureStore keys:
- authToken (JWT)
- userData (cached user object)
- BIOMETRIC_KEY (biometric enabled flag)
- savedCredentials (for biometric login)
```

### Backend State Management

**No client-side state** - REST API with stateless design
Database is single source of truth

---

## 8. SENSITIVE DATA HANDLING

### Storage

**Frontend:**
```
SecureStore (encrypted at device level):
- JWT tokens
- User data (cached)
- Biometric credentials (email+password)
- Biometric enabled flag
```

**Backend:**
```
Database (PostgreSQL):
- password_hash (bcrypted)
- wallet_address
- encrypted_content (messages - NOT YET ENCRYPTED)
- payment intents
- sensitive user data (phone, email, address)
```

### Transmission

**Frontend to Backend:**
- HTTPS enforced via Expo manifest
- API_BASE_URL uses https in production
- Axios uses secure transport

**Backend to Third-Parties:**
- Stripe: Uses official SDK (secure)
- PayPal: OAuth2 pattern
- Ethereum: JSON-RPC over HTTPS
- Email: Mailjet API over HTTPS

### Data Access

**Password Reset:**
- PIN code (6 digits) sent via email
- Expires in 15 minutes
- Used once then marked as used
- Rate limited: 3 per hour per email

**Biometric:**
- Credentials stored encrypted
- Retrieved only after biometric authentication passes
- Used to auto-login without exposing password

**Messages:**
- Marked as read (boolean flag)
- Can be deleted
- NOT encrypted at rest (security gap)

---

## 9. THIRD-PARTY DEPENDENCIES - SECURITY RISK ASSESSMENT

### Frontend Dependencies (package.json)

**HIGH PRIORITY CRITICAL:**
```
expo ~52.0.0                      - GOOD: Active maintenance, security updates
expo-secure-store ~14.0.0         - GOOD: Encrypts credentials on device
expo-local-authentication ~15.0.0 - GOOD: Native biometric API
axios ^1.6.0                      - OK: Popular, but v1.6 is old. Should upgrade to 1.7+
```

**MEDIUM PRIORITY:**
```
@react-navigation/native ^6.1.9   - GOOD: Active maintenance
@react-navigation/native-stack    - GOOD: Active maintenance
@react-navigation/bottom-tabs     - GOOD: Active maintenance
react ^18.3.1                     - GOOD: Latest React
react-native 0.76.5               - GOOD: Recent version
expo-router ~4.0.0                - GOOD: File-based routing
```

**LOWER PRIORITY:**
```
@expo/vector-icons ^14.0.0        - GOOD: Icon library
expo-camera/image-picker          - OK: Device access APIs
expo-notifications ~0.29.0        - OK: Push notifications
```

**NO SECURITY-CRITICAL PACKAGES DETECTED**
- No auth libraries needed (custom implementation)
- No crypto libraries implemented (TODO in messages.ts)
- No ORM (direct API calls)

### Backend Dependencies (package.json)

**CRITICAL - PAYMENT PROCESSORS:**
```
stripe ^19.1.0                    - GOOD: Official SDK
braintree ^3.34.0                 - OK: Official SDK but older
@paypal/paypal-server-sdk ^1.1.0  - OK: Official SDK
```

**CRITICAL - SECURITY:**
```
jsonwebtoken ^9.0.2               - OK: Popular but monitor for CVEs
bcryptjs ^3.0.2                   - GOOD: Password hashing
bcrypt ^6.0.0                     - GOOD: Password hashing (dual?)
cors ^2.8.5                       - GOOD: CORS middleware
csurf ^1.11.0                     - WARNING: Deprecated in favor of custom impl
express-rate-limit ^8.2.1         - GOOD: Rate limiting
```

**CRITICAL - INFRASTRUCTURE:**
```
express ^4.21.2                   - GOOD: Latest minor version
pg ^8.11.3                        - GOOD: PostgreSQL driver
dotenv ^17.2.3                    - GOOD: Config management
```

**CRYPTO:**
```
ethers ^6.13.0                    - GOOD: Ethereum library
```

**UTILITY:**
```
multer ^2.0.2                     - OK: File uploads (monitor for path traversal)
uuid ^13.0.0                      - GOOD: UUID generation
decimal.js ^10.6.0                - GOOD: Precise decimal math
livekit-server-sdk ^2.0.0         - OK: Video streaming
cookie-parser ^1.4.7              - OK: Cookie middleware
```

### Dependency Security Issues

**KNOWN ISSUES:**
1. **csurf package** - Marked as deprecated. Backend has custom CSRF implementation which is better
2. **Dual bcrypt packages** - Both bcrypt (native) and bcryptjs (pure JS) included. Should use only one
3. **Axios 1.6.0** - Very old. Should upgrade to 1.7.0+
4. **braintree ^3.34.0** - Old version. Should review for CVEs

**NO MAJOR VULNERABILITIES DETECTED** (based on common knowledge)
- No npm audit issues visible in package.json syntax
- No known RCE vectors in listed packages

---

## 10. ARCHITECTURE PATTERNS IN USE

### Design Patterns

1. **MVC-Style Backend**
   - Routes: Controllers
   - Services: Business logic
   - Database: Model/persistence

2. **Service-Based Frontend**
   - Services: API integration + business logic
   - Screens: Views
   - Context: Global state

3. **Middleware Stack (Backend)**
   - Security headers
   - CORS
   - Rate limiting
   - Authentication
   - Request logging

4. **Factory Pattern**
   - Multiple auth methods (password, PIN, wallet, biometric)
   - Multiple payment processors (Stripe, PayPal, Braintree, Crypto)

5. **Token-Based Auth**
   - JWT tokens
   - Automatic header injection
   - Automatic 401 handling

### Integration Patterns

**Frontend → Backend:**
- Axios interceptors
- Automatic token injection
- Automatic error handling

**Backend → Third-Parties:**
- Official SDKs (Stripe, PayPal)
- Direct API calls (Ethereum, Mailjet)
- Webhook handling (mentioned but not shown)

**Backend → Database:**
- Connection pooling (min: 2, max: 10)
- Parameterized queries (SQL injection protection)
- Transaction support (mentioned)

---

## 11. SECURITY-CRITICAL CODE LOCATIONS

### Frontend Security Files
```
/src/services/AuthContext.tsx         - Biometric & token handling
/src/services/api.ts                  - Token injection & error handling
/src/screens/LoginScreen.tsx          - Auth UI
```

### Backend Security Files
```
/src/routes/auth.ts                   - Authentication logic (910 lines)
/src/middleware/rateLimiter.ts        - Rate limiting
/src/middleware/csrfProtection.ts     - CSRF tokens
/src/utils/auth.ts                    - JWT generation/verification
/src/utils/passwordHash.ts            - Bcrypt operations
/src/utils/validation.ts              - Input validation
/src/routes/messages.ts               - E2EE (partial)
/src/services/stripe.service.ts       - Stripe integration
/src/services/crypto.service.ts       - Ethereum integration
/db.ts                                - Database connection & pooling
/index.ts                             - Global security headers
```

### Critical Database Files
```
schema.sql                            - Schema definition
migration_audit_logging.sql           - Audit trail setup
migration_add_user_soft_delete.sql    - Soft delete implementation
migration_e2ee_messaging.sql          - E2EE schema
```

---

## 12. POTENTIAL SECURITY CONCERNS

### HIGH PRIORITY

1. **E2EE Messaging Not Implemented**
   - LOCATION: /src/services/messages.ts
   - STATUS: Stubbed out with TODOs
   - IMPACT: Messages are NOT encrypted end-to-end
   - REMEDIATION: Implement TweetNaCl.js or libsodium.js

2. **Missing Message Encryption at Rest**
   - LOCATION: Backend messages table
   - STATUS: Database stores plain encrypted_content
   - IMPACT: If database breached, messages readable
   - REMEDIATION: Implement server-side encryption for messages

3. **API_BASE_URL in Code**
   - LOCATION: /src/services/api.ts (line 12-14)
   - ISSUE: Hardcoded production URL visible in code
   - REMEDIATION: Use environment variables in Expo manifest

### MEDIUM PRIORITY

4. **Deprecated CSURF Package**
   - LOCATION: /examples/backend/package.json
   - STATUS: csurf is deprecated
   - MITIGATED BY: Custom CSRF implementation in place
   - NOTE: Can remove csurf dependency

5. **Dual Bcrypt Packages**
   - LOCATION: /examples/backend/package.json
   - ISSUE: Both bcrypt and bcryptjs included
   - IMPACT: Confusion, unnecessary dependency
   - REMEDIATION: Use only bcryptjs (pure Node.js) or bcrypt (native)

6. **Biometric Credentials Storage**
   - LOCATION: /src/services/AuthContext.tsx (line 87-91)
   - ISSUE: Email + password stored in SecureStore for biometric login
   - CONCERN: If device compromised, both are exposed
   - BETTER: Use refresh tokens or passwordless flow

7. **Rate Limiting per IP**
   - LOCATION: /examples/backend/src/middleware/rateLimiter.ts
   - ISSUE: Behind proxies (x-forwarded-for), can be spoofed
   - REMEDIATION: Already handled with IP parsing, but monitor

8. **Database Password in Environment**
   - LOCATION: /examples/backend/.env.example
   - ISSUE: PGPASSWORD in plaintext in .env files
   - MITIGATION: .gitignore prevents commit (GOOD)
   - NOTE: Deploy should use secrets vault (not shown)

### LOWER PRIORITY

9. **Password Reset PIN Sent via Email**
   - LOCATION: /examples/backend/src/routes/passwordReset.ts
   - ISSUE: Email is low-entropy auth method
   - MITIGATED BY: 15-min expiration, one-time use, rate limiting
   - ACCEPTABLE: For convenience, but could offer recovery emails

10. **No API Rate Limiting on Frontend**
    - LOCATION: /src/services/api.ts
    - ISSUE: Client-side not rate limited
    - IMPACT: User can retry failed requests rapidly
    - MITIGATION: Backend rate limiting is in place

11. **Generic Error Messages**
    - LOCATION: /examples/backend/src/routes/auth.ts
    - STATUS: Correctly returns same message for valid/invalid users
    - GOOD: Prevents user enumeration

12. **JWT Token Expiration**
    - LOCATION: /examples/backend/src/utils/auth.ts (line 33)
    - ISSUE: 7-day expiration is long for security-critical app
    - RECOMMENDATION: Consider 1-day expiration + refresh tokens

13. **No Audit Logging Implementation Shown**
    - LOCATION: Migration file exists but implementation unclear
    - IMPACT: Cannot track who changed what
    - REMEDIATION: Implement comprehensive audit trail

---

## 13. DETAILED SECURITY ASSESSMENT

### Authentication Security: 8/10
**STRENGTHS:**
- Multiple auth methods (password, PIN, biometric, wallet)
- Rate limiting on login attempts
- Bcrypt password hashing with proper salt rounds
- Timing-attack resistant password comparison
- Soft delete instead of hard delete

**WEAKNESSES:**
- E2EE not implemented
- 7-day JWT expiration is long
- Biometric credentials stored plaintext in SecureStore
- No refresh token mechanism

### Authorization Security: 7/10
**STRENGTHS:**
- Role-based access control implemented
- Token verification checks suspension status on each request
- Booking agent admin status properly validated

**WEAKNESSES:**
- Some roles can message broadly (booking agents, studios)
- No resource-level permissions shown (e.g., can user edit band X?)
- No audit trail for authorization decisions

### Data Protection: 6/10
**STRENGTHS:**
- Passwords hashed with bcrypt
- HTTPS enforced in production
- CSRF protection implemented
- Encrypted credential storage on device

**WEAKNESSES:**
- Messages NOT encrypted end-to-end (critical gap)
- No field-level encryption in database
- No encryption at rest mentioned
- Biometric credentials stored plaintext

### API Security: 8/10
**STRENGTHS:**
- Rate limiting across endpoints
- Input validation on all public endpoints
- Security headers properly set
- CORS configured restrictively
- Parameterized queries prevent SQL injection

**WEAKNESSES:**
- 1000 requests/15min general limit might be too high
- No API versioning strategy shown
- No request signing/authentication for third-party calls visible

### Infrastructure Security: 7/10
**STRENGTHS:**
- Environment variables for secrets
- .gitignore prevents secret commits
- PostgreSQL connection pooling
- HTTPS-only in production

**WEAKNESSES:**
- No TLS pinning on mobile app
- Hardcoded API URLs in code
- No VPN/private network setup described
- Unclear secret management for deployment

---

## 14. INTEGRATION POINTS & FLOWS

### Authentication Flow
```
User Input (Email/Password/PIN/Wallet)
    ↓
[Frontend] LoginScreen.tsx calls AuthContext.login()
    ↓
[Frontend] apiService.post('/auth/login', credentials)
    ↓
[Backend] /auth route validates & creates JWT
    ↓
JWT returned to frontend, stored in SecureStore
    ↓
Subsequent requests include: Authorization: Bearer {JWT}
    ↓
[Backend] authenticateToken middleware verifies JWT & checks suspension
    ↓
Request proceeds or rejected (401/403)
```

### Message Flow
```
User composes message in MessagesScreen
    ↓
Should encrypt with recipient's public key (TODO - NOT DONE)
    ↓
POST /messages/send { recipient_id, encrypted_content, iv }
    ↓
[Backend] Validates permission to message recipient
    ↓
Stores in messages table (plain, NOT encrypted at rest)
    ↓
Recipient fetches: GET /messages/conversation/{userId}
    ↓
Should decrypt with private key (TODO - NOT DONE)
    ↓
Display decrypted message (currently displays encrypted)
```

### Payment Flow (Stripe Example)
```
User selects payment method → Gift card/Subscription
    ↓
POST /payments/stripe/create-intent { amount, metadata }
    ↓
[Backend] Stripe SDK creates payment intent
    ↓
Client secret returned to frontend
    ↓
Frontend uses Stripe SDK to collect payment details
    ↓
POST /payments/stripe/verify { paymentIntentId }
    ↓
[Backend] Verifies with Stripe, updates database
    ↓
Confirmation sent to user
```

---

## 15. KEY FILES SUMMARY

### Frontend Key Files
| File | Lines | Purpose |
|------|-------|---------|
| AuthContext.tsx | 274 | Authentication state & biometric logic |
| api.ts | 211 | Axios client with interceptors |
| types/index.ts | 712 | TypeScript type definitions |
| LoginScreen.tsx | 200+ | Auth UI |
| TabNavigator.tsx | 74 | Bottom tab navigation |
| messages.ts | 108 | Message service (E2EE stubs) |
| bands.ts | 100+ | Band operations |

### Backend Key Files
| File | Lines | Purpose |
|------|-------|---------|
| auth.ts | 910 | Authentication logic |
| admin.ts | 1,836 | Admin operations |
| giftCards.ts | 1,080 | Gift card system |
| messages.ts | 488 | Messaging API |
| payments.ts | 410 | Payment processing |
| rateLimiter.ts | 110 | Rate limiting rules |
| csrfProtection.ts | 132 | CSRF token handling |
| auth.ts (utils) | 200 | JWT & token utilities |
| passwordHash.ts | 13 | Bcrypt wrappers |
| validation.ts | 91 | Input validation |
| db.ts | 108 | PostgreSQL pool |
| index.ts | 150+ | Express setup & security headers |

---

## RECOMMENDATIONS

### CRITICAL (Fix Before Production)

1. **Implement E2EE Messaging**
   - Use TweetNaCl.js or libsodium.js
   - Implement key exchange protocol
   - Encrypt on client before sending
   - Decrypt on client after receiving

2. **Implement Message Encryption at Rest**
   - Server-side encryption of stored messages
   - Key management strategy

3. **Use Environment Variables for API URLs**
   - Remove hardcoded URLs from code
   - Use Expo's .env configuration

### IMPORTANT (Before 1.0 Release)

4. Implement refresh token flow (shorter access token expiration)
5. Implement audit logging
6. Add API rate limiting on frontend (expo-rate-limit or similar)
7. Implement message encryption at database level
8. Use TLS pinning for mobile app
9. Add request signing for third-party API calls
10. Implement comprehensive error handling & monitoring

### NICE TO HAVE

11. Add request/response encryption for sensitive endpoints
12. Implement encrypted database backups
13. Add security headers: CSP refinement, HSTS preload
14. Implement secrets rotation mechanism
15. Add penetration testing schedule

---

## CONCLUSION

**Overall Security Score: 7/10**

The application has a solid security foundation with proper authentication, rate limiting, input validation, and HTTPS enforcement. The main critical gaps are:
1. E2EE messaging not implemented (stub only)
2. Message encryption at rest not implemented
3. Some architectural choices could be hardened (biometric credential storage, JWT expiration)

With the recommended fixes, this could reach 9/10 security maturity.
