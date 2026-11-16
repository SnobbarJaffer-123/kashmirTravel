# Kashmir Travel Booking Platform

Full-stack booking app: **React + TypeScript + Tailwind** (client), **Node + Express + TypeScript** (API), **MySQL** (database).

## Run it locally
1. Install Node 20+ and MySQL 8.
2. Create the database: `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/seed.sql`
3. API: `cd server && cp .env.example .env` (fill in your MySQL password and a long random `JWT_SECRET`), then `npm install && npm run dev`
4. Make yourself an admin: `npm run create-admin -- you@example.com YourStrongPassword "Your Name"`
5. Client (new terminal): `cd client && npm install && npm run dev` and open http://localhost:5173
6. Check the API at http://localhost:4000/api/health

## What already works
- Register, login, JWT sessions, hashed passwords, admin role
- Package search, sort and price filters (SQL, with a whitelist for sorting)
- Create booking (price calculated on the server), list my bookings, cancel
- Admin stats endpoints for charts (`/api/admin/stats`)
- Validation (zod), central error handling, rate limiting on auth, helmet, CORS

## API
| Method | Path | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/packages, /api/packages/:slug | public |
| POST/PUT/DELETE | /api/packages, /api/packages/:id | admin |
| POST | /api/bookings | logged in |
| GET | /api/bookings/mine | logged in |
| PATCH | /api/bookings/:id/cancel | owner |
| GET | /api/admin/stats, /api/admin/bookings | admin |

## Your roadmap (you build the rest)
**Week 1: setup and understanding.** Run everything. Read each server file and explain it in your own words. Test every endpoint in Postman or Thunder Client. Replace the seed descriptions with your own, add real photos in `client/public/images`. Make your first Git commit.

**Week 2: package detail page.** Route `/packages/:slug`, image, itinerary, price, back link. Add tests for the price calculation. Add the `GET /api/packages/:id/reviews` endpoint.

**Week 3: booking flow.** Booking form (date, guests) on the detail page, live total, success and error states, redirect to My bookings. Add a seat limit per date (sum of guests for that package and date must not exceed capacity) and enforce it in a transaction.

**Week 4: reviews and polish.** Only users with a confirmed booking can review. Show average rating on cards. Loading skeletons, empty states, mobile layout, keyboard and screen reader checks.

**Week 5: admin dashboard.** Admin-only routes, package create/edit form, bookings table with status change (confirm/cancel), Recharts charts from `/api/admin/stats`.

**Week 6: payments and email.** Razorpay test mode: create order on the server, verify the signature on the server, only then mark the booking confirmed and save a `payments` row. Send a confirmation email (Resend, Brevo or Nodemailer).

**Week 7: production.** See the checklist below.

## Production checklist
- Environment: strong `JWT_SECRET`, `CLIENT_URL` set to your real frontend URL, no secrets in Git
- HTTPS everywhere; restrict CORS to your frontend domain
- Managed MySQL with automatic backups; run `schema.sql` on it; use a least-privilege DB user, not root
- Build: `npm run build` in both folders. The API runs with `npm start`
- Frontend host (Vercel, Netlify or Cloudflare Pages) with a rewrite so all routes serve `index.html`; in production point the client at the API URL (replace the `/api` base with an env variable)
- API host (Render, Railway or Fly.io). Free-tier terms change, so check current limits
- Add a `/api/health` uptime check, error logging (Sentry free tier) and a few automated tests (Vitest for client, Vitest or Jest + Supertest for server)
- GitHub Actions workflow that runs build and tests on every push
- Legal basics: a privacy policy and terms page, since you store personal data

## Security notes (explain these in interviews)
- Passwords are hashed with bcrypt, never stored in plain text
- All SQL uses parameters, so SQL injection is blocked
- The server decides prices and checks ownership; it never trusts the browser
- Login errors don't reveal whether an email exists
- Tokens are stored in localStorage here for simplicity. A stronger design uses httpOnly cookies, a good upgrade to discuss

## Resume bullets (edit to match what you finish)
- Built a full-stack travel booking platform with React, TypeScript, Tailwind, Express and MySQL
- Designed a 5-table relational schema and built REST endpoints with JWT authentication and role-based access
- Implemented search, filters and a booking flow with server-side price calculation and validation
- Built an admin dashboard with SQL-driven revenue and booking charts
- Deployed to production with CI on GitHub Actions
