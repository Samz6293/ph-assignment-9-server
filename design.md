# PizzaHub — Design Spec

> Where the local slices meet.

Source of truth for how PizzaHub looks, reads and behaves. Brand values come from the PizzaHub brand identity file; page and feature scope come from Assignment 9 (Category 009).

---

## 1. Product in one paragraph

PizzaHub is a role-based pizza ordering platform. **Customers** find local pizzerias, browse menus and order for a chosen delivery date. **Vendors** (restaurants) publish menu items and accept or reject orders. **Admins** moderate users and menu items and view transactions. Vendors can pay (Stripe) for **Premium**: unlimited active items, a Premium badge and featured homepage placement.

The neighbourhood is the hero, not the platform. Every surface should name the shop and the area.

---

## 2. Brand

### 2.1 Logo

The mark is a pizza slice turned point-down so it reads as a map pin: find the pizza near you.

| Part | Rule |
|---|---|
| Slice | Triangle on an 80 × 84 viewBox, pointing down to one pin point. Fill Crust `#F0C48E`, stroke Char `#201E1D`, 4 units, round joins |
| Crust | One rounded arc, stroke 10 units, Tomato `#B8321F`, round caps |
| Toppings | Two pepperoni (Tomato) + one basil leaf (Basil `#7A8A5E`). Never add more |
| Wordmark | Caprasimo. "Pizza" in text colour, "Hub" always Tomato |
| Clear space | x on every side, where x = height of the "a" in the wordmark |
| Minimum size | Full logo 96 px wide; mark alone 20 px |

Canonical SVG:

```svg
<svg viewBox="0 0 80 84">
  <path d="M10 20 Q40 6 70 20 L40 78 Z" fill="#f0c48e" stroke="#201e1d" stroke-width="4" stroke-linejoin="round"/>
  <path d="M9 19 Q40 3 71 19" fill="none" stroke="#b8321f" stroke-width="10" stroke-linecap="round"/>
  <circle cx="31" cy="33" r="5.5" fill="#b8321f"/>
  <circle cx="50" cy="34" r="5.5" fill="#b8321f"/>
  <circle cx="40" cy="51" r="6" fill="#7a8a5e"/>
</svg>
```

**Variations**

| Variant | Use | Notes |
|---|---|---|
| Primary · light | Default on Flour | As above |
| Primary · dark | On Char | Slice stroke becomes `#F5EAD8` |
| Reversed on Tomato | Promo blocks, app splash | All white, slice unfilled; wordmark all white |
| Mono | One-colour print | All Char, slice unfilled |
| Mark only | App icon, map pins, avatars | |
| Wordmark only | Tight horizontal spaces | |

**Favicon / app icon**: Tomato rounded square. 16 px: slice + white crust only. 32 px: slice, white crust, one Tomato dot. 512 px app icon: full mark, crust in `#FBF3E6`, radius ≈ 23%.

### 2.2 Voice

| Principle | Say | Not |
|---|---|---|
| Warm, like the shop owner | "The oven's on. Your usual is waiting." | "Experience culinary excellence." |
| Clear about status — say what happened and what's next | "Napoli Corner will confirm your order." | "Oops! Something's cooking 🍕" |
| Local first — name the shop and area | "Napoli Corner · 2 km away" | "Vendor #142" |

Copy rules:
- No emoji in system messages.
- Error messages say what went wrong and how to fix it ("Enter a valid email", "You already ordered this for Fri, 21 Nov.").
- Toasts: bold title + one short line.

---

## 3. Colour

### 3.1 Brand colours

| Name | Hex | Role |
|---|---|---|
| Tomato | `#B8321F` | The one action colour (both themes), logo |
| Crust | `#F0C48E` | Premium, highlights |
| Basil | `#7A8A5E` | Success, Accept |
| Flour | `#F5EAD8` | Light ground |
| Char | `#1D1A17` | Dark ground |

### 3.2 Ramps (100 → 900; brand step in **bold**)

| Ramp | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| Tomato | `#fbe4df` | `#f7c9bf` | `#ee9f90` | `#e0705e` | `#c9402c` | **`#b8321f`** | `#962717` | `#731e12` | `#4d150d` |
| Crust | `#fcf1e2` | `#f8e0c2` | **`#f0c48e`** | `#e3a86a` | `#d18b45` | `#b06f30` | `#8a5524` | `#643d1a` | `#3f2610` |
| Basil | `#eef1e7` | `#dfe5d3` | `#c3cdb0` | `#9aab7c` | **`#7a8a5e`** | `#626f4b` | `#4c573a` | `#3f4a2e` | `#2a3120` |
| Flour | `#fbf3e6` | **`#f5ead8`** | `#e4d3b8` | `#c4b8a6` | `#9a8e80` | `#5c544c` | `#463c34` | `#2a2420` | `#1d1a17` |

Hover on Tomato = Tomato 700 `#962717`.

### 3.3 Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f5ead8` | `#1d1a17` | Page |
| `--surface` | `#fbf3e6` | `#2a2420` | Cards, fields |
| `--surface2` | `#efe1c9` | `#352d27` | Muted blocks, neutral tags |
| `--line` | `#e4d3b8` | `#463c34` | Borders, dividers |
| `--text` | `#201e1d` | `#f5ead8` | Body text |
| `--muted` | `#5c544c` | `#c4b8a6` | Secondary text |
| `--red` | `#b8321f` | `#b8321f` | Primary buttons, focus |
| `--red-text` | `#b8321f` | `#f7b4a8` | Error text |
| `--red-tint` / `--red-ink` | `#f7d6cf` / `#7e1f12` | `#4a2420` / `#f7b4a8` | Rejected, error icon circle |
| `--sage` | `#7a8a5e` | `#7a8a5e` | Accept button |
| `--sage-tint` / `--sage-ink` | `#dfe5d3` / `#3f4a2e` | `#363f2b` / `#cfdcb6` | Accepted, Approved, success |
| `--cheese` | `#f0c48e` | `#f0c48e` | Premium accent |
| `--cheese-tint` / `--cheese-ink` | `#f6e2b3` / `#6b4a10` | `#4a3a1c` / `#f0d08a` | Pending, warning |
| `--img` | `#f3d9b8` | `#3a2a24` | Image placeholder |
| `--shadow` | `0 2px 6px rgba(80,50,20,.06), 0 14px 32px rgba(80,50,20,.10)` | `0 2px 6px rgba(0,0,0,.25), 0 14px 32px rgba(0,0,0,.35)` | Floating cards, toasts |

Rules:
- Tomato is the only action colour. One primary button per view region.
- Text on Tomato is always white.
- Status colour always comes as tint background + ink text, never ink on bg alone.

---

## 4. Typography

**Caprasimo** (400) for headings, prices and big numbers only. **Archivo** (400/500/600/700) for everything you read or tap.

| Style | Size (desktop / tablet / mobile) | Font | Tailwind |
|---|---|---|---|
| Display | 76 / 58 / 42, line-height 1 | Caprasimo | `text-[76px] leading-none` |
| H2 (section heading) | 48 / 40 / 32, lh 1.05 | Caprasimo | `text-5xl` |
| H3 (dashboard page title) | 36 / 32 / 28, lh 1.1 | Caprasimo | `text-4xl` |
| Card title | 21 | Caprasimo | `text-xl` |
| Lead | 19 / 18 / 16, lh 1.6 | Archivo | `text-lg leading-relaxed` |
| Body | 15–16, lh 1.6 | Archivo | `text-base` |
| Label | 14 semibold | Archivo 600 | `text-sm font-semibold` |
| Overline | 13 bold caps, tracking .08em, Basil 700 `#4c573a` | Archivo 700 | `text-xs tracking-widest uppercase` |

Rules:
- Every section heading uses the same H2 style (assignment requirement).
- Section header pattern: Overline → H2 → optional Lead in `--muted`, max-width ~720 px.
- Prices: Caprasimo, prefixed `৳`.
- Body copy max ~70 characters per line; `text-wrap: pretty`.

---

## 5. Iconography

Lucide (`lucide-react`), 18–20 px, `strokeWidth={2.5}`. In soft circles, put the icon on a tint with the matching ink (e.g. clock on `--cheese-tint`/`--cheese-ink`).

Core set: house, search, pizza, store, map-pin, shopping-bag, calendar, clock, circle-check, circle-x, crown (Premium), badge-check, layout-dashboard, inbox, circle-plus, users, clipboard-list, receipt, settings, bell, moon, sun, log-out, menu.

Social: use the **X** logo, not the Twitter bird.

---

## 6. Shape, spacing, elevation

| Token | Value | Use |
|---|---|---|
| `--radius-pill` | 999px | Buttons, search, tags, icon buttons |
| `--radius-field` | 14px | Inputs, selects, textareas |
| `--radius-card` | 20px | Cards, stat tiles, toasts (18) |
| `--radius-panel` | 28px | Large panels, hero blocks |

- Spacing on a 4 px base; common steps 8 / 12 / 16 / 20 / 24 / 32 / 48.
- Page container: max 1320 px, 48 px side padding desktop, 20 px mobile.
- Gap between homepage sections: 112 px desktop, ~72 px mobile.
- Borders: 1px `--line` on cards, 1.5px on fields.
- Shadow only on floating things (toasts, dropdowns, featured card hover). Cards at rest are flat with a border.

---

## 7. Components (shadcn/ui variants)

### Buttons (pills)

| Variant | Style |
|---|---|
| Primary | Tomato bg, white text, 600, `12px 22px`, 15px. Trailing arrow icon optional |
| Primary hover | `#962717` |
| Secondary | Transparent, inset 1.5px `--text` ring |
| Ghost | No bg, no border |
| Accept | Basil bg, white text |
| Icon | 44 × 44 circle, `--surface`, 1px `--line` |
| Disabled | Same variant at 45% opacity, `cursor-not-allowed` |
| Loading | Spinner replaces trailing icon, label changes ("Placing order…"), disabled |

Use the same button style everywhere as on the home page.

### Fields

- Default: `--surface`, 1.5px `--line` border, radius 14, padding `12px 14px`, 14px text, placeholder `--muted`.
- Focus: border `--red` + `0 0 0 3px var(--red-tint)` ring.
- Error: border `--red`, message below in 12px 600 `--red-text`.
- Label above in Label style. Required fields marked.
- Search: pill, leading search icon, "Search pizzas, sides, drinks…".

### Status tags (pills, 12px 700, `4px 10px`)

| Status | Colours |
|---|---|
| Pending | `--cheese-tint` / `--cheese-ink` |
| Accepted, Approved | `--sage-tint` / `--sage-ink` |
| Rejected | `--red-tint` / `--red-ink` |
| Cancelled, Inactive | `--surface2` / `--muted` |
| Premium | `#201e1d` bg, `#f0c48e` text, crown icon |
| Blocked (user) | `--red-tint` / `--red-ink` |
| Free plan | `--surface2` / `--muted` |

### Menu card (`MenuCard`)

Fields: image, name (Card title), category, price, location (area, city), vendor name, Premium badge if vendor is Premium, **View Details** button.

- Fixed width in grid, fixed image aspect ratio (4:3, `object-cover`), equal height across the row (flex column, button pinned to bottom).
- Image placeholder `--img` while loading.
- Location shown with map-pin icon: "Zindabazar, Sylhet".
- Vendor line: "Napoli Corner".

### Stat card

`--surface`, 1px `--line`, radius 20, padding 18. Label (14 600 `--muted`) top-left, tinted icon circle (36px) top-right, value in Caprasimo 34px.

### Toast

`--surface`, 1px `--line`, radius 18, `--shadow`, padding `14px 16px`. 30px tinted icon circle (check on sage / x on red), bold 14px title, 13px `--muted` line. Use toasts for every success and error; never `alert()`.

Examples: "Order placed — Napoli Corner will confirm it soon." / "Couldn't place order — You already ordered this for Fri, 21 Nov."

### Other reusable pieces

- `SectionHeader` (overline, H2, lead)
- `EmptyState` (icon in tinted circle, short title, one line, optional action)
- `PageLoader` and card skeletons
- `ConfirmDialog` (shadcn AlertDialog) for delete, reject, block, cancel order
- `DataTable` for dashboard lists, collapsing to cards on mobile
- `ImageUpload` (ImgBB) with preview, progress and error state
- `RoleGuard` / dashboard layout shell

---

## 8. Layout

### Navbar

- Left: mark + wordmark (same size and style on every page).
- Logged out: Home, Browse Menu, Sign In (ghost), Sign Up (primary).
- Logged in: Home, Browse Menu, Dashboard (role-specific), theme toggle, avatar dropdown.
- Avatar dropdown: name, email, role tag, Dashboard, Profile Settings, Logout.
- Updates immediately on auth change (no reload).
- Mobile: logo + menu icon → sheet with the same links.

### Footer

Char background, Flour text. Columns: logo + one-line description ("Where the local slices meet."), navigation links, contact (Sylhet address, email, phone), socials (Facebook, Instagram, X). Bottom row: © PizzaHub year.

### Dashboard shell

- Full width. Left sidebar (~260px) on `--surface` with logo, role-based links, user block at bottom (avatar, name, role, plan tag for vendors). Main area on `--bg`.
- Top bar in main area: page title (H3), theme toggle, bell, avatar.
- Tablet/mobile: sidebar becomes a sheet opened from a menu icon.
- Overview pages: stat card row (2 cols mobile, 3–4 desktop) then charts.

---

## 9. Pages

### Public

**Home**
1. **Banner** — Display headline (e.g. "Hot & Fresh Pizza Delivered to Your Door" or a local-first line), Lead, primary CTA **Explore Pizza Menu** → `/menu`. Pizza illustration/photo on the right; stacks on mobile.
2. **Featured Menu Items** — 6+ approved, active items; Premium vendors' items first. 3-col desktop, 2 tablet, 1 mobile.
3. **Pizza Categories** — 6 tiles: Classic Pizzas, Vegetarian Pizzas, Meat Lovers, Specialty / Gourmet, Sides & Appetizers, Beverages & Desserts. Each links to `/menu?category=…`.
4. **Why Choose PizzaHub?** — 3–4 benefit cards, icon in tinted circle (e.g. local shops, order for a date, clear order status, verified vendors).
5. **How PizzaHub Works** (chosen extra) — 3 steps: Find a pizzeria near you → Order for the day you want → The shop confirms.
6. Optional: Premium vendor CTA band on Tomato with reversed logo.

**Browse Menu** (`/menu`)
- Header + search pill, category select, location select, sort select (Price: low → high / high → low).
- Filters sync to URL query params.
- Equal-height card grid. Skeleton cards while loading. Empty state: "No pizzas match that search. Try another area or category."
- View Details when logged out → Sign In, then back.

**Sign In / Sign Up**
- Centered card on `--bg` with mark above.
- Sign Up: Full Name, Email, Password, Profile Image (optional, skippable), role picker as two selectable cards — **Customer** / **Vendor (Restaurant Owner)**. Vendors also give Business Name.
- Password helper shows live rules: 6+ chars, one uppercase, one lowercase.
- Google button (secondary style, Google icon).
- No admin option anywhere.
- After success: toast + redirect by role.

### Private

**Item Details** (`/menu/[id]`)
- Two columns: image gallery (main + thumbnails) left; right: category overline, name (H2), price, location, vendor card (name, area, Premium badge), description, **Order** button.
- Order button states: customer → opens order form; vendor viewing own item / any vendor / admin → disabled with reason line ("Vendors can't order", "This is your item"); item not approved/active → disabled "Not available to order".
- Invalid ID → inline not-found state with link back to menu.
- Optional: reviews section, favourite (heart) button.

**Order form** (dialog or sheet)
- Delivery Date (date picker, no past dates), Delivery Address (textarea), Message / Special Instructions (optional).
- Summary of item + vendor at top.
- Payment shown as a plain "Pay on delivery" note; no Stripe here.
- Submit → "Order placed — {Shop} will confirm it soon." Duplicate → "You already ordered this for {date}."

**Payment Success / Cancel**
- Success: check in sage circle, "You're on Premium", note that the badge appears once Stripe confirms; button to Subscription. Poll/refetch plan state, show "Confirming payment…" loader until the webhook has updated it.
- Cancel: neutral, "Payment cancelled. You're still on the Free plan." Button back to Subscription.

**Profile Settings**
- Avatar upload, name, (vendor) business name. Email, role and plan shown read-only.

### Vendor dashboard

| Page | Content |
|---|---|
| Overview | Stats: total items, active items, pending orders, accepted orders, current plan. Chart: orders over time or by status |
| My Menu Items | Table/cards: thumbnail, name, category, price, status tag, availability toggle, edit, delete. Rejected items show reason state, never public |
| Add Menu Item | Item Name, Category (select), Description, Price, Location, Images (file upload → ImgBB, required). Banner when Free plan is at 3 active items: "Free plan allows 3 active items. Upgrade to Premium for unlimited." with Upgrade button |
| Customer Orders | Customer, item, delivery date, address, message, status. Accept (sage) / Reject (secondary, confirm dialog) only on Pending rows |
| Subscription | Two plan cards side by side. Free: 3 active items, basic dashboard, order management. Premium (Crust accent, crown): unlimited items, Premium badge, featured placement. Current plan marked. **Upgrade to Premium** primary button |
| Profile Settings | As above |

### Customer dashboard

| Page | Content |
|---|---|
| Overview | Stats: total, pending, accepted, rejected orders. Chart: orders by status |
| My Orders | Item image + name, vendor, delivery date, address, status, request date. View details; Cancel only on Pending (confirm dialog). Optional status timeline in details |
| Profile Settings | As above |

### Admin dashboard

| Page | Content |
|---|---|
| Overview | Stats: users, vendors, customers, menu items, pending items, transactions. Charts: users by role, items by status |
| Manage Users | Search by name/email, role filter. Row: avatar, name, email, role, blocked tag. Block/Unblock with confirm |
| Manage Menu Items | Search + status filter, Pending first. Approve (sage) / Reject; change status; delete with confirm |
| Transactions | Vendor, plan, amount, status, date. Read-only: no edit controls at all |

### System pages

- **404**: mark at large size, "This slice went missing." + button home.
- **403 / blocked**: "Your account is blocked. Contact support." Unauthorized dashboard access redirects to the user's own dashboard.
- Global error boundary with retry.

---

## 10. States checklist

Every data view needs: **loading** (skeleton or spinner), **empty**, **error** (message + retry), **success** (toast).

Specifically cover: fetching menu items, dashboard data, form submit, placing order, Stripe redirect, image upload failure, invalid item ID, unauthorized access, missing records.

---

## 11. Motion

Framer Motion on the homepage only, subtle:
- Section headers and cards: fade + 16px rise on scroll into view, 0.4s, stagger 0.06s, `once: true`.
- Banner: headline and illustration in on load.
- Card hover: 2–4px lift + shadow.
- Respect `prefers-reduced-motion`.
- No looping or decorative animation in dashboards.

---

## 12. Responsive

| Breakpoint | Layout |
|---|---|
| < 640 | 1-col cards, nav sheet, dashboard sidebar sheet, tables → cards |
| 640–1024 | 2-col cards, sidebar sheet |
| ≥ 1024 | 3-col cards (4 on very wide browse), fixed sidebar |

Touch targets ≥ 44px.

---

## 13. Themes

Light (Flour) is default; Dark (Char) via toggle using a `.dark` class. Tomato stays `#B8321F` in both. Only token values swap; components never hard-code colours.

---

## 14. Tailwind v4 theme

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-display: "Caprasimo", serif;
  --font-sans: "Archivo", ui-sans-serif, system-ui;

  --color-tomato-100: #fbe4df;  --color-tomato-600: #b8321f;  --color-tomato-700: #962717;
  --color-crust-300: #f0c48e;   --color-basil-500: #7a8a5e;
  --color-flour-50: #fbf3e6;    --color-flour-100: #f5ead8;    --color-char-900: #1d1a17;

  --radius-field: 14px;  --radius-card: 20px;  --radius-panel: 28px;
}

/* semantic tokens (shadcn-style) */
:root {
  --background: #f5ead8;  --card: #fbf3e6;  --muted: #efe1c9;  --border: #e4d3b8;
  --foreground: #201e1d;  --muted-foreground: #5c544c;
  --primary: #b8321f;     --primary-foreground: #ffffff;
  --success: #7a8a5e;     --warning-bg: #f6e2b3;  --warning-fg: #6b4a10;
  --destructive-bg: #f7d6cf; --destructive-fg: #7e1f12;
}
.dark {
  --background: #1d1a17;  --card: #2a2420;  --muted: #352d27;  --border: #463c34;
  --foreground: #f5ead8;  --muted-foreground: #c4b8a6;
  --primary: #b8321f;     --primary-foreground: #ffffff;
  --success: #7a8a5e;     --warning-bg: #4a3a1c;  --warning-fg: #f0d08a;
  --destructive-bg: #4a2420; --destructive-fg: #f7b4a8;
}
```

Fonts: load Caprasimo and Archivo with `next/font/google`.

---

## 15. Open items

- Open Graph image (1200 × 630) is not designed yet in the brand file.
- Customer, Vendor and Admin screen files referenced by the brand nav were not included; screen layouts above are written from the assignment and should be checked against those files if they exist.
- Pick optional features (at least 2). Dark mode is already covered by the token set; order status timeline or favourites fit the current component set best.
