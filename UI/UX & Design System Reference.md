# Al Harmain Travels — Complete UI/UX & Design System Reference

> **Authoritative Specification & Architecture Manual**  
> **Status:** Active Standard & Single Source of Truth  
> **Scope:** Entire Application (Customer, Driver, Dispatcher, Admin, Public Web, Auth)  
> **Theme Policy:** Strictly Light Theme Only (`html.light`, `color-scheme: light`)  
> **Primary Tech Stack:** Next.js 15.1.7 (App Router), React 19, TypeScript 5.7.3, Tailwind CSS 3.4.17, Supabase (Auth, DB, Realtime, Storage), Leaflet 1.9.4 & Google Maps Hybrid Engine, Sonner 2.0.1, Lucide React 1.16.0, Capacitor 8.5.2 (Android).

---

## 1. Visual Identity & Brand Philosophy

Al Harmain Travels fuses **Islamic heritage luxury hospitality** with **mission-critical operational fleet precision**. The visual tone reflects the sacred sanctuary cities of Makkah al-Mukarramah, Madinah al-Munawwarah, and the commercial gateway of Jeddah.

### 1.1 Core Aesthetic Pillars
1. **Sacred Saudi Sovereignty:** Deep Islamic heritage conveyed through rich Saudi flag emerald greens (`#059669`, `#0b4736`), pilgrimage desert golds (`#b45309`, `#c8a332`, `#dfc15a`), pristine marble whites, and architectural Kaaba motifs.
2. **Light-Theme-Only Mandate:** The application is architecturally locked to a **pure luxury light theme**. All CSS variables (`--bg-page`, `--bg-card`, `--bg-elevated`, `--text-primary`, `--border-base`) under `:root`, `html`, `html.light`, and legacy `html.dark` evaluate to consistent light-mode tokens. The `ThemeToggle` component is decommissioned (`return null;`), and `ThemeContext.tsx` enforces `isDark: false` and strips any `dark` class from the DOM root.
3. **Dual Typographic Sophistication:**
   - **Marketing & Brand Display:** *Cormorant Garamond* (Google Font serif) provides monumental elegance on marketing headers, section titles, and hero callouts.
   - **Operational UI & Tabular Data:** *Plus Jakarta Sans* (Google Font sans-serif) delivers ultra-legible clarity on dense dispatch tables, GPS stats, inputs, and cockpit actions.
   - **Arabic & RTL Localization:** *Cairo* with seamless right-to-left directional mirroring (`[dir="rtl"]`) applied natively through `LanguageContext.tsx`.
4. **Physical Tactility & Luxury Polish:** Smooth glassmorphism (`backdrop-blur-xl`, `bg-card/95`), layered micro-shadows (`--shadow-card`, `--shadow-gold`), subtle gold shimmers, and buttery bezier curves (`--ease-luxury: cubic-bezier(0.22, 1, 0.36, 1)`).

---

## 2. Design Tokens & CSS Variables

All CSS variables are declared in `src/app/globals.css` and bound to Tailwind utility classes in `tailwind.config.ts`.

### 2.1 Color Tokens

#### Surface & Background Tokens
| Token | Variable | Hex / Value | Usage |
| :--- | :--- | :--- | :--- |
| **Page Background** | `--bg-page` / `bg-page` | `#f8fafc` (Slate 50) | Top-level portal and page canvas background |
| **Card Surface** | `--bg-card` / `bg-card` | `#ffffff` (Pure White) | Standard card panels, modals, dropdowns, table bodies |
| **Elevated Layer** | `--bg-elevated` / `bg-elevated` | `#f1f5f9` (Slate 100) | Secondary panels, skeleton bars, inactive pills |
| **Surface Input** | `--bg-surface` / `bg-surface` | `#f8fafc` (Slate 50) | Table header tracks, disabled inputs, badge containers |
| **Input Background** | `--bg-input` / `bg-input` | `#ffffff` | Text fields, select dropdowns, search bars |

#### Text & Contrast Tokens
| Token | Variable | Hex / Value | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `--text-primary` / `text-primary` | `#0f172a` (Slate 900) | Main headings, table titles, primary numbers |
| **Secondary Text** | `--text-secondary` / `text-secondary` | `#334155` (Slate 700) | Body copy, labels, field titles, descriptions |
| **Muted Text** | `--text-muted` / `text-muted` | `#64748b` (Slate 500) | Timestamps, helper text, table column headers, chips |

#### Border & Divider Tokens
| Token | Variable | Hex / Value | Usage |
| :--- | :--- | :--- | :--- |
| **Border Base** | `--border-base` / `border-base` | `#e2e8f0` (Slate 200) | Card perimeters, input borders, table row dividers |
| **Border Strong** | `--border-strong` / `border-strong` | `#cbd5e1` (Slate 300) | Active inputs, hover borders, button outlines |
| **Border Subtle** | `--border-subtle` / `border-subtle` | `#f1f5f9` (Slate 100) | Sub-dividers, inner section splits |

#### Brand Accent Palettes
| Token Category | Tailwind Key | Hex Range | Semantic Intent |
| :--- | :--- | :--- | :--- |
| **Emerald Brand** | `brand-50` to `brand-950` | `#ecfdf5` ➔ `#022c22` | Primary operations, confirmed bookings, completed trips, online status |
| **Saudi Flag Green** | `--green-primary`, `--green-accent` | `#059669`, `#047857`, `#0b4736` | Signature buttons (`.btn-brand`), active highlights, success chips |
| **Pilgrimage Gold** | `gold-50` to `gold-900` | `#fffbeb` ➔ `#78350f` | VIP badges, primary luxury CTAs (`.btn-primary`), rating stars |
| **Deep Saudi Gold** | `--gold-primary`, `--gold-light` | `#b45309`, `#d97706` | Luxury underlines, active journey dots, golden glow aura |
| **Navy Contrast** | `--navy`, `--navy-mid` | `#0f172a`, `#1e293b` | Monumental titles, high-contrast dark badges in print & vouchers |

### 2.2 Elevation & Shadow Scale
- **`--shadow-xs`**: `0 1px 2px 0 rgba(15, 23, 42, 0.05)` — Compact controls, table action buttons.
- **`--shadow-sm`**: `0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)` — Standard stat cards.
- **`--shadow-soft`**: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.07)` — Hover states.
- **`--shadow-card`**: `0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.06)` — Floating panels, modals.
- **`--shadow-card-hover`**: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.08)` — Interactive cards.
- **`--shadow-gold`**: `0 12px 36px rgba(180, 83, 9, 0.2)` — Primary luxury action buttons and VIP banners.

### 2.3 Motion, Transitions & Easing Curves
- **`--ease-luxury`**: `cubic-bezier(0.22, 1, 0.36, 1)` — Premium organic deceleration (350ms to 500ms).
- **`--ease-spring`**: `cubic-bezier(0.34, 1.56, 0.64, 1)` — Checkmarks, rating star clicks, modal bounce.
- **`--ease-silk`**: `cubic-bezier(0.4, 0, 0.2, 1)` — Standard drawer transitions and sidebar collapses.
- **Keyframe Utilities:** `.animate-fade-up`, `.animate-fade-in`, `.animate-glow-pulse`, `.animate-float-slow`, `.animate-shimmer-sweep`.
- **Accessibility Rule:** All motion is neutralized to `0.01ms` when `@media (prefers-reduced-motion: reduce)` is detected.

---

## 3. Typography Hierarchy & Rules

The typography is loaded via Google Fonts in `src/app/globals.css`:
- `Cormorant Garamond`: `font-weight: 500, 600, 700; font-style: normal, italic;`
- `Plus Jakarta Sans`: `font-weight: 400, 500, 600, 700, 800;`
- `Cairo`: `font-weight: 400, 500, 600, 700, 800;` (Arabic RTL)

### 3.1 Typographic Scale
| Class / Utility | Font Family | Size Range / Clamp | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`.type-hero`** | Display (Cormorant) | `clamp(2.5rem, 1.5rem + 4vw, 4.5rem)` | `1.0` | `-0.038em` | Public homepage hero headline |
| **`.type-display`** | Display (Cormorant) | `clamp(2.25rem, 1.4rem + 3.5vw, 3.75rem)` | `1.05` | `-0.032em` | Marketing major section titles |
| **`.type-page-hero`**| Display (Cormorant) | `clamp(2rem, 1.4rem + 2.5vw, 3.25rem)` | `1.08` | `-0.03em` | Services & About page titles |
| **`.type-page-title`**| Display (Cormorant) | `clamp(1.5rem, 1.2rem + 1.2vw, 2rem)` | `1.15` | `-0.025em` | Auth & portal page headers |
| **`.type-section-title`**| Display (Cormorant) | `clamp(1.625rem, 1.25rem + 1.5vw, 2.5rem)` | `1.12` | `-0.028em` | Landing page sub-sections |
| **`.type-card-title`**| Sans (Jakarta) | `1.0625rem` (17px) | `1.35` | `-0.015em` | Dashboard widget & modal titles |
| **`.type-panel-title`**| Sans (Jakarta) | `1.0rem` (16px) | `1.35` | `-0.01em` | Table headers & nested panels |
| **`.type-lead`** | Sans (Jakarta) | `clamp(0.9375rem, 0.9rem + 0.35vw, 1.125rem)`| `1.7` | `0.005em` | Page introductory paragraphs |
| **`.type-body`** | Sans (Jakarta) | `0.9375rem` (15px) | `1.65` | `0.01em` | Standard text & descriptions |
| **`.type-body-sm`** | Sans (Jakarta) | `0.8125rem` (13px) | `1.55` | `0.01em` | Secondary table cells, notes |
| **`.type-eyebrow`** | Sans (Jakarta) | `0.75rem` (12px) Uppercase | `1.3` | `0.1em` | Super-headers, operational tags |
| **`.type-label`** | Sans (Jakarta) | `0.75rem` (12px) Semibold | `1.4` | `0.02em` | Form `<label>` elements |
| **`.type-caption`** | Sans (Jakarta) | `0.6875rem` (11px) | `1.45` | `0.02em` | Timestamps, metadata, micro-chips |
| **`.type-fare`** | Sans (Jakarta) | `clamp(1.5rem, 1.3rem + 0.8vw, 1.875rem)` | `1.1` | `tabular-nums` | Prominent SAR prices |
| **`.type-stat`** | Sans (Jakarta) | `clamp(1.375rem, 1.15rem + 0.9vw, 1.875rem)` | `1.1` | `tabular-nums` | Dashboard KPI numbers |
| **`.type-mono`** | Monospace | `0.875rem` (14px) Semibold | `1.3` | `tabular-nums` | Booking refs (`AHT-2026...`), plates |
| **`.type-table-head`**| Sans (Jakarta) | `0.625rem` (10px) Uppercase | `1.3` | `0.08em` | `<th>` column headers |

---

## 4. Semantic Design System & State Rules

The application uses an authoritative semantic tone system (`ActivityTone`) defined in `src/components/admin/AdminUIComponents.tsx`. Every status badge, notification, and alert must use these six canonical tones:

```
ActivityTone: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral'
```

### 4.1 Activity Tone Color Rules
| Tone | Container Classes | Dot / Accent Class | Meaning / Associated States |
| :--- | :--- | :--- | :--- |
| **Green** | `bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80` | `bg-emerald-600` (pulsing) | Active, Verified, Confirmed, Completed, Available, Accepted, Success, Published |
| **Red** | `bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80` | `bg-rose-600` | Delete, Failed, Rejected, Cancelled, Inactive, Suspended, Deactivated, Error |
| **Amber** | `bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80` | `bg-amber-600` (pulsing) | Pending, Waiting, Warning, Requires Attention, Unassigned, Scheduled, Maintenance |
| **Blue** | `bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/80` | `bg-sky-600` | Informational, View, Navigation, Assigned, Dispatcher, Staff, Open |
| **Purple** | `bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/80` | `bg-purple-600` | Special/Admin actions, VIP GMC, Trip Started, Ride Started, Driver Arriving, In Progress |
| **Neutral**| `bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80` | `bg-slate-500` | Secondary metadata, offline, cancelled drafts, archived |

### 4.2 Entity Status Mapping Matrix

#### A. Booking Lifecycle Statuses (`BookingStatus` in `src/types/index.ts`)
| Status Key | Display Label | Tone | Context & Screen Treatment |
| :--- | :--- | :--- | :--- |
| `pending` | Pending Intake | `amber` | Booking submitted, awaiting dispatcher action |
| `pending_review` | Custom Review | `amber` | Custom route submitted; dispatcher must set custom fare |
| `pending_verification` | Payment Review | `amber` | Bank slip uploaded; dispatcher must verify screenshot |
| `payment_rejected` | Payment Rejected | `red` | Payment proof rejected; customer prompted to re-upload |
| `payment_verified` | Payment Verified | `green` | Payment proof confirmed |
| `confirmed` | Confirmed | `green` | Ready for automated or manual driver assignment |
| `searching` | Finding Captain | `purple` | Radar matching modal actively searching for nearest driver |
| `driver_assigned` | Chauffeur Assigned| `blue` | Driver assigned; awaiting chauffeur acceptance |
| `driver_accepted` / `accepted`| Mission Accepted | `green` | Driver accepted trip in Cockpit |
| `driver_arriving` / `on_the_way`| Captain Arriving | `purple` | Chauffeur is en route to pickup point |
| `driver_arrived` / `arrived` | Captain Arrived | `purple` | Chauffeur has reached pickup landmark/terminal |
| `trip_started` / `ride_started` | Journey Started | `purple` | Pilgrim boarded; GPS route active |
| `trip_completed` / `completed` | Trip Completed | `green` | Journey concluded at sanctuary destination |
| `payment_pending` | Cash Collection Due| `amber` | Trip ended; cash payment pending driver confirmation |
| `payment_completed` | Fully Settled | `green` | Cash received or online transaction cleared |
| `cancelled` | Cancelled | `red` | Cancelled by customer, dispatcher, or admin |
| `rejected` | Rejected | `red` | Rejected due to capacity or operational constraint |
| `no_show` | Pilgrim No-Show | `red` | Pilgrim did not arrive at pickup after grace period |

#### B. Chauffeur Statuses (`DriverStatus`)
| Status Key | Tone | Dot Behavior | Cockpit Status / Radar Treatment |
| :--- | :--- | :--- | :--- |
| `available` | `green` | Pulsing green dot | Online & ready for new mission dispatch |
| `assigned` | `amber` | Solid amber dot | Assigned to a mission; awaiting driver tap |
| `on_trip` | `purple` | Solid purple dot | Actively transporting pilgrims on the road |
| `busy` | `amber` | Solid amber dot | Engaged in temporary duty or refueling |
| `on_break` | `neutral`| Solid gray dot | Chauffeur resting between prayer or shift hours |
| `offline` | `red` | Solid rose dot | Signed off; GPS telemetry disabled |

#### C. User & Profile Statuses (`UserStatus`)
| Status Key | Tone | Treatment & Guard Effect |
| :--- | :--- | :--- |
| `active` | `green` | Fully verified, unrestricted platform access |
| `suspended` | `red` | Temporary ban (e.g. policy review); blocked by `RouteGuard` |
| `deactivated` | `red` | Permanent closure; credentials revoked |

#### D. Financial & Payment Statuses (`PaymentStatus`)
| Status Key | Tone | Icon / Treatment |
| :--- | :--- | :--- |
| `pending` | `amber` | Clock icon, awaiting verification or collection |
| `paid` / `confirmed` | `green` | ShieldCheck icon, funds verified in ledger |
| `failed` | `red` | AlertCircle icon, transaction declined |
| `refunded` | `neutral` | RotateCcw icon, returned to customer |

---

## 5. UI Component Architecture & Standards

### 5.1 Reusable UI Primitives

```
src/
├── components/
│   ├── admin/
│   │   ├── AdminDashboardShell.tsx      # Desktop hover sidebar + mobile drawer layout
│   │   ├── AdminMobileSidebar.tsx       # Slide-over navigation drawer for small screens
│   │   └── AdminUIComponents.tsx        # StatusBadge, ActionButton, PageHeader, StatCard, TableCard
│   ├── auth/
│   │   ├── AuthShell.tsx                # Card shell with animated shimmer & trust badges
│   │   ├── AuthRecoveryListener.tsx     # Supabase recovery session watcher
│   │   └── RouteGuard.tsx               # Client-side RBAC guard with active status & verification check
│   ├── cinematic/
│   │   ├── CinematicDestinations.tsx    # Endless marquee of Holy Sanctuaries
│   │   ├── CinematicTexture.tsx         # Architectural light texture overlays
│   │   └── cinematic-texture-config.ts  # City coordinate data & styling
│   ├── customer/
│   │   ├── CustomerDashboardShell.tsx   # Customer portal shell
│   │   ├── CustomerMobileSidebar.tsx    # Customer mobile nav drawer
│   │   ├── CustomRouteBookingPanel.tsx  # GPS map-based pickup/destination route planner
│   │   ├── DriverMatchingModal.tsx      # Live animated chauffeur radar & matching modal
│   │   └── FixedFareBookingPanel.tsx    # Pilgrim fixed-fare terminal & intercity booking engine
│   ├── dispatcher/
│   │   ├── DispatcherDashboardShell.tsx # Dispatcher portal shell
│   │   ├── DispatcherMobileSidebar.tsx  # Dispatcher mobile nav drawer
│   │   └── FleetRadar.tsx               # Real-time multi-vehicle GPS radar tracking engine
│   ├── driver/
│   │   ├── DriverDashboardShell.tsx     # Driver portal shell
│   │   └── DriverMobileSidebar.tsx      # Driver mobile nav drawer
│   ├── layout/
│   │   ├── Navbar.tsx                   # Main navigation with smart scroll hide/reveal & notification drawer
│   │   ├── Footer.tsx                   # Public luxury footer (automatically hidden on all portals & auth)
│   │   ├── PageShell.tsx                # Fluid container wrapper (`.page-shell`)
│   │   ├── ScrollProgressBar.tsx        # Top reading scroll progress indicator
│   │   └── UserProfileDropdown.tsx      # Clamped, viewport-safe user session & role menu
│   ├── map/
│   │   ├── BookingMap.tsx               # Interactive Leaflet / Google Maps hybrid component
│   │   ├── LiveMap.tsx                  # Dedicated tracking map with animated car markers
│   │   └── MapControls.tsx              # Zoom (+/-), GPS recenter, and Standard/Satellite toggle
│   └── ui/
│       ├── BrandLogo.tsx                # Official Al Harmain emblem and luxury typography
│       ├── DataStateSkeletons.tsx       # StatCardSkeleton, TableSkeletonRows, CardGridSkeleton, EmptyStateView
│       └── ThemeToggle.tsx              # Decommissioned (returns null; enforces light theme)
```

### 5.2 Button Standard Styles
1. **Primary Luxury Button (`.btn-primary` / `.btn-luxury-primary`):**
   - **Background:** `linear-gradient(135deg, #c8a332 0%, #dfc15a 40%, #c8a332 100%)`
   - **Text:** `#06101e` (Onyx Navy), `font-weight: 700`, `letter-spacing: 0.025em`
   - **Shadow:** `0 4px 20px rgba(184, 146, 42, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.3)`
   - **Hover:** `translateY(-2px)`, shadow increases to `0 8px 30px rgba(184, 146, 42, 0.38)`.
   - **Usage:** Main booking actions, checkout confirmation, primary CTAs.
2. **Secondary Outline Button (`.btn-secondary` / `.btn-luxury-secondary`):**
   - **Background:** `#ffffff`, border: `1.5px solid var(--border-strong) (#cbd5e1)`.
   - **Text:** `var(--navy) (#0f172a)`, `font-weight: 600`.
   - **Hover:** `border-color: var(--gold-primary)`, text: `var(--gold-primary)`, shadow ring.
   - **Usage:** Cancel, back, export CSV, secondary filters.
3. **Emerald Brand Button (`.btn-brand` / `.btn-luxury-emerald`):**
   - **Background:** `linear-gradient(135deg, #0b4736 0%, #0e5a44 50%, #0b4736 100%)`
   - **Text:** `#ffffff`, `font-weight: 700`.
   - **Usage:** Approve booking, driver start trip, accept mission, mark arrived.
4. **Table Action Button (`AdminActionButton`):**
   - Size: `min-w-[30px] min-h-[30px] px-2 py-1 rounded-lg border text-xs`.
   - Variants:
     - `view`: Sky palette (`text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100`).
     - `edit`: Amber palette (`text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100`).
     - `delete`: Rose palette (`text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100`).
     - `more`: Purple palette (`text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100`).
     - `primary`: Emerald palette (`text-white bg-emerald-600 hover:bg-emerald-500`).

### 5.3 Form Controls & Validation
- **Containers (`.journey-field`):** `rounded-2xl p-3.5 bg-input border-1.5 border-base`. On focus: `border-color: var(--gold-primary); box-shadow: 0 0 0 4px var(--gold-muted);`.
- **Inputs (`.field-input`):** `w-full rounded-2xl text-sm px-4 py-3.5 bg-input border-1.5 border-base text-primary`.
- **Labels (`.type-label`):** `text-xs font-semibold text-secondary block mb-1`. Required fields feature a subtle red asterisk `<span className="text-rose-500">*</span>`.
- **Error States:** Field border switches to `border-rose-400 bg-rose-50/20`, helper error message rendered below in `text-rose-600 text-xs font-medium flex items-center gap-1`.
- **Helper / Character Count:** Right-aligned `text-muted text-[11px]`.
- **Mobile Touch Preservation:** Inputs use `font-size: 16px` on screens `< 640px` to prevent iOS auto-zoom jitter.

### 5.4 Card & Table Architecture
- **Standard Card (`.surface-card`):** `bg-card border border-base rounded-2xl p-5 shadow-sm transition-all duration-300`.
- **Interactive Luxury Card (`.luxury-card`):** `rounded-3xl hover:border-gold-primary/30 hover:shadow-card-hover hover:-translate-y-1`.
- **Table Card Container (`AdminTableCard`):** Includes standardized header bar with title, counter badge (`${count} records`), and search/action slot.
- **Table Structure:**
  - `table`: `w-full text-left font-variant-numeric: tabular-nums border-collapse`.
  - `thead`: `bg-surface/50 border-b border-base`.
  - `th`: `px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted select-none`.
  - `tbody tr`: `border-b border-base/70 hover:bg-surface/60 transition-colors duration-150`.
  - `td`: `px-4 py-3.5 text-xs text-primary align-middle`.

### 5.5 Feedback, Loading & Empty States
- **Toasts (`sonner`):** All asynchronous operations invoke `toast.success()`, `toast.error()`, `toast.info()`, or `toast.warning()`.
- **Skeletons (`DataStateSkeletons.tsx`):**
  - `StatCardSkeleton`: Pulsing 3-tier indicator card.
  - `TableSkeletonRows`: Parametric pulsing rows with randomized widths for natural content feel.
  - `CardGridSkeleton`: Responsive 1/2/3-column pulsing card grid.
- **Empty States (`EmptyStateView`):** Large icon inside an elevated container, bold title, descriptive copy, and optional action button or link.

---

## 6. Functional Interaction Patterns

### 6.1 CRUD & Record Management
- Standardized modal workflows: Add (Green/Gold), Edit (Amber), Delete Confirmation (Rose with explicit warning).
- Destructive actions require secondary confirmation modal with danger details and disable state during execution.
- Optimistic UI updates paired with persistent Supabase RPC/REST synchronization and automatic fallback to `src/lib/mock-data.ts` if unmigrated.

### 6.2 Authentication, Guards & Profile Flows
- Managed through `src/components/auth/RouteGuard.tsx`:
  1. Checks `isAuthLoading` from Supabase session.
  2. If unauthenticated, redirects to `/sign-in?redirect=...`.
  3. Enforces account status (`suspended` / `deactivated` accounts denied).
  4. Enforces verified email (`/verify-email` redirection).
  5. Enforces database role permissions (`allowedRoles`).
- Persistent user menu in `UserProfileDropdown.tsx` uses viewport-aware positioning (`getBoundingClientRect`) to prevent off-screen overflow.

### 6.3 Booking Workflows (Fixed-Fare vs Custom Route)
- **Fixed-Fare Route (`FixedFareBookingPanel.tsx`):**
  - Step 1: Select curated Holy Route (e.g., Jeddah Airport ➔ Makkah, Makkah ➔ Madinah, Taif Ziyarat).
  - Step 2: Select Terminal (Terminal 1, Terminal H Hajj/Umrah, Terminal N).
  - Step 3: Select Vehicle Class (`sedan`, `staria`, `gmc`, `hiroof`) with live fixed SAR price from database.
  - Step 4: Passenger details, date & time, return trip toggle, payment receipt upload.
- **Custom Route (`CustomRouteBookingPanel.tsx`):**
  - Interactive map with GPS location search, draggable pickup/destination pins, intermediate stops (`IntermediateStop[]`).
  - Automatic distance (`km`) and duration (`min`) calculation via Google Directions / OSRM.
  - Dynamic fare formula: $\max(\text{Base} + (\text{Km} \times \text{Rate}) + (\text{Min} \times \text{Rate}), \text{MinFare})$.
  - Submits as `pending_review` for dispatcher custom rate approval.
- **Matching & Dispatch Radar (`DriverMatchingModal.tsx`):**
  - Displays circular radar wave animation with vehicle count.
  - Transitions through phases: `searching` ➔ `awaiting_driver` ➔ `assigned` (or `no_driver` timeout fallback).

### 6.4 Chauffeur Cockpit Mission Workflow
- Chauffeur status toggled via header pill (`available` ➔ `offline`).
- Active mission enforces strict sequence:
  `driver_assigned` ➔ `driver_accepted` ➔ `driver_arriving` ➔ `driver_arrived` ➔ `trip_started` ➔ `trip_completed` ➔ `payment_completed`.
- During active trip, driver can open "Add Charge" dialog to append verified waiting time, tolls, or parking fees.
- Cash trips require driver confirmation of physical banknote collection before closing mission.

### 6.5 Search, Filters, Sorting & Large Data Registries
- Search inputs use debounced text matching across reference, passenger name, phone, plate, and route.
- Filters feature "All" reset pills and active filter count badges.
- Tabular views support column sorting (Newest, Oldest, Amount High/Low, Alphabetical).
- Pagination provides page size selector (10, 25, 50, 100) and page jump navigation.

### 6.6 Maps & Geolocation Standard
- Hybrid Architecture: Google Maps JavaScript API with customized dark luxury vector styles, with automatic dynamic fallback to OpenStreetMap Leaflet.
- Floating controls (`MapControls.tsx`): `+` Zoom In, `-` Zoom Out, GPS crosshair (re-center), Layer toggle (Standard / Satellite).
- Markers: Custom SVG vehicle icons with heading rotation (`interpolateHeading`) and color-coded status halos.

### 6.7 Voucher & Printable Invoices
- Luxury Voucher Print Modal (`voucher-print-modal`):
  - Automatically isolates printable voucher and hides navigation, sidebars, and footers (`@media print`).
  - Features QR Code reference, passenger itinerary, chauffeur details, price breakdown, and Saudi official stamp.
- PDF Invoices generated client-side via `src/lib/pdf-invoice.ts` with tax calculation and itemized breakdown.

---

## 7. Responsive Breakpoint & Viewport Rules

The platform follows a responsive layout grid optimized for desktop dispatch screens, tablets, and driver mobile phones:

| Breakpoint | Width | Shell Padding | Navigation Behavior | Table / Card Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile (`xs`/`sm`)** | `< 640px` | `px-3 py-4` | Navbar visible, portals use slide-over drawer | Tables collapse to card view or scroll horizontally |
| **Tablet (`md`)** | `640px - 1023px`| `px-4 py-5` | Navbar visible, bottom bar or compact icons | 2-column KPI grids, condensed table columns |
| **Desktop (`lg`/`xl`)**| `1024px - 1535px`| `px-6 py-6` | Hover-expandable sidebar (`w-16` ➔ `w-64`) | Full tabular data registries, split map/list views |
| **Ultra-wide (`2xl`)** | `≥ 1536px` | `max-w-7xl` or `2xl` | Sidebar locked to comfortable fixed width | Side-by-side cockpit panels, multi-card dashboards |

---

## 8. Module-by-Module Design Inventory

Every existing module and route discovered in the codebase is indexed below:

### 8.1 Admin Portal (`/admin/*`)
*Guarded by `RouteGuard` (`allowedRoles: ['admin']`). Shell: `AdminDashboardShell.tsx`.*

#### 1. Executive Cockpit (`/admin`)
- **Route:** `/admin/page.tsx`
- **Actions:** View real-time revenue, active bookings, completed trips, fleet availability; quick links to rates, users, and reports.
- **Components:** `AdminPageHeader`, 4 KPI stat cards with trend badges, recent bookings table with search, status filters, and booking detail drawer.
- **States:** `TableSkeletonRows` during data load; empty state if no bookings match filter.

#### 2. Users & Access Management (`/admin/users`)
- **Route:** `/admin/users/page.tsx` (99 KB)
- **Actions:** Onboard staff, drivers, customers; assign vehicles; toggle active/suspended/deactivated status; reset passwords.
- **Tabs:** All, Customers, Dispatchers, Drivers, Administrators.
- **Modals:** Add User Modal (role-sensitive fields), Edit User Modal, Vehicle Assignment Modal, User Details Modal, Delete Confirmation Dialog, Newly Created Credentials Display Card.
- **Filters:** Role tab, status filter, email verification filter, vehicle assignment filter, search input.

#### 3. Rates & Tariff Master (`/admin/rates`)
- **Route:** `/admin/rates/page.tsx` (132 KB)
- **Actions:** Configure fixed-fare prices between holy cities and airports; manage vehicle classes; configure dynamic routes and terminals.
- **Tabs:** 
  1. `rates`: Live rate matrix and table with inline price updates, conflict detection (`checkRateConflict`).
  2. `vehicles`: Vehicle categories, seating & luggage capacities, descriptions.
  3. `routes_terminals`: Dynamic route origins/destinations and airport terminal codes.
  4. `services`: Dynamic service types.
- **Modals:** Add/Edit Rate Modal, Add/Edit Vehicle Class Modal, Add/Edit Route Modal, Add/Edit Terminal Modal.

#### 4. Financial Reports & Ledger (`/admin/reports`)
- **Route:** `/admin/reports/page.tsx`
- **Actions:** Review gross revenue, driver cash collections, online payments, VAT tax breakdown; export CSV spreadsheet (`handleExportCSV`); direct print.
- **Tabs:** Revenue Reconciliation & System Audit Log.
- **Components:** Financial KPI cards, itemized transaction table, export toolbar.

#### 5. Reviews & Quality Assurance (`/admin/reviews`)
- **Route:** `/admin/reviews/page.tsx`
- **Actions:** Monitor customer ratings and chauffeur feedback; filter complaints; view resolved customer and driver details.
- **Views:** Toggle between Grid Card View and Tabular View.
- **Filters:** Star rating filter (5★, 4★, 3★, 1-2★), Category filter (Rating, Complaint, Suggestion), Sort order.

#### 6. Services CMS (`/admin/services`)
- **Route:** `/admin/services/page.tsx`
- **Actions:** Manage public marketing packages (Umrah transfers, Ziyarat tours, VIP airport pickup); toggle published/draft state.
- **Modals:** Add/Edit Service Item Modal (title, slug, base price, vehicle class, image URL, bulleted feature list).
- **Components:** Responsive service card grid with published badges and live price tags.

#### 7. Audit Logs & Security Trail (`/admin/audit-logs`)
- **Route:** `/admin/audit-logs/page.tsx`
- **Actions:** Inspect security events, staff logins, rate changes, booking status transitions, IP addresses, and timestamps.
- **Components:** Search filter, entity filter (Users, Drivers, Bookings), audit event timeline table.

#### 8. System Settings (`/admin/settings`)
- **Route:** `/admin/settings/page.tsx`
- **Actions:** Configure company identity, support phone/WhatsApp, emergency contacts, default currency (`SAR`), and VAT percentage (`15%`).
- **Components:** Company configuration form, fallback distance-rate matrix editor.

---

### 8.2 Dispatcher Operations (`/dispatcher/*`)
*Guarded by `RouteGuard` (`allowedRoles: ['dispatcher', 'admin']`). Shell: `DispatcherDashboardShell.tsx`.*

#### 1. Fleet Radar (`/dispatcher`)
- **Route:** `/dispatcher/page.tsx` & `src/components/dispatcher/FleetRadar.tsx` (57 KB)
- **Actions:** Real-time multi-vehicle GPS radar tracking; live vehicle markers with heading rotation; select driver to inspect route and telemetry age.
- **Components:** Full-screen vector map, floating driver filter bar, driver quick-inspect drawer, direct booking assignment shortcut.

#### 2. Ride Queue & Verification (`/dispatcher/queue`)
- **Route:** `/dispatcher/queue/page.tsx` (89 KB)
- **Actions:** Process incoming bookings; review payment screenshot proofs; approve or reject with reason; assign chauffeurs; approve custom route fares.
- **Filters:** `all`, `pending_review`, `pending_verification`, `confirmed`, `assigned`, `active`, `completed`.
- **Modals:**
  - Payment Proof Inspection Modal (full-resolution image viewer, verify or reject with reason).
  - Custom Route Fare Pricing Modal (set custom SAR price and notify customer).
  - Driver Assignment Modal (lists available chauffeurs, shows vehicle type, rating, and schedule overlap collision check).

#### 3. Manual Intake / New Booking (`/dispatcher/new-booking`)
- **Route:** `/dispatcher/new-booking/page.tsx` (75 KB)
- **Actions:** Telephone booking creation; search existing pilgrim or register new pilgrim inline; select Fixed-Fare or Custom GPS route; immediate or scheduled; direct chauffeur dispatch.
- **Components:** 2-column intake form, customer search autocomplete, live fare calculation summary card, receipt upload dropzone.

#### 4. Chauffeur Roster (`/dispatcher/drivers`)
- **Route:** `/dispatcher/drivers/page.tsx` (122 KB)
- **Actions:** Fleet captain directory; monitor online/offline/on-trip status; inspect license details; assign vehicles; trigger direct phone or WhatsApp concierge calls.
- **Views:** Grid View and Table View toggle.
- **Modals:** Onboard Chauffeur Modal, Assign Vehicle Modal, Change Chauffeur Status Modal, Driver Details Drawer.

#### 5. Pilgrim Directory (`/dispatcher/customers`)
- **Route:** `/dispatcher/customers/page.tsx` (105 KB)
- **Actions:** Passenger registry; view booking histories, lifetime spending, emergency contacts, and journey notes.
- **Modals:** Onboard Pilgrim Modal, Edit Contact Info Modal, Customer History Drawer, Direct Booking Trigger.

---

### 8.3 Driver Cockpit (`/driver/*`)
*Guarded by `RouteGuard` (`allowedRoles: ['driver', 'admin']`). Shell: `DriverDashboardShell.tsx`.*

#### 1. Mission Cockpit (`/driver`)
- **Route:** `/driver/page.tsx` (87 KB)
- **Actions:** Toggle shift status (Online / Offline); view active mission with progressive buttons:
  `Accept Mission` ➔ `Mark Arriving` ➔ `Mark Arrived` ➔ `Start Journey` ➔ `Add Additional Charge` ➔ `Complete Trip` ➔ `Confirm Cash Collection`.
- **Tabs:** Today's Missions, Tomorrow, Upcoming Scheduled, Completed History.
- **Modals:**
  - Decline Mission Modal (with mandatory reason).
  - Additional Charge Modal (Toll, Parking, Waiting Time, Extra Luggage with amount).
  - Cash Collection Modal (confirms physical receipt of cash banknotes).

#### 2. Earnings & Settlements (`/driver/earnings`)
- **Route:** `/driver/earnings/page.tsx` (48 KB)
- **Actions:** Review gross trip earnings, company commission deductions, net driver pay, and cash collected due to company; view settlement history; request settlement payout.
- **Filters:** Date presets (Today, Week, Month, Custom Range), payment type filter.
- **Modals:** Settle Balance Modal (Bank Transfer or Cash Settlement with transaction reference).

#### 3. Chauffeur Profile (`/driver/profile`)
- **Route:** `/driver/profile/page.tsx` (85 KB)
- **Actions:** Update personal details; view MOT chauffeur credentials and assigned vehicle specs; inspect rating breakdown and passenger reviews; update security credentials.
- **Tabs:** Personal Information, Assigned Vehicle, Security Credentials, Performance & Ratings.

---

### 8.4 Customer Portal (`/customer/*`)
*Guarded by `RouteGuard` (`allowedRoles: ['customer', 'admin']`). Shell: `CustomerDashboardShell.tsx`.*

#### 1. VIP Booking Hub (`/customer`)
- **Route:** `/customer/page.tsx` (76 KB)
- **Actions:** Reserve VIP fleet vehicles across Saudi Arabia.
- **Tabs:**
  1. `Fixed Fare Routes`: Dropdown route selection (Jeddah ➔ Makkah, Makkah ➔ Madinah, Ziyarat), terminal picker, vehicle selector, date/time, and payment upload.
  2. `Custom GPS Route`: Interactive Google Maps / Leaflet pin placement, address autocomplete, waypoint stops, distance/duration calculation, and vehicle class selector.
- **Components:** `FixedFareBookingPanel.tsx`, `CustomRouteBookingPanel.tsx`, `DriverMatchingModal.tsx`.

#### 2. My Trips & History (`/customer/bookings`)
- **Route:** `/customer/bookings/page.tsx` (68 KB)
- **Actions:** Review active and historical bookings; track live chauffeur; download printable luxury vouchers; download PDF invoices; cancel booking; upload payment proofs; submit chauffeur reviews.
- **Filters:** All, Upcoming/Active, Completed, Cancelled.
- **Modals:**
  - Printable Luxury Voucher Modal (`voucher-print-modal`).
  - Cancel Booking Modal (with cancellation reason).
  - Payment Proof Upload Modal.
  - Review & Rating Modal (1-5 star selector, comment, instant feedback submission).

#### 3. Live Radar Tracking (`/customer/track`)
- **Route:** `/customer/track/page.tsx` (99 KB)
- **Actions:** Real-time GPS vehicle tracking; live driver ETA countdown; driver profile card with direct phone call; vehicle specs (make, model, color, plate); active trip step tracker; emergency SOS hotline.
- **Realtime Integration:** Subscribes to Supabase Realtime channel on `driver_locations` table for sub-second coordinate streaming.

#### 4. VIP Profile & Saved Places (`/customer/profile`)
- **Route:** `/customer/profile/page.tsx` (61 KB)
- **Actions:** Manage pilgrim profile; upload avatar; configure language (English / Arabic); manage saved places (Home, Hotel, Holy Mosque, Airport); manage emergency contacts.
- **Tabs:** Profile Information, Emergency Contacts, Security Settings, Account Status & Badges.

---

### 8.5 Public & Marketing Pages
*Accessible to all users without authentication. Header: `Navbar.tsx`. Footer: `Footer.tsx`.*

#### 1. Sovereign Homepage (`/`)
- **Route:** `/src/app/page.tsx` (51 KB)
- **Components:**
  - `IntroAnimation.tsx`: Atmospheric opening sanctuary sequence.
  - Monumental Hero Banner with instant booking widget.
  - `CinematicDestinations.tsx`: Marquee of holy destinations (Kaaba, Prophet's Mosque, Quba, Taif).
  - `AlHarmainStandard.tsx`: 6 Pillars of Luxury Pilgrimage Hospitality.
  - Vehicle Fleet Showcase: Interactive cards for GMC Yukon XL, Staria VIP, Executive Sedan, and HiRoof Minibus.
  - Testimonial Carousel & VIP Concierge Callout.

#### 2. Heritage & Standard (`/about`)
- **Route:** `/src/app/about/page.tsx`
- **Components:** `AboutHero`, `HeritageSection`, `StatsSection`, `MissionVisionSection`, `AboutCtaSection`, animated smooth scrolling with Lenis and GSAP.

#### 3. VIP Fleet & Services (`/services`)
- **Route:** `/src/app/services/page.tsx`
- **Components:** Dynamic services grid populated from CMS, price tags, feature bullet points, and `VehicleClassesSection.tsx` interactive tilt showcase.

#### 4. Concierge & Support (`/contact`)
- **Route:** `/src/app/contact/page.tsx`
- **Components:** 24/7 Dispatch inquiry form, WhatsApp direct chat link, branch locations in Makkah, Madinah, and Jeddah.

#### 5. 404 Route Not Found (`/not-found`)
- **Route:** `/src/app/not-found.tsx`
- **Components:** Luxury compass emblem, route undefined code, Return to Home and Book Chauffeur quick links.

---

### 8.6 Authentication & Account Verification (`/*`)
*Card Shell: `src/components/auth/AuthShell.tsx`.*

- **Sign In (`/sign-in`):** Email & password login, show/hide password toggle, redirect URL forwarding, forgot password link, role-aware routing upon authentication.
- **Sign Up (`/sign-up`):** Registration form with full name, email, phone number, password, role selection (Customer or Driver application), terms agreement.
- **Forgot Password (`/forgot-password`):** Email recovery intake, sends password reset email via Supabase Auth.
- **Reset Password (`/reset-password`):** Secure token verification, new password and confirmation input.
- **Email Verification Notice (`/verify-email`):** Resend confirmation email, status check.
- **Phone Verification Notice (`/verify-phone`):** SMS OTP verification screen.
- **Auth Callback Handler (`/callback`):** OAuth and email confirmation exchange listener.

---

## 9. Accessibility (WCAG AA) & Performance Standards

1. **Color Contrast:** All body text meets WCAG AA contrast ratio of at least `4.5:1` against `--bg-page` (`#f8fafc`) and `--bg-card` (`#ffffff`). Large display headings meet `3:1`.
2. **Accessible Labels & Inputs:** Every form field has an associated `<label>` or explicit `aria-label` / `title` attribute.
3. **Keyboard Navigation:** Full focus ring visible on tab (`:focus-visible { outline: 2px solid var(--ring-brand); outline-offset: 2px; }`).
4. **Skip Link:** Global accessible skip link `#main-content` rendered at the top of the body in `layout.tsx`.
5. **Touch Targets:** Minimum touch target size of `44px x 44px` on mobile for buttons, navigation triggers, and map controls.
6. **Dynamic Map Imports:** All map modules (`leaflet`, `BookingMap`, `LiveMap`) must use dynamic imports with `{ ssr: false }` to prevent Next.js server-side evaluation errors.

---

## 10. Mandatory Development Conventions for Future Work

Every developer and coding agent modifying or extending the Al Harmain Travels application must adhere to these 10 binding rules:

1. **Strictly Light Theme Only:** Never introduce dark theme toggles, dark background variables, or dark-mode classes. All surfaces must remain clean, crisp, and luminous as defined by the light design tokens.
2. **Inspect & Reuse Before Creating:** Always search `src/components/` for existing shared components (`AdminUIComponents.tsx`, `DataStateSkeletons.tsx`, `PageShell.tsx`, `BrandLogo.tsx`) before building a new UI widget.
3. **Token Compliance:** Use predefined Tailwind classes (`bg-page`, `bg-card`, `bg-surface`, `text-primary`, `text-secondary`, `text-muted`, `border-base`) instead of hardcoding arbitrary hex colors or inline CSS.
4. **Unified Activity Tones:** Status badges, table indicators, and system feedback must use the canonical `ActivityTone` system (`green`, `red`, `amber`, `blue`, `purple`, `neutral`).
5. **Resilient Data Fallbacks:** Never write code that assumes Supabase or external APIs will return without error. Wrap network calls in `try/catch` and gracefully fall back to local store and `src/lib/mock-data.ts`.
6. **Centralized Domain Models:** All entity types must reside in `src/types/index.ts`. Never declare private or duplicate booking, driver, user, or payment interfaces in local page files.
7. **Bilingual RTL Support:** When adding new text or layout structures, ensure compatibility with Arabic RTL layouts (`[dir="rtl"]`) and register localized strings in `src/context/LanguageContext.tsx`.
8. **Asynchronous Feedback Standard:** Pair all async mutations with `toast.*` from `sonner` and durable notifications via `AppContext.addNotification(...)`.
9. **Responsive & Mobile Fluidity:** Test every feature at `375px`, `768px`, and `1440px`. Mobile sidebars must be accessible via drawers, and tables must support horizontal scrolling or card transformations.
10. **Preserve Business Logic & Schemas:** Never alter Supabase table schemas, RLS policies, fare calculation formulas (`fare-calculator.ts`, `fixed-fare.ts`), or driver assignment rules merely to standardize UI styling. Any justified deviation must be documented.
