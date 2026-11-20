# PizzaHub — Build Workflow

How we build PizzaHub piece by piece. Read with `design.md` (what it looks like) and the assignment PDF (what it must do).

**Who does what:** Claude Code writes all the code, directly in the repos, in dh1's style (the `dh1-code-style` skill). dh1 writes no code: he reviews, tests and runs every git command that changes the repo. In this file, "Claude" means Claude Code and "dh1" means the reviewer.

---

## 1. The loop

Every piece goes through the same five steps:

```
1. Claude explains → 2–4 lines: what the piece does, why this way, any new
                     concept (asks dh1 before using it)
2. Claude writes   → the files for ONE piece only, in dh1's style
3. dh1 reviews     → reads the diff (git diff / editor), asks about anything
                     unclear, asks for changes; Claude edits until he's happy
4. Check           → Claude runs what it can (dev server, build, curl), dh1
                     checks the UI in the browser (section 3)
5. Green light     → dh1 says "green light"; Claude replies with the commit
                     message + git commands only. dh1 runs them and pushes
```

Rules:
- Claude may run read-only git (`git status`, `git diff`, `git branch --show-current`, `git grep`) but never `add`, `commit`, `push`, `switch`, `merge` or `branch -d`.
- One piece at a time. Claude doesn't start the next piece until dh1 has pushed the current one.
- Claude doesn't refactor or "improve" files outside the current piece.
- If the check fails, we fix it on the same branch before any commit.
- If something gets postponed, it becomes a `// TODO:` at the exact spot, and the branch can't merge until `git grep -n "TODO:"` is empty.
- Feature branches in both repos. A feature that touches both repos uses the **same branch name** in each.

---

## 2. Two repos

| | Client | Server |
|---|---|---|
| Repo | `pizzahub-client` | `pizzahub-server` |
| Stack | Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui, Better Auth, Motion | Express, MongoDB driver, `jose` (JWT verify), Stripe |
| Owns | UI, routing, route guards (`proxy.ts`), Better Auth (sign up/in, Google, sessions, issues the JWT), ImgBB upload | All business data and rules: menu items, orders, transactions, roles, blocking, Stripe sessions + webhook |
| Deploy | Vercel | Vercel (serverless) |
| Commits needed | ≥ 20 | ≥ 12 |

**How they talk:** Better Auth lives in the client and writes users to the shared MongoDB database. Its JWT plugin gives the logged-in user a signed token. The client sends it as `Authorization: Bearer <token>` to Express. Express verifies it, then **loads the user from the database** to get the real role and `isBlocked`. It never trusts a role sent by the browser.

```
Browser ──(session cookie)──► Next.js / Better Auth ──► MongoDB (users)
   │                                                        ▲
   └──(Bearer JWT)──► Express ── verifyToken ── loadUser ───┘
                         └── verifyRole ── route ──► menuItems / orders / transactions
Stripe ──(signed webhook)──► Express /webhook ──► users.subscriptionPlan + transactions
```

**Env variable names** (values never committed; both repos start with `.env` in `.gitignore`):

| Client `.env.local` | Server `.env` |
|---|---|
| `BETTER_AUTH_SECRET` | `MONGODB_URI` |
| `BETTER_AUTH_URL` | `DB_NAME` |
| `MONGODB_URI` | `CLIENT_URL` |
| `GOOGLE_CLIENT_ID` | `JWKS_URL` (Better Auth's `/api/auth/jwks`) |
| `GOOGLE_CLIENT_SECRET` | `STRIPE_SECRET_KEY` |
| `NEXT_PUBLIC_API_URL` | `STRIPE_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_IMGBB_KEY` | `STRIPE_PREMIUM_PRICE_ID` |

---

## 3. The check

### Client piece

- [ ] `npm run dev` runs with no errors in the terminal or browser console
- [ ] Matches `design.md`: tokens, type styles, radius, spacing, equal card sizes
- [ ] Looks right at 375 px, 768 px and 1280 px
- [ ] Looks right in light **and** dark
- [ ] Every state the piece has: loading, empty, error, success toast
- [ ] Links and buttons all go somewhere real
- [ ] No hex, no `[...]` values, no `any` in the new code
- [ ] `npm run build` passes (run at least once per branch, before merging)

### Server route

- [ ] Server starts with no errors
- [ ] Happy path works (I give you a curl / Thunder Client request for each route)
- [ ] No token → `401`; wrong role → `403`; someone else's resource → `403`; bad id → `404`; bad body → `400`
- [ ] Error bodies are `{ message }` written for a toast
- [ ] Blocked user → `403`

### Before merging a branch (both repos)

```
git status
git grep -n "TODO:"
```

Both clean → merge commands.

---

## 4. Build order

Each phase is a branch (or one branch per repo with the same name). Pieces inside a phase are one commit each. Estimated commits are shown as **C** (client) and **S** (server).

### Phase 0 — Setup · `main`

| # | Repo | Piece |
|---|---|---|
| 0.1 | Server | `npm init`, Express app, `database/connect.js`, CORS for `CLIENT_URL`, `GET /` health route, `vercel.json`, `.gitignore` |
| 0.2 | Client | `create-next-app` (TS, Tailwind, App Router), `npx shadcn@latest init` (you pick the init options), `.gitignore` check |

Commits: C1 · S1

### Phase 1 — Theme and shell · `feature/shell` (client)

| # | Piece | Notes |
|---|---|---|
| 1.1 | `globals.css` | `design.md` colours mapped onto **shadcn token names** (`primary` = Tomato, `card` = surface, etc.); add only `success`/`warning` tokens; Caprasimo + Archivo via `next/font`; `content-box`; debug line |
| 1.2 | `Logo` | SVG mark + wordmark as one reusable component, `size` prop |
| 1.3 | `Navbar` (logged-out) | `lib/navlinks.ts`, `NavLinks`, mobile `Sheet` |
| 1.4 | `Footer` | Links from the same array, X icon, contact |
| 1.5 | Theme toggle | `next-themes` per shadcn's Dark mode docs |
| 1.6 | `not-found.tsx` + `error.tsx` | 404 and global error page |

Commits: C6 · running total C7 · S1

### Phase 2 — Auth and roles · `feature/auth` (both repos)

The hardest part. Done early because every other feature depends on it.

| # | Repo | Piece |
|---|---|---|
| 2.1 | Client | `lib/auth.ts`: Better Auth + MongoDB adapter, user collection named `users`, extra fields (`role`, `isBlocked`, `businessName`, `subscriptionPlan`, `subscriptionExpiresAt`); only `role` and `businessName` settable at sign-up, and `role` limited to `vendor`/`customer`; Google provider; JWT plugin |
| 2.2 | Client | Sign Up page (role picker cards, password rules, optional image) |
| 2.3 | Client | Sign In page (email + Google), redirect by role |
| 2.4 | Client | Navbar logged-in state: `ProfileMenu` dropdown; updates instantly on auth change |
| 2.5 | Client | `proxy.ts`: logged-out → Sign In; wrong role's dashboard → own dashboard; blocked → blocked page |
| 2.6 | Client | Dashboard shell: layout with role-based sidebar, mobile sheet, top bar, empty overview pages for the 3 roles |
| 2.7 | Server | `verifyToken` (verify JWT against `JWKS_URL`) |
| 2.8 | Server | `loadUser` (DB lookup, blocked check) + `verifyRole("vendor")` etc.; `GET /users/me` to test the chain |
| 2.9 | Client | `lib/fetch.ts` base helper that attaches the token |

Admin: one account promoted by hand in MongoDB (`role: "admin"`). Never through sign-up.

**After Phase 2: deploy both to Vercel once.** Test sign-in, Google, reload on a private route, and a call to `/users/me` on the live site. Production problems are much easier to fix now than at the end.

Commits: C7 · S2 · running total C14 · S3

### Phase 3 — Menu items · `feature/menu-items` (both)

| # | Repo | Piece |
|---|---|---|
| 3.1 | Server | `POST /menu-items` (vendor): validate, status `pending`, Free plan limit of 3 active |
| 3.2 | Server | `GET /menu-items/mine`, `PATCH /menu-items/:id`, `DELETE /menu-items/:id` (owner only), availability toggle |
| 3.3 | Server | `GET /menu-items` public: approved + active only; `search`, `category`, `location`, `sort=price_asc/price_desc`, `limit`; `GET /menu-items/:id` |
| 3.4 | Client | `ImageUpload` (ImgBB, preview, error) |
| 3.5 | Client | Add Menu Item page (form + Free-plan limit banner) |
| 3.6 | Client | My Menu Items page (table → cards on mobile, edit dialog, delete confirm) |
| 3.7 | Client | `MenuCard` + `MenuCardSkeleton` |
| 3.8 | Client | Browse Menu page: search, filters, sort, all synced to the URL; empty state |
| 3.9 | Client | Item Details `/menu/[id]`: gallery, vendor card, Order button states, invalid-id state |

Commits: C6 · S3 · running total C20 · S6

### Phase 4 — Home page · `feature/home` (client)

| # | Piece |
|---|---|
| 4.1 | Banner (headline, CTA, illustration) |
| 4.2 | Featured Menu Items (6+, Premium vendors first) |
| 4.3 | Pizza Categories (6 tiles → `/menu?category=`) |
| 4.4 | Why Choose PizzaHub? |
| 4.5 | How PizzaHub Works |
| ~~4.6~~ | Motion moved to Phase 10 (dh1 wants to learn it first) |

Commits: C6 · running total C26 · S6

### Phase 5 — Orders · `feature/orders` (both)

| # | Repo | Piece |
|---|---|---|
| 5.1 | Server | `POST /orders` (customer): item must be approved + active, not own item, no duplicate active order for same item + date, date not in the past |
| 5.2 | Server | `GET /orders/mine` (customer), `PATCH /orders/:id/cancel` (own + pending only) |
| 5.3 | Server | `GET /orders/vendor` (vendor), `PATCH /orders/:id/status` accept/reject (own + pending only, once) |
| 5.4 | Client | `OrderForm` dialog on Item Details |
| 5.5 | Client | Customer → My Orders (details, cancel confirm) |
| 5.6 | Client | Vendor → Customer Orders (accept / reject) |

Commits: C3 · S3 · running total C29 · S9

### Phase 6 — Admin · `feature/admin` (both)

| # | Repo | Piece |
|---|---|---|
| 6.1 | Server | `GET /admin/users` (search, role filter), `PATCH /admin/users/:id/block` |
| 6.2 | Server | `GET /admin/menu-items` (all statuses), `PATCH /admin/menu-items/:id/status`, `DELETE /admin/menu-items/:id` |
| 6.3 | Client | Manage Users page |
| 6.4 | Client | Manage Menu Items page (pending first, approve/reject) |

Transactions page comes in Phase 7, once transactions exist.

Commits: C2 · S2 · running total C31 · S11

### Phase 7 — Stripe Premium · `feature/premium` (both)

| # | Repo | Piece |
|---|---|---|
| 7.1 | Server | `POST /subscriptions/checkout` (vendor, own account only): creates Checkout Session, success/cancel URLs |
| 7.2 | Server | `POST /webhook`: raw body, signature check with `STRIPE_WEBHOOK_SECRET`; on paid → save transaction + set Premium; on cancel/expire → back to Free. This route is registered **before** `express.json()` |
| 7.3 | Server | `GET /admin/transactions` (read-only, no update route at all) |
| 7.4 | Client | Vendor Subscription page (plan cards, Upgrade button) |
| 7.5 | Client | Payment Success (waits for webhook: "Confirming payment…") + Payment Cancel |
| 7.6 | Client | Admin Transactions page |

Test locally with the Stripe CLI (`stripe listen --forward-to localhost:5000/webhook`), then once on the live site with a test card.

Commits: C3 · S3 · running total C34 · S14

### Phase 8 — Overviews and profile · `feature/dashboards` (both)

| # | Repo | Piece |
|---|---|---|
| 8.1 | Server | `GET /stats/vendor`, `/stats/customer`, `/stats/admin` (counts via aggregation) |
| 8.2 | Server | `PATCH /users/me` (name, image, businessName only; role and plan ignored) |
| 8.3 | Client | `StatCard` + the three overview pages |
| 8.4 | Client | Charts (shadcn Chart) on overviews |
| 8.5 | Client | Profile Settings page |

Commits: C3 · S2 · running total C37 · S16

### Phase 9 — Optional features · `feature/order-timeline` (+ dark mode, already done)

| # | Repo | Piece |
|---|---|---|
| 9.1 | Client | Order status timeline in order details |

Dark mode (Phase 1.5) counts as the second optional feature.

### Phase 10 — Polish · `fix/<name>` branches as needed

- Motion on home sections (fade-up on scroll, banner on load, card hover lift, reduced-motion respected), after dh1 has read up on Motion
- Responsive pass on every page at 375 / 768 / 1280
- Loading and error states audit against `design.md` section 10
- Every toast checked against the voice rules
- Lighthouse / contrast spot check

### Phase 11 — Ship · `main`

- [ ] Final deploy, env vars set in both Vercel projects
- [ ] Google OAuth redirect URIs include the live domain
- [ ] Stripe webhook endpoint points at the live server
- [ ] Reload test on every route, logged in and out
- [ ] Admin credentials work on the live site
- [ ] README in both repos: name, description, features, packages, setup, run locally, live link, repo links, env names, how the challenge parts work (query params, JWT middleware flow)

Commits: README C1 · S1 → final totals around **C40 · S17**, comfortably over 20 / 12.

---

## 5. Things to settle when we reach them

These are your calls; I'll ask at the start of the piece:

- shadcn init options (style, base colour, icon library) — Phase 0.2
- Next.js and Better Auth versions: I read the installed version's docs before writing (Phase 0 / 2)
- How the server component gets the JWT for server-side fetches (Phase 2.9, from Better Auth's JWT plugin docs)
- Pagination on Browse Menu or not (Phase 3.8)
- Mascot: whether your moustached slice appears in the banner and 404 (Phase 1.6 / 4.1)

---

## 6. Commands dh1 gives Claude Code

| dh1 says | Claude Code does |
|---|---|
| "Next" | Checks the branch (gives `git switch -c …` if a new phase starts), explains, then writes the next piece's files in dh1's style |
| A question about a line | Explains it, no file changes |
| "Change X" | Edits only that, shows what changed |
| "This breaks: …" | Points at the cause and line, stops. Fixes only when asked |
| "Green light" | Commit message + `git add` / `git commit` / `git push` commands only, nothing else |
| "Feature done" | Runs `git status` + `git grep -n "TODO:"` in the repo(s); if clean, gives merge commands |

Start each Claude Code session in the repo folder (`~/Desktop/repos/pizzahub-client` or `pizzahub-server`) with: "Read `design.md` and `workflow.md`, use my code style, we're at piece X."
