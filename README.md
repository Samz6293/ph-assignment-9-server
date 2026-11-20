# PizzaHub — Server

The Express API for **PizzaHub**, a pizza ordering platform for local pizzerias. It owns all business data and rules: menu items, orders, Premium subscriptions, transactions, roles and blocking. Sign-up and sign-in happen in the Next.js client (Better Auth); this server verifies the token the client sends and checks every rule again.

## Links

| | |
|---|---|
| Live API | https://ph-assignment-9-server-smz.vercel.app |
| Live site | https://ph-assignment-9-smz.vercel.app |
| Server repository | https://github.com/Samz6293/ph-assignment-9-server |
| Client repository | https://github.com/Samz6293/ph-assignment-9-client |

## Features

- Role-based API for customers, vendors and admins, with the role always read from the database
- Menu items with admin review (pending → approved / rejected), on/off availability, and a Free plan limit of 3 active items
- Public menu with search, category, area and price sort as query parameters
- Orders with the assignment's rules: only live items, no ordering your own item, no duplicate active order for the same item and day, no past dates, answer only pending orders and only once
- Premium subscriptions through Stripe Checkout, switched on only by a verified Stripe webhook; cancel at the end of the paid month or keep Premium
- Read-only transactions for admins
- Overview statistics for each role, counted with MongoDB aggregation
- Every error is JSON `{ message }`, written so the client can show it in a toast

## Tech stack

| Package | Used for |
|---|---|
| `express` 5 | The API |
| `mongodb` | Database driver (MongoDB Atlas) |
| `jose` | Verifying the client's JWT against Better Auth's public keys (JWKS) |
| `stripe` | Checkout Sessions, subscriptions and webhook signature checks |
| `cors` | Letting the client call the API |
| `dotenv` | Loading `.env` |

## How the challenge parts work

### Middleware flow on protected routes

Every protected route runs the same chain before its own code:

```
request ─► verifyToken ─► loadUser ─► verifyRole("vendor") ─► route
```

1. **`verifyToken`** (`middleware/verifyToken.js`) reads `Authorization: Bearer <token>` and verifies the JWT with `jose` against Better Auth's public keys (`JWKS_URL`), including issuer and audience. No token → `401`.
2. **`loadUser`** (`middleware/loadUser.js`) loads the user from the database by the token's user id. The role and blocked status come from here, never from the browser. A deleted account → `401`; a blocked user → `403` on the very next request.
3. **`verifyRole(role)`** (`middleware/verifyRole.js`) lets only that role through. Wrong role → `403`.
4. The route then checks ownership (a vendor can only change their own items and answer their own orders; a customer can only cancel their own orders) and returns `403` / `404` / `400` with a message.

### API query parameters

`GET /menu-items` builds one MongoDB query from optional query parameters:

| Parameter | Effect |
|---|---|
| `search` | Matches the item name **or** category, case-insensitive (`$regex` with special characters escaped) |
| `category` | Exact category, only if it's one of the six allowed categories |
| `location` | Area, case-insensitive partial match (`zindabazar` finds "Zindabazar, Sylhet") |
| `sort` | `price_asc`, `price_desc`, or `featured` (Premium vendors' items first, then newest); newest first by default |
| `limit` | 1–50 items; anything else falls back to 50 |

Only approved items are ever returned. The vendor's public details are attached with a `$lookup` that keeps only their name, business name and plan. Admin lists use the same idea: `GET /admin/users?search=&role=` and `GET /admin/menu-items?search=&status=`.

### Stripe Premium and the webhook

1. `POST /create-checkout-session` (vendor) creates a Stripe Checkout Session for the monthly Premium price and returns its URL. The vendor's id travels with the session (`client_reference_id`) and on the subscription (`metadata`).
2. Stripe calls `POST /webhook`. This route is registered **before** `express.json()` so it receives the raw body, and `stripe.webhooks.constructEvent` rejects anything Stripe didn't sign with `STRIPE_WEBHOOK_SECRET`.
3. On `checkout.session.completed`, the server fetches the session from Stripe again, skips unpaid or already-saved sessions, saves the transaction and sets the vendor to Premium until the end of the paid month.
4. On `customer.subscription.deleted`, the vendor goes back to Free.

The success redirect never changes the plan; only the verified webhook does.

## API routes

| Method | Route | Who | What |
|---|---|---|---|
| GET | `/` | public | Health check |
| GET | `/menu-items` | public | Approved items with search, filters and sort |
| GET | `/menu-items/locations` | public | Every area with a live item |
| GET | `/menu-items/:id` | public | One item for Item Details |
| GET | `/vendors/latest` | public | Newest pizzeria with a live item |
| GET | `/users/me` | signed in | The signed-in user |
| POST | `/menu-items` | vendor | Add an item (pending) |
| GET | `/menu-items/mine` | vendor | Their own items, every status |
| PATCH | `/menu-items/:id` | vendor (owner) | Edit an item (goes back to pending) |
| PATCH | `/menu-items/:id/availability` | vendor (owner) | Switch an approved item on or off |
| DELETE | `/menu-items/:id` | vendor (owner) | Delete an item |
| POST | `/orders` | customer | Place an order |
| GET | `/orders/mine` | customer | Their orders |
| PATCH | `/orders/:id/cancel` | customer (owner) | Cancel a pending order |
| GET | `/orders/vendor` | vendor | Orders for their items |
| PATCH | `/orders/:id/status` | vendor (owner) | Accept or reject a pending order, once |
| POST | `/create-checkout-session` | vendor | Start a Premium payment |
| POST | `/subscriptions/cancel` | vendor | Stop Premium renewing |
| POST | `/subscriptions/resume` | vendor | Keep Premium after cancelling |
| POST | `/webhook` | Stripe | Payment and subscription events |
| GET | `/admin/users` | admin | Users, with search and role filter |
| PATCH | `/admin/users/:id/block` | admin | Block or unblock a user |
| GET | `/admin/menu-items` | admin | Every item, with search and status filter |
| PATCH | `/admin/menu-items/:id/status` | admin | Approve or reject an item |
| DELETE | `/admin/menu-items/:id` | admin | Delete an item |
| GET | `/admin/transactions` | admin | Every Premium payment (read-only) |
| GET | `/stats/admin` | admin | Overview numbers |
| GET | `/stats/vendor` | vendor | Overview numbers |
| GET | `/stats/customer` | customer | Overview numbers |

## Environment variables

Create a `.env` file in the project root. Names only; never commit the values.

| Name | What it is |
|---|---|
| `DATABASE_URI` | MongoDB connection string (the same database as the client) |
| `DB_NAME` | Database name |
| `CLIENT_URL` | The client's URL; used for the JWT issuer/audience and Stripe's return pages |
| `JWKS_URL` | Better Auth's public keys, e.g. `http://localhost:3000/api/auth/jwks` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PREMIUM_PRICE_ID` | The Stripe Price ID of the monthly Premium plan |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook endpoint |

## Run it locally

You need Node.js 20 or newer, a MongoDB database, a Stripe account in test mode and the [client](https://github.com/Samz6293/ph-assignment-9-client) running on port 3000 (it issues the tokens).

```bash
git clone https://github.com/Samz6293/ph-assignment-9-server.git
cd ph-assignment-9-server
npm install
```

Add the `.env` file from the table above, then:

```bash
node index.js
```

The API runs on http://localhost:8080. `npm run dev` does the same but restarts on every change; it needs `nodemon` installed globally (`npm install -g nodemon`).

To receive Stripe webhooks locally, run the Stripe CLI in a second terminal and use the `whsec_…` secret it prints as `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --events checkout.session.completed,customer.subscription.deleted --forward-to localhost:8080/webhook
```

Test payments use Stripe's test card `4242 4242 4242 4242` with any future date and any CVC.
