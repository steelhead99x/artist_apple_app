# Artist Space Backend - PostgreSQL & Express

Node.js/Express backend for Artist Space with PostgreSQL database.

## Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Required:
- `PGHOST` - PostgreSQL host
- `PGPORT` - PostgreSQL port (default: 5432)
- `PGUSER` - PostgreSQL user
- `PGPASSWORD` - PostgreSQL password
- `PGDATABASE` - PostgreSQL database name
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 8787)

Optional:
- `CORS_ORIGIN` - Allowed origins for CORS
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `MUX_AUTOPLAY_PLAYBACK_ID` - Mux video playback ID

## Database Setup

```bash
# Initialize schema
psql "your-database-url" < schema.sql
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/config/video` - Video configuration
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/livekit/token` - Generate LiveKit token

## Development

- TypeScript source: `src/`
- Compiled output: `dist/`
- Database schema: `schema.sql`

## Deployment

See `MIGRATE_TO_DIGITALOCEAN.md` for full deployment guide.

Quick deploy:
```bash
npm run build
npm start
```

## Migration from Cloudflare Workers

This backend replaces the Cloudflare Workers (`/worker`) setup. 

Key changes:
- D1 (SQLite) → PostgreSQL
- Cloudflare Workers → Express
- R2 → PostgreSQL BYTEA / DO Spaces

See migration guide: `../MIGRATE_TO_DIGITALOCEAN.md`

