# UI/UX & Design System Reference

> **Notice:** The comprehensive, full-application specification is maintained in the root document:  
> **[UI/UX & Design System Reference.md](file:///d:/Al%20Harmain%20Travels/UI/UX%20&%20Design%20System%20Reference.md)** (or [UI-UX & Design System Reference.md](file:///d:/Al%20Harmain%20Travels/UI-UX%20&%20Design%20System%20Reference.md)).

---

## 1. Design Philosophy: Islamic Luxury & Operational Precision

Al Harmain Travels blends Islamic heritage hospitality with high-precision operational fleet management. The UI combines pristine, luminous white surfaces (`#ffffff`), warm marble page backgrounds (`#f8fafc`), jewel-emerald accents (`brand-*`), and warm Saudi gold highlights (`gold-*`).

### Strict Theme Policy
- **Strictly Light Theme Only:** Dark mode and theme toggles are decommissioned (`ThemeToggle.tsx` returns null).
- All tokens under `:root`, `html`, `html.light`, and legacy `html.dark` in `src/app/globals.css` map to the identical luxury light palette (`color-scheme: light`).

---

## 2. Color Tokens & Semantic Variables

Defined in `src/app/globals.css` and mapped in `tailwind.config.ts`:

### Premium Light Mode Tokens (Application-Wide)
- **Page Background:** `--bg-page: #f8fafc` (`bg-page`)
- **Card Container:** `--bg-card: #ffffff` (`bg-card`)
- **Elevated Layer:** `--bg-elevated: #f1f5f9` (`bg-elevated`)
- **Surface / Table Headers:** `--bg-surface: #f8fafc` (`bg-surface`)
- **Input Background:** `--bg-input: #ffffff` (`bg-input`)
- **Primary Text:** `--text-primary: #0f172a` (`text-primary`)
- **Secondary Text:** `--text-secondary: #334155` (`text-secondary`)
- **Muted Text:** `--text-muted: #64748b` (`text-muted`)
- **Borders:** `--border-base: #e2e8f0` (`border-base`), `--border-strong: #cbd5e1` (`border-strong`)

### Brand Accents
- **Saudi Flag Green (`--green-primary` / `brand-500` to `brand-700`):**
  - Primary Action / Active Status: `bg-emerald-600 hover:bg-emerald-500`
  - Subtle Badges: `bg-emerald-50 text-emerald-800 border-emerald-200`
- **Pilgrimage Gold (`--gold-primary` / `gold-400` to `gold-600`):**
  - Primary Luxury CTAs: `linear-gradient(135deg, #c8a332, #dfc15a, #c8a332)`
  - VIP GMC & Luxury Badges: `text-amber-800 bg-amber-50 border-amber-200`
  - Rating Stars: `text-amber-500 fill-amber-500`

---

## 3. Typography Hierarchy

The app uses Google Fonts loaded via `@import` in `src/app/globals.css`:
1. **Cormorant Garamond** (`var(--font-display)`):
   - Used on marketing display headers, section titles, and hero branding (`font-display`).
2. **Plus Jakarta Sans** (`var(--font-body)`):
   - Used for all UI chrome, dashboard stats, buttons, forms, tables, and modal copy (`font-sans`).
3. **Cairo** (`[dir="rtl"]`):
   - Used when Arabic localization is active via `LanguageContext.tsx`.

---

## 4. UI Component Patterns

### Page Wrapper (`PageShell.tsx`)
Standardizes responsive padding across dashboards:
```tsx
import PageShell from '@/components/layout/PageShell';

export default function CustomerDashboard() {
  return (
    <PageShell className="py-8 space-y-6">
      {/* Content */}
    </PageShell>
  );
}
```

### Cards & Surfaces
Use `bg-card border border-base rounded-2xl p-5 shadow-sm hover:shadow-soft transition-all duration-300`.

### Status Badges (`AdminUIComponents.tsx`)
Format status badges with the canonical `ActivityTone` system:
- **Green:** Active, Confirmed, Completed, Available, Accepted
- **Red:** Cancelled, Rejected, Inactive, Suspended, Deactivated
- **Amber:** Pending, Waiting, Warning, Requires Attention
- **Blue:** Information, Assigned, View, Navigation
- **Purple:** VIP, In-Progress, Trip Started, Driver Arriving
- **Neutral:** Draft, Metadata, Archived

### Notifications & Toasts
All asynchronous actions trigger `sonner` toasts (`toast.success`, `toast.error`, `toast.info`, `toast.warning`) while logging events to `AppContext.notifications` so staff and customers have persistent historical records.

### Accessibility Standards
- Contrast ratio checks adhere to WCAG AA.
- `#main-content` skip link (`.skip-link`) present in `layout.tsx`.
- Form controls include associated `<label>` tags and descriptive placeholders.
- Screen-reader friendly aria tags on modals, notification bell, and table controls.
