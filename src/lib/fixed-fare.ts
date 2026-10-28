/**
 * Fixed-Fare Rate Engine — Al Harmain Travels
 *
 * This is the SOLE authoritative source for all fixed fares.
 * Fares are NEVER computed from distance, GPS coordinates, duration, or any
 * dynamic value. Every fare corresponds to an exact row in this lookup table.
 *
 * The in-code table mirrors the database `fixed_fare_rates` table exactly.
 * The database is the primary source; this file acts as a compile-time
 * verified fallback and server-side validation layer.
 */

import type {
  VehicleCategory,
  ServiceType,
  TerminalCode,
  FixedFareRate,
  FareResolution,
  RateVehicleType,
  RateServiceType,
  RateRoute,
  RateTerminal,
  LocationPoint,
} from '@/types';

// ─── Canonical Rate Table ──────────────────────────────────────────────────
// All prices in SAR (Saudi Arabian Riyal).
// Treat as immutable. Do NOT add averages, multipliers, or dynamic overrides.

type RateEntry = {
  id: string;
  vehicle_category: VehicleCategory;
  service_type: ServiceType;
  terminal: TerminalCode;
  fare_amount: number;
};

export const FIXED_RATE_TABLE: RateEntry[] = [
  // ── A. Sedan (Toyota Camry / Hyundai Sonata) ───────────────────────────
  { id: 'sedan-jeddah-makkah',            vehicle_category: 'sedan',  service_type: 'intercity_jeddah_makkah',         terminal: null,         fare_amount: 200 },
  { id: 'sedan-makkah-jeddah',            vehicle_category: 'sedan',  service_type: 'intercity_makkah_jeddah',         terminal: null,         fare_amount: 180 },
  { id: 'sedan-makkah-madinah',           vehicle_category: 'sedan',  service_type: 'intercity_makkah_madinah',        terminal: null,         fare_amount: 350 },
  { id: 'sedan-makkah-madinah-sameday',   vehicle_category: 'sedan',  service_type: 'intercity_makkah_madinah_sameday',terminal: null,         fare_amount: 650 },
  { id: 'sedan-taif-ziyarat',             vehicle_category: 'sedan',  service_type: 'ziyarat_taif',                    terminal: null,         fare_amount: 350 },
  { id: 'sedan-taif-bani-saad',           vehicle_category: 'sedan',  service_type: 'ziyarat_taif_bani_saad',          terminal: null,         fare_amount: 500 },
  { id: 'sedan-makkah-ziyarat',           vehicle_category: 'sedan',  service_type: 'ziyarat_makkah',                  terminal: null,         fare_amount: 180 },

  // ── B. Hyundai Staria ──────────────────────────────────────────────────
  { id: 'staria-jeddah-makkah-t1',        vehicle_category: 'staria', service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_1', fare_amount: 300 },
  { id: 'staria-jeddah-makkah-th',        vehicle_category: 'staria', service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_h', fare_amount: 350 },
  { id: 'staria-makkah-jeddah',           vehicle_category: 'staria', service_type: 'intercity_makkah_jeddah',         terminal: null,         fare_amount: 250 },
  { id: 'staria-makkah-madinah',          vehicle_category: 'staria', service_type: 'intercity_makkah_madinah',        terminal: null,         fare_amount: 500 },
  { id: 'staria-makkah-madinah-sameday',  vehicle_category: 'staria', service_type: 'intercity_makkah_madinah_sameday',terminal: null,         fare_amount: 800 },
  { id: 'staria-taif-ziyarat',            vehicle_category: 'staria', service_type: 'ziyarat_taif',                    terminal: null,         fare_amount: 400 },
  { id: 'staria-taif-bani-saad',          vehicle_category: 'staria', service_type: 'ziyarat_taif_bani_saad',          terminal: null,         fare_amount: 600 },
  { id: 'staria-makkah-ziyarat',          vehicle_category: 'staria', service_type: 'ziyarat_makkah',                  terminal: null,         fare_amount: 250 },

  // ── C. GMC — Nusuk ────────────────────────────────────────────────────
  { id: 'gmc-jeddah-makkah-th',           vehicle_category: 'gmc',    service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_h', fare_amount: 650 },
  { id: 'gmc-jeddah-makkah-t1',           vehicle_category: 'gmc',    service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_1', fare_amount: 600 },
  { id: 'gmc-jeddah-makkah-tn',           vehicle_category: 'gmc',    service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_n', fare_amount: 600 },
  { id: 'gmc-makkah-jeddah',              vehicle_category: 'gmc',    service_type: 'intercity_makkah_jeddah',         terminal: null,         fare_amount: 500 },
  { id: 'gmc-makkah-madinah',             vehicle_category: 'gmc',    service_type: 'intercity_makkah_madinah',        terminal: null,         fare_amount: 900 },
  { id: 'gmc-taif-ziyarat',               vehicle_category: 'gmc',    service_type: 'ziyarat_taif',                    terminal: null,         fare_amount: 700 },
  { id: 'gmc-taif-bani-saad',             vehicle_category: 'gmc',    service_type: 'ziyarat_taif_bani_saad',          terminal: null,         fare_amount: 1000 },
  { id: 'gmc-makkah-ziyarat',             vehicle_category: 'gmc',    service_type: 'ziyarat_makkah',                  terminal: null,         fare_amount: 450 },

  // ── D. HiRoof — Nusuk ─────────────────────────────────────────────────
  { id: 'hiroof-jeddah-makkah-th',        vehicle_category: 'hiroof', service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_h', fare_amount: 450 },
  { id: 'hiroof-jeddah-makkah-t1',        vehicle_category: 'hiroof', service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_1', fare_amount: 400 },
  { id: 'hiroof-jeddah-makkah-tn',        vehicle_category: 'hiroof', service_type: 'intercity_jeddah_makkah',         terminal: 'terminal_n', fare_amount: 400 },
  { id: 'hiroof-makkah-jeddah',           vehicle_category: 'hiroof', service_type: 'intercity_makkah_jeddah',         terminal: null,         fare_amount: 300 },
  { id: 'hiroof-makkah-madinah',          vehicle_category: 'hiroof', service_type: 'intercity_makkah_madinah',        terminal: null,         fare_amount: 600 },
  { id: 'hiroof-taif-ziyarat',            vehicle_category: 'hiroof', service_type: 'ziyarat_taif',                    terminal: null,         fare_amount: 500 },
  { id: 'hiroof-taif-bani-saad',          vehicle_category: 'hiroof', service_type: 'ziyarat_taif_bani_saad',          terminal: null,         fare_amount: 750 },
  { id: 'hiroof-makkah-ziyarat',          vehicle_category: 'hiroof', service_type: 'ziyarat_makkah',                  terminal: null,         fare_amount: 300 },
];

// ─── Service meta-data for UI ──────────────────────────────────────────────

export const SERVICE_LABELS: Record<ServiceType, string> = {
  intercity_jeddah_makkah:          'Jeddah → Makkah',
  intercity_makkah_jeddah:          'Makkah → Jeddah',
  intercity_makkah_madinah:         'Makkah → Madinah → Makkah',
  intercity_makkah_madinah_sameday: 'Makkah → Madinah → Makkah (Same Day)',
  ziyarat_taif:                     'Taif Ziyarat',
  ziyarat_taif_bani_saad:           'Taif Ziyarat + Bani Saad',
  ziyarat_makkah:                   'Makkah Ziyarat',
};

export const VEHICLE_LABELS: Record<VehicleCategory, string> = {
  sedan:  'Sedan — Camry / Sonata',
  staria: 'Hyundai Staria',
  gmc:    'GMC — Nusuk',
  hiroof: 'HiRoof — Nusuk',
};

export const TERMINAL_LABELS: Record<NonNullable<TerminalCode>, string> = {
  terminal_1: 'Terminal 1',
  terminal_h: 'Terminal H',
  terminal_n: 'Terminal N',
  all_terminals: 'All Terminals',
};

export const VEHICLE_CAPACITY: Record<VehicleCategory, { passengers: number; luggage: number }> = {
  sedan:  { passengers: 4,  luggage: 3 },
  staria: { passengers: 7,  luggage: 6 },
  gmc:    { passengers: 7,  luggage: 6 },
  hiroof: { passengers: 11, luggage: 10 },
};

export const CANONICAL_RATE_VEHICLES: RateVehicleType[] = [
  { id: 'sedan', name: 'Sedan — Camry / Sonata', category: 'sedan', seating_capacity: 4, luggage_capacity: 3, description: 'VIP Toyota Camry / Hyundai Sonata', is_active: true, display_order: 1 },
  { id: 'staria', name: 'Hyundai Staria VIP', category: 'staria', seating_capacity: 7, luggage_capacity: 6, description: 'Hyundai Staria VIP 7-seater luxury MPV', is_active: true, display_order: 2 },
  { id: 'gmc', name: 'GMC Yukon XL — Nusuk', category: 'gmc', seating_capacity: 7, luggage_capacity: 6, description: 'VIP Luxury GMC Yukon XL with Nusuk permit', is_active: true, display_order: 3 },
  { id: 'hiroof', name: 'Toyota HiRoof Minibus — Nusuk', category: 'hiroof', seating_capacity: 11, luggage_capacity: 10, description: 'Toyota HiRoof 11-seater minibus with Nusuk permit', is_active: true, display_order: 4 },
];

export const CANONICAL_RATE_SERVICES: RateServiceType[] = [
  { id: 'intercity', name: 'Intercity VIP Transfer', description: 'Direct highway transfers between Jeddah, Makkah, and Madinah', is_active: true, display_order: 1 },
  { id: 'ziyarat', name: 'Ziyarat Sacred Tour', description: 'Historical and religious sacred monument ziyarat tours', is_active: true, display_order: 2 },
  { id: 'airport', name: 'Airport VIP Transfer', description: 'Direct terminal pickups and drop-offs at King Abdulaziz Airport', is_active: true, display_order: 3 },
];

export const CANONICAL_RATE_ROUTES: RateRoute[] = [
  { id: 'intercity_jeddah_makkah', service_id: 'airport', route_name: 'Jeddah → Makkah', origin_name: 'Jeddah (KAIA Airport / Hotel)', destination_name: 'Makkah Al-Mukarramah', is_airport: true, is_active: true, display_order: 1 },
  { id: 'intercity_makkah_jeddah', service_id: 'airport', route_name: 'Makkah → Jeddah', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Jeddah (KAIA Airport / Hotel)', is_airport: true, is_active: true, display_order: 2 },
  { id: 'intercity_makkah_madinah', service_id: 'intercity', route_name: 'Makkah → Madinah → Makkah', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Madinah Al-Munawwarah', is_airport: false, is_active: true, display_order: 3 },
  { id: 'intercity_makkah_madinah_sameday', service_id: 'intercity', route_name: 'Makkah → Madinah → Makkah (Same Day)', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Madinah Al-Munawwarah (Same Day Return)', is_airport: false, is_active: true, display_order: 4 },
  { id: 'ziyarat_taif', service_id: 'ziyarat', route_name: 'Taif Ziyarat', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Taif Sacred Places', is_airport: false, is_active: true, display_order: 5 },
  { id: 'ziyarat_taif_bani_saad', service_id: 'ziyarat', route_name: 'Taif Ziyarat + Bani Saad', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Taif + Halimah As-Sa\'diyah Village', is_airport: false, is_active: true, display_order: 6 },
  { id: 'ziyarat_makkah', service_id: 'ziyarat', route_name: 'Makkah Ziyarat', origin_name: 'Makkah Al-Mukarramah', destination_name: 'Jabal Al-Noor, Ghar Hira & Historical Places', is_airport: false, is_active: true, display_order: 7 },
];

export const CANONICAL_RATE_TERMINALS: RateTerminal[] = [
  { id: 'terminal_1', name: 'Terminal 1', code: 'terminal_1', route_id: 'intercity_jeddah_makkah', description: 'Jeddah KAIA Terminal 1', is_active: true, display_order: 1 },
  { id: 'terminal_h', name: 'Terminal H (Hajj)', code: 'terminal_h', route_id: 'intercity_jeddah_makkah', description: 'Jeddah KAIA Hajj Terminal', is_active: true, display_order: 2 },
  { id: 'terminal_n', name: 'Terminal N (North)', code: 'terminal_n', route_id: 'intercity_jeddah_makkah', description: 'Jeddah KAIA North Terminal', is_active: true, display_order: 3 },
  { id: 'all_terminals', name: 'All Terminals', code: 'all_terminals', route_id: 'intercity_jeddah_makkah', description: 'Uniform fare for all KAIA terminals', is_active: true, display_order: 4 },
];

/**
 * Standard King Abdulaziz International Airport (KAIA) Terminal pickup locations.
 * Includes precise GPS coordinates and official Saudi address strings for Google Maps.
 */
export const JEDDAH_AIRPORT_TERMINAL_LOCATIONS: Record<string, LocationPoint> = {
  terminal_1: {
    address: 'King Abdulaziz International Airport - Terminal 1, Jeddah',
    latitude: 21.6826,
    longitude: 39.1564,
    placeId: 'jed-airport-t1',
  },
  terminal_h: {
    address: 'King Abdulaziz International Airport - Terminal H (Hajj & Umrah), Jeddah',
    latitude: 21.6980,
    longitude: 39.1610,
    placeId: 'jed-airport-hajj',
  },
  terminal_n: {
    address: 'King Abdulaziz International Airport - North Terminal, Jeddah',
    latitude: 21.7058,
    longitude: 39.1481,
    placeId: 'jed-airport-north',
  },
  all_terminals: {
    address: 'King Abdulaziz International Airport (KAIA), Jeddah',
    latitude: 21.6826,
    longitude: 39.1564,
    placeId: 'jed-airport-t1',
  },
};

/**
 * Resolves the official pickup LocationPoint for an airport terminal.
 * Supports standard codes ('terminal_1', 'terminal_h', 'terminal_n') as well as
 * dynamic rateTerminals configured in the Admin Rate Master.
 */
export function getAirportTerminalLocation(
  terminalCode: TerminalCode | string | null,
  rateTerminals?: RateTerminal[]
): LocationPoint | null {
  if (!terminalCode) return null;
  const normalized = String(terminalCode).toLowerCase().trim();

  if (JEDDAH_AIRPORT_TERMINAL_LOCATIONS[normalized]) {
    return { ...JEDDAH_AIRPORT_TERMINAL_LOCATIONS[normalized] };
  }

  // Check dynamic rate terminals
  if (rateTerminals && rateTerminals.length > 0) {
    const matched = rateTerminals.find(
      (t) => t.code?.toLowerCase() === normalized || t.id?.toLowerCase() === normalized
    );
    if (matched) {
      if (JEDDAH_AIRPORT_TERMINAL_LOCATIONS[matched.code]) {
        return { ...JEDDAH_AIRPORT_TERMINAL_LOCATIONS[matched.code] };
      }
      return {
        address: `${matched.name}, King Abdulaziz International Airport, Jeddah`,
        latitude: 21.6826,
        longitude: 39.1564,
        placeId: `terminal-${matched.code || matched.id}`,
      };
    }
  }

  return null;
}

/** Services that require an airport terminal selection */
export const TERMINAL_REQUIRED_SERVICES: ServiceType[] = [
  'intercity_jeddah_makkah',
];

/** Vehicles that have terminal-specific pricing */
export const TERMINAL_SPECIFIC_VEHICLES: VehicleCategory[] = [
  'staria', 'gmc', 'hiroof',
];

/** Services that are pure Ziyarat (no pickup/destination needed) */
export const ZIYARAT_SERVICES: ServiceType[] = [
  'ziyarat_makkah', 'ziyarat_taif', 'ziyarat_taif_bani_saad',
];

/**
 * Determines whether a service route involves an airport (such as King Abdulaziz International Airport Jeddah)
 * and therefore requires or supports terminal selection.
 */
export function isAirportRoute(serviceType: string, rateRoutes?: RateRoute[]): boolean {
  if (!serviceType) return false;
  if (rateRoutes && rateRoutes.length > 0) {
    const matchedRoute = rateRoutes.find(r => r.id === serviceType);
    if (matchedRoute) {
      return Boolean(matchedRoute.is_airport);
    }
  }
  const lower = serviceType.toLowerCase().trim();
  if (lower === 'intercity_jeddah_makkah' || lower === 'intercity_makkah_jeddah') {
    return true;
  }
  if (
    lower.includes('airport') ||
    lower.includes('terminal') ||
    lower.includes('matar') ||
    lower.includes('kaia') ||
    lower.includes('jeddah_air')
  ) {
    return true;
  }
  return false;
}

export type AirportTerminalTarget = 'pickup' | 'destination' | null;

/**
 * Determines whether the airport terminal serves as the pickup location (origin)
 * or destination for a given service route.
 * E.g.:
 * - Jeddah → Makkah: airport is PICKUP (arrival terminal)
 * - Makkah → Jeddah: airport is DESTINATION (departure terminal)
 */
export function getAirportTerminalTarget(
  serviceType: string | null | undefined,
  rateRoutes?: RateRoute[]
): AirportTerminalTarget {
  if (!serviceType) return null;
  if (!isAirportRoute(serviceType, rateRoutes)) return null;

  // 1. Check live admin rateRoutes origin and destination names
  if (rateRoutes && rateRoutes.length > 0) {
    const matched = rateRoutes.find((r) => r.id === serviceType);
    if (matched) {
      const orig = (matched.origin_name || '').toLowerCase();
      const dest = (matched.destination_name || '').toLowerCase();

      const isOrigAirport = orig.includes('airport') || orig.includes('kaia') || orig.includes('matar') || orig.includes('terminal');
      const isDestAirport = dest.includes('airport') || dest.includes('kaia') || dest.includes('matar') || dest.includes('terminal');

      if (isDestAirport && !isOrigAirport) return 'destination';
      if (isOrigAirport && !isDestAirport) return 'pickup';

      // If both or neither explicitly contain airport keyword, check city orientation
      if (dest.includes('jeddah') && !orig.includes('jeddah')) return 'destination';
      if (orig.includes('jeddah') && !dest.includes('jeddah')) return 'pickup';
    }
  }

  // 2. Canonical service types check
  const lower = serviceType.toLowerCase().trim();
  if (lower === 'intercity_makkah_jeddah') return 'destination';
  if (lower === 'intercity_jeddah_makkah') return 'pickup';

  // 3. Fallback based on naming patterns
  if (lower.includes('to_jeddah') || lower.includes('to_airport') || lower.includes('makkah_to_jeddah')) {
    return 'destination';
  }
  if (lower.includes('from_jeddah') || lower.includes('from_airport') || lower.includes('jeddah_to_')) {
    return 'pickup';
  }

  // Default for airport routes: default to pickup
  return 'pickup';
}

export interface RateConflictResult {
  hasConflict: boolean;
  message?: string;
  conflictingRate?: FixedFareRate;
}

/**
 * Checks whether an intended rate for a vehicle, route, and terminal conflicts with existing active rates.
 * Rules:
 * - Duplicate prevention: No duplicate active rate for the exact same (route, vehicle, terminal).
 * - Overlap prevention: 'all_terminals' conflicts with individual terminal rates ('terminal_1', 'terminal_h', 'terminal_n')
 *   and vice-versa.
 */
export function checkRateConflict(
  vehicleCategory: string,
  serviceType: string,
  terminal: TerminalCode | string | null,
  existingRates: FixedFareRate[],
  excludeRateId?: string,
): RateConflictResult {
  const normTerminal = terminal && terminal !== 'none' ? terminal : null;
  const activeExisting = existingRates.filter(
    (r) =>
      r.is_active &&
      r.id !== excludeRateId &&
      r.vehicle_category === vehicleCategory &&
      r.service_type === serviceType
  );

  // 1. Exact duplicate active rate check
  const exactDuplicate = activeExisting.find(
    (r) => (r.terminal === normTerminal) || (!r.terminal && !normTerminal)
  );
  if (exactDuplicate) {
    const termLabel = normTerminal
      ? (TERMINAL_LABELS[normTerminal as NonNullable<TerminalCode>] || normTerminal)
      : 'Non-Airport';
    return {
      hasConflict: true,
      message: `An active rate for ${getVehicleLabel(vehicleCategory)} on route "${getServiceLabel(serviceType)}" with terminal "${termLabel}" already exists.`,
      conflictingRate: exactDuplicate,
    };
  }

  // 2. Overlap check: 'all_terminals' vs specific terminals
  if (normTerminal === 'all_terminals') {
    const specificConflict = activeExisting.find((r) =>
      r.terminal && ['terminal_1', 'terminal_h', 'terminal_n'].includes(r.terminal)
    );
    if (specificConflict) {
      const termLabel = TERMINAL_LABELS[specificConflict.terminal as NonNullable<TerminalCode>] || specificConflict.terminal;
      return {
        hasConflict: true,
        message: `Conflict for ${getVehicleLabel(vehicleCategory)}: an active rate already exists for ${termLabel}. Please deactivate or remove the individual terminal rate before configuring a shared "All Terminals" rate.`,
        conflictingRate: specificConflict,
      };
    }
  } else if (normTerminal && ['terminal_1', 'terminal_h', 'terminal_n'].includes(normTerminal)) {
    const allTerminalsConflict = activeExisting.find((r) => r.terminal === 'all_terminals');
    if (allTerminalsConflict) {
      return {
        hasConflict: true,
        message: `Conflict for ${getVehicleLabel(vehicleCategory)}: a shared "All Terminals" rate already exists for this route. Please deactivate or remove the "All Terminals" rate before configuring terminal-specific pricing.`,
        conflictingRate: allTerminalsConflict,
      };
    }
  }

  return { hasConflict: false };
}

// ─── Core Fare Resolver ────────────────────────────────────────────────────

/**
 * Resolves the exact fixed fare for a given combination.
 *
 * Rules:
 * - If customRates is provided, searches through active rates in customRates first.
 * - If customRates is omitted, searches FIXED_RATE_TABLE.
 * - Terminal MUST be provided for Jeddah→Makkah routes (non-sedan vehicles) unless 'all_terminals' is configured.
 * - Sedan does NOT require terminal-specific pricing, but will match 'all_terminals' or null if set.
 * - Exact matches take precedence; 'all_terminals' acts as the shared airport rate fallback.
 * - Returns `found: false` for any unsupported combination.
 * - NEVER falls back to a default fare or interpolates from another vehicle.
 */
export function resolveFixedFare(
  vehicleCategory: VehicleCategory | string,
  serviceType: ServiceType | string,
  terminal?: TerminalCode | string | null,
  customRates?: FixedFareRate[],
): FareResolution {
  // Normalise terminal
  const rawTerminal = (terminal as TerminalCode) ?? null;
  const effectiveTerminal: TerminalCode =
    vehicleCategory === 'sedan' && rawTerminal !== 'all_terminals' ? null : rawTerminal;

  // If a custom active rates list is provided (e.g. from Admin Rate List via AppContext),
  // search it first. Only active rates (is_active !== false) are matched.
  if (customRates && customRates.length > 0) {
    // 1. Exact match
    let match = customRates.find(
      (r) =>
        r.vehicle_category === vehicleCategory &&
        r.service_type === serviceType &&
        (r.terminal === effectiveTerminal || (!r.terminal && !effectiveTerminal)) &&
        r.is_active !== false,
    );

    // 2. If no exact match and customer selected an airport terminal (terminal_1, terminal_h, terminal_n),
    // fallback to 'all_terminals' shared rate
    if (!match && effectiveTerminal && effectiveTerminal !== 'all_terminals') {
      match = customRates.find(
        (r) =>
          r.vehicle_category === vehicleCategory &&
          r.service_type === serviceType &&
          r.terminal === 'all_terminals' &&
          r.is_active !== false,
      );
    }

    // 3. For vehicles with effectiveTerminal === null (e.g. sedan or general airport),
    // check if an 'all_terminals' rate was configured for it
    if (!match && !effectiveTerminal) {
      match = customRates.find(
        (r) =>
          r.vehicle_category === vehicleCategory &&
          r.service_type === serviceType &&
          (r.terminal === 'all_terminals' || !r.terminal) &&
          r.is_active !== false,
      );
    }

    if (match) {
      return {
        found: true,
        fare: Number(match.fare_amount),
        currency: 'SAR',
        fareType: 'fixed',
        rateId: match.id,
      };
    }

    // For terminal-required services on non-sedan, if no terminal was specified and no general/all_terminals rate
    if (
      TERMINAL_REQUIRED_SERVICES.includes(serviceType as ServiceType) &&
      vehicleCategory !== 'sedan' &&
      !effectiveTerminal
    ) {
      return {
        found: false,
        reason:
          'Airport terminal is required for this vehicle and route. Please select Terminal 1, H, or N.',
      };
    }

    // If customRates was explicitly supplied but no active match exists,
    // this rate was either deactivated, deleted, or never configured.
    return {
      found: false,
      reason:
        'This vehicle and route combination is currently unavailable or inactive in the rate list. ' +
        'Please contact our operations team for assistance.',
    };
  }

  // Compile-time fallback lookup table
  let match = FIXED_RATE_TABLE.find(
    (r) =>
      r.vehicle_category === vehicleCategory &&
      r.service_type === serviceType &&
      r.terminal === effectiveTerminal,
  );

  // If no exact match and effectiveTerminal is an airport terminal, check for all_terminals
  if (!match && effectiveTerminal && effectiveTerminal !== 'all_terminals') {
    match = FIXED_RATE_TABLE.find(
      (r) =>
        r.vehicle_category === vehicleCategory &&
        r.service_type === serviceType &&
        r.terminal === 'all_terminals',
    );
  }

  // For terminal-required services on non-sedan without terminal
  if (
    TERMINAL_REQUIRED_SERVICES.includes(serviceType as ServiceType) &&
    vehicleCategory !== 'sedan' &&
    !effectiveTerminal &&
    !match
  ) {
    return {
      found: false,
      reason:
        'Airport terminal is required for this vehicle and route. Please select Terminal 1, H, or N.',
    };
  }

  if (!match) {
    return {
      found: false,
      reason:
        'This vehicle and route combination does not have a configured fare. ' +
        'Please contact our team for a custom quote.',
    };
  }

  return {
    found: true,
    fare: match.fare_amount,
    currency: 'SAR',
    fareType: 'fixed',
    rateId: match.id,
  };
}

/**
 * Returns all active vehicles that have at least one fare configured for the
 * given service type and (optionally) terminal. Used to filter the vehicle
 * selection cards so we never show unserviceable options.
 */
export function getAvailableVehicles(
  serviceType: ServiceType | string,
  terminal?: TerminalCode | string | null,
  customRates?: FixedFareRate[],
  rateVehicles?: RateVehicleType[],
): VehicleCategory[] {
  const candidateVehicles: VehicleCategory[] = (rateVehicles && rateVehicles.length > 0)
    ? rateVehicles.filter((v) => v.is_active).map((v) => v.category as VehicleCategory)
    : ['sedan', 'staria', 'gmc', 'hiroof'];

  return candidateVehicles.filter((v) => {
    const result = resolveFixedFare(v, serviceType, terminal, customRates);
    return result.found;
  });
}

/**
 * Returns all service types that currently have at least one active configured rate.
 */
export function getActiveServiceTypes(customRates?: FixedFareRate[], rateRoutes?: RateRoute[]): string[] {
  if (customRates && customRates.length > 0) {
    const active = customRates.filter((r) => r.is_active !== false);
    return Array.from(new Set(active.map((r) => r.service_type)));
  }
  if (rateRoutes && rateRoutes.length > 0) {
    return rateRoutes.filter((r) => r.is_active !== false).map((r) => r.id);
  }
  return Array.from(new Set(FIXED_RATE_TABLE.map((r) => r.service_type)));
}

/**
 * Returns all terminal codes that have active configured rates for a specific service.
 */
export function getActiveTerminalsForService(
  serviceType: string,
  customRates?: FixedFareRate[],
  rateTerminals?: RateTerminal[],
): NonNullable<TerminalCode>[] {
  const rates = customRates && customRates.length > 0 ? customRates : getAllRatesAsObjects();
  const terminals = rates
    .filter((r) => r.service_type === serviceType && r.is_active !== false && r.terminal)
    .map((r) => r.terminal as NonNullable<TerminalCode>);

  if (terminals.length > 0) {
    return Array.from(new Set(terminals));
  }

  // Fallback to active terminals linked to this route if dynamic terminals provided
  if (rateTerminals && rateTerminals.length > 0) {
    const linked = rateTerminals
      .filter((t) => t.is_active && (!t.route_id || t.route_id === serviceType))
      .map((t) => (t.code || t.id) as NonNullable<TerminalCode>);
    if (linked.length > 0) {
      return Array.from(new Set(linked));
    }
  }

  return [];
}

/**
 * Helper to get a human-readable vehicle label even for newly configured or custom vehicle types.
 */
export function getVehicleLabel(category: string, rateVehicles?: RateVehicleType[]): string {
  if (rateVehicles && rateVehicles.length > 0) {
    const matched = rateVehicles.find((v) => v.id === category || v.category === category);
    if (matched) return matched.name;
  }
  if (category in VEHICLE_LABELS) {
    return VEHICLE_LABELS[category as VehicleCategory];
  }
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
}

/**
 * Helper to get a human-readable service label even for custom or new route types.
 */
export function getServiceLabel(serviceType: string, rateRoutes?: RateRoute[]): string {
  if (rateRoutes && rateRoutes.length > 0) {
    const matched = rateRoutes.find((r) => r.id === serviceType);
    if (matched) return matched.route_name;
  }
  if (serviceType in SERVICE_LABELS) {
    return SERVICE_LABELS[serviceType as ServiceType];
  }
  return serviceType
    .replace(/^intercity_/, '')
    .replace(/^ziyarat_/, 'Ziyarat: ')
    .replace(/_/g, ' → ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Helper to get passenger & luggage capacity for any vehicle category.
 */
export function getVehicleCapacity(category: string, rateVehicles?: RateVehicleType[]): { passengers: number; luggage: number } {
  if (rateVehicles && rateVehicles.length > 0) {
    const matched = rateVehicles.find((v) => v.id === category || v.category === category);
    if (matched) {
      return { passengers: matched.seating_capacity, luggage: matched.luggage_capacity };
    }
  }
  if (category in VEHICLE_CAPACITY) {
    return VEHICLE_CAPACITY[category as VehicleCategory];
  }
  return { passengers: 4, luggage: 4 };
}

/**
 * Formats a SAR fare amount as a display string.
 * e.g. 1000 → "SAR 1,000"
 */
export function formatFareSAR(amount: number): string {
  return `SAR ${amount.toLocaleString('en-SA')}`;
}

/**
 * Build a full FixedFareRate object from the in-code table.
 * Useful for seeding the database and admin UI.
 */
export function getAllRatesAsObjects(): FixedFareRate[] {
  const now = new Date().toISOString();
  return FIXED_RATE_TABLE.map((r) => ({
    ...r,
    currency: 'SAR' as const,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));
}

