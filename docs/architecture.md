# System Breakdown

## Product Modules

1. Auth
   - Phone number OTP request and verification
   - Session token issuance
   - Role-aware authorization for landlords and tenants
2. Listings
   - Listing creation and management
   - Amenity tagging
   - Image upload with server-side compression
   - Availability and verification metadata
3. Discovery
   - Price, amenity, and location filters
   - List view and lightweight map-style view
   - Nearby taxi rank, school, and workplace proximity
4. Trust Layer
   - Verified landlord badge
   - Tenant reviews
   - Listing reporting
   - "Seen in person" confirmation
5. Communication
   - Lightweight in-app listing chat
   - WhatsApp click-to-chat fallback
6. Booking Intent
   - "I'm interested" intent capture
   - Viewing request workflow

## Backend Components

- `src/server.js`: server bootstrap, static hosting, API registration, and error handling
- `src/config/env.js`: environment variable normalization
- `src/db/*`: SQLite connection, schema bootstrap, and seed data
- `src/middleware/*`: auth parsing and role checks
- `src/services/*`: business logic per domain
- `src/routes/api.js`: API-first routes consumed by the frontend

## Frontend Components

- `public/index.html`: single-shell document optimized for fast first paint
- `public/styles.css`: mobile-first design system and responsive layout
- `public/app.js`: client-side rendering, API integration, and low-data caching

## Folder Structure

```text
.
|-- docs/
|   |-- architecture.md
|   `-- database-schema.sql
|-- public/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- src/
|   |-- config/
|   |   `-- env.js
|   |-- db/
|   |   |-- index.js
|   |   |-- schema.js
|   |   `-- seed.js
|   |-- middleware/
|   |   `-- auth.js
|   |-- routes/
|   |   `-- api.js
|   |-- services/
|   |   |-- auth-service.js
|   |   |-- chat-service.js
|   |   |-- listing-service.js
|   |   `-- trust-service.js
|   `-- server.js
|-- .gitignore
|-- package.json
`-- README.md
```

## API Surface

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/session`
- `GET /api/listings`
- `GET /api/listings/:id`
- `POST /api/listings`
- `POST /api/listings/:id/images`
- `POST /api/listings/:id/interest`
- `POST /api/listings/:id/view-request`
- `POST /api/listings/:id/report`
- `GET /api/chats`
- `GET /api/chats/:chatId/messages`
- `POST /api/chats`
- `POST /api/reviews`

## Low-Data Decisions

- Static frontend with no client bundle build step
- CSS gradients and inline UI instead of heavy UI libraries
- Compressed listing images served from local storage
- Compact list responses and on-demand detail fetches
- Map-style discovery without third-party map SDK payloads

## Scale Path

- Replace SQLite with PostgreSQL without changing route contracts
- Swap demo OTP for an SMS provider
- Move images to object storage and a CDN
- Add payments, agreements, and recommendations as new services
