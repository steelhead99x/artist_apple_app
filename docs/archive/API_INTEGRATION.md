# API Integration Guide

This document outlines the API endpoints needed on **artist-space.com** backend to support the mobile app.

## Base URL

- **Staging**: `https://stage-www.artist-space.com/api`
- **Production**: `https://www.artist-space.com/api`

## Required Endpoints

### Authentication

#### POST `/auth/login`
Login with username/email and password

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "userType": "artist|band|studio|manager"
  }
}
```

#### POST `/auth/register`
Register a new user

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "userType": "artist|band|studio|manager"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": { ... }
}
```

#### GET `/auth/me`
Get current authenticated user

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "userType": "artist|band|studio|manager",
  "profileImage": "url",
  "bio": "string"
}
```

## Token Format

The mobile app expects JWT tokens and stores them securely using `expo-secure-store`.

**Token should include:**
- User ID
- User type
- Expiration time
- Standard JWT claims

## Error Responses

All endpoints should return consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## Authentication Flow

1. User enters credentials in mobile app
2. App sends POST to `/auth/login`
3. Backend validates credentials
4. Backend returns JWT token + user data
5. Mobile app stores token in secure storage
6. App includes token in all subsequent requests via `Authorization` header
7. If 401 response, app logs user out and clears token

## CORS Configuration

Ensure your API allows requests from Expo:

```javascript
// Allow these origins during development
origins: [
  'exp://localhost:8081',
  'http://localhost:19006',
  // Add production app URLs when deployed
]
```

## Reusing Existing Web API

If your React web app already has authentication, you can likely reuse the same endpoints!

**Check your existing web app for:**
- Login endpoint
- Token format (JWT?)
- API base URL
- How authentication is handled

**Then update** `src/services/api.ts`:
```typescript
const API_BASE_URL = 'https://stage-www.artist-space.com/api';
```

## Testing the Integration

Use these tools to test your API endpoints before mobile integration:

1. **Postman** - Create requests to test endpoints
2. **curl** - Command line testing
3. **Your existing React web app** - Check network tab in browser DevTools

Example curl test:
```bash
curl -X POST https://stage-www.artist-space.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## Next Steps

1. Identify if these endpoints already exist in your web app
2. If yes, just update `API_BASE_URL` in `src/services/api.ts`
3. If no, implement them on the backend
4. Test with Postman/curl first
5. Then test from mobile app

## Additional Endpoints to Implement

As you expand the app, you'll need:

- **Profile**: GET/PUT `/users/:id`
- **Projects**: CRUD operations on `/projects`
- **Collaborations**: `/projects/:id/collaborators`
- **Messages**: `/messages`, `/conversations`
- **Media Upload**: POST `/upload` (for images/audio)
- **Search**: GET `/search?q=query`

## File Uploads

For camera/image picker features, implement multipart/form-data upload:

```typescript
// Mobile app will send
const formData = new FormData();
formData.append('file', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
});

await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```
