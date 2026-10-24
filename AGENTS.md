# Al Harmain Travels — Coding Agent Guidelines & Project Instructions

All AI coding assistants, automated agents, and developers working on the **Al Harmain Travels** codebase must read and strictly adhere to the instructions below before proposing or executing changes.

---

## 1. Mandatory Pre-Flight Requirement: UI/UX & Design System

Before implementing, refactoring, or modifying any user interface, page, component, styling, layout, or user workflow:

> **You MUST read and follow [UI/UX & Design System Reference.md](file:///d:/Al%20Harmain%20Travels/UI/UX%20&%20Design%20System%20Reference.md) at the project root.**

This document contains the authoritative, application-wide design system specification covering:
- **Light-Theme-Only Mandate:** The application is strictly light theme only. Never introduce dark mode, dark backgrounds, or theme toggles.
- **Design Tokens & Colors:** Use semantic tokens (`bg-page`, `bg-card`, `bg-elevated`, `text-primary`, `text-secondary`, `text-muted`, `border-base`, `brand-*`, `gold-*`) instead of ad-hoc hex values.
- **Typography:** Dual hierarchy with *Cormorant Garamond* (marketing display) and *Plus Jakarta Sans* (UI and tabular data), with *Cairo* for Arabic RTL.
- **Component Reuse:** Reuse existing components (`AdminUIComponents.tsx`, `DataStateSkeletons.tsx`, `PageShell.tsx`, `BrandLogo.tsx`, `MapControls.tsx`) before building new ones.
- **Status & Semantic Rules:** Statuses must follow the canonical `ActivityTone` system (`green`, `red`, `amber`, `blue`, `purple`, `neutral`).
- **Module Inventory:** Refer to the comprehensive inventory of all 4 role portals (Admin, Dispatcher, Driver, Customer), public pages, and auth flows.

---

## 2. Core Architectural & Engineering Conventions

1. **Strictly Light Theme Only:**
   - Enforce light mode styling across all components.
   - Do not re-enable `ThemeToggle.tsx` or add dark mode switches.
2. **Centralize Types in `src/types/index.ts`:**
   - Never create duplicate or competing interfaces for bookings, drivers, vehicles, users, or rates in local component files.
3. **Resilient Data Fallbacks:**
   - Always wrap Supabase and external API calls in `try/catch`.
   - If an endpoint, table, or column is missing or unmigrated, fall back gracefully to `src/lib/mock-data.ts` and local React state. Never crash the UI.
4. **Preserve Business Logic & Database Schemas:**
   - Do not alter Supabase PostgreSQL schemas, RLS policies, rate calculation logic (`fare-calculator.ts`, `fixed-fare.ts`), or driver assignment algorithms merely to standardize visual appearance.
5. **Dynamic Imports for Maps:**
   - Always dynamically import Leaflet components or browser map containers with `{ ssr: false }` to avoid Next.js SSR crashes.
6. **Unified Notifications & Alerts:**
   - Transient notifications must use `toast.*` from `sonner`.
   - Durable notifications must be added via `AppContext.addNotification(...)` for display in the notification drawer.
7. **Bilingual & RTL Awareness:**
   - Support Arabic localization with `dir="rtl"` and register new UI labels in `src/context/LanguageContext.tsx`.
8. **Responsive Quality Standards:**
   - Ensure layouts work seamlessly across mobile (375px), tablet (768px), and desktop (1280px+).

---

## 3. Reference Documentation

- [UI/UX & Design System Reference (Path: UI/UX & Design System Reference.md)](file:///d:/Al%20Harmain%20Travels/UI/UX%20&%20Design%20System%20Reference.md)
- [UI-UX & Design System Reference (Direct Root File)](file:///d:/Al%20Harmain%20Travels/UI-UX%20&%20Design%20System%20Reference.md)
- [Project Skill Manual](file:///d:/Al%20Harmain%20Travels/.agents/skills/al-harmain-travels/SKILL.md)
- [Architecture & State](file:///d:/Al%20Harmain%20Travels/.agents/skills/al-harmain-travels/references/architecture_and_state.md)
- [Booking & Dispatch Lifecycle](file:///d:/Al%20Harmain%20Travels/.agents/skills/al-harmain-travels/references/booking_and_dispatch_lifecycle.md)
- [Maps & Geolocation](file:///d:/Al%20Harmain%20Travels/.agents/skills/al-harmain-travels/references/maps_and_geolocation.md)
- [Database & APIs](file:///d:/Al%20Harmain%20Travels/.agents/skills/al-harmain-travels/references/database_and_apis.md)
