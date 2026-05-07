# Quick Notes

A lightweight, secure web app to capture and organize notes by tag — built for personal knowledge management so you never forget what you learn.

## Features

- **JWT authentication** — register and log in; all notes are private per user
- **Tag-based organization** — attach up to 10 tags per note and filter by tag
- **Random note** — surface a random note for review (`GET /api/notes/random`)
- **Security hardened** — Helmet CSP, bcrypt password hashing, rate limiting on auth and API routes
- **Serverless-ready** — deploys to Vercel out of the box

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | MongoDB via Mongoose |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Security | Helmet, express-rate-limit, bcryptjs |
| Validation | express-validator |
| Hosting | Vercel (serverless) |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A MongoDB connection string (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Setup

```bash
git clone https://github.com/<you>/quick-notes.git
cd quick-notes
npm install
cp .env.example .env   # fill in your values
npm start              # or: npm run dev  (hot-reload via nodemon)
```

### Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs (keep this strong and private) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` (default: `7d`) |
| `PORT` | HTTP port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |
| `ALLOWED_ORIGIN` | CORS allowed origin (omit to allow all) |

## API Reference

All `/api/notes` routes require a `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | Create account — returns JWT |
| POST | `/api/auth/login` | `{ email, password }` | Log in — returns JWT |

### Notes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notes` | List all notes (optional `?tag=<tag>` filter) |
| GET | `/api/notes/random` | Get one random note |
| GET | `/api/notes/:id` | Get a single note |
| POST | `/api/notes` | Create a note — body: `{ note, tags? }` |
| PUT | `/api/notes/:id` | Update a note — body: `{ note, tags? }` |
| DELETE | `/api/notes/:id` | Delete a note |

**Note body constraints:** `note` max 5000 chars · `tags` array of up to 10 strings.

### Rate Limits

- Auth endpoints: 20 requests per 15 minutes
- All API endpoints: 100 requests per minute

## Running Tests

```bash
npm test
```

Tests use an in-memory MongoDB instance (no external database required).

## Deployment (Vercel)

The project includes a `vercel.json` that routes all traffic through `api/index.js`.

```bash
npm i -g vercel
vercel --prod
```

Set the environment variables listed above in the Vercel project dashboard before deploying.

## Project Structure

```
quick-notes/
├── api/
│   └── index.js          # Express app entry point
├── src/
│   ├── db.js             # Mongoose connection (cached for serverless)
│   ├── middleware/
│   │   └── auth.js       # JWT verification middleware
│   ├── models/
│   │   ├── Note.js
│   │   └── User.js
│   └── routes/
│       ├── auth.js       # /api/auth
│       └── notes.js      # /api/notes
├── public/               # Static frontend (HTML/CSS/JS)
├── tests/                # Jest + Supertest integration tests
├── .env.example
└── vercel.json
```

## License

MIT
