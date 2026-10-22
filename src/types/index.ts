export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'customer';

// ─── Fixed-Fare System Types ────────────────────────────────────────────────

/** Canonical vehicle categories for the fixed-fare rate table */
export type VehicleCategory =
  | 'sedan'       // Toyota Camry / Hyundai Sonata
  | 'staria'      // Hyundai Staria
  | 'gmc'         // GMC — Nusuk
  | 'hiroof'      // HiRoof — Nusuk
  | string;

/** Service types as stable string enums or dynamic route IDs */
export type ServiceType =
  | 'intercity_jeddah_makkah'       // Jeddah → Makkah
  | 'intercity_makkah_jeddah'       // Makkah → Jeddah
  | 'intercity_makkah_madinah'      // Makkah → Madinah → Makkah (standard)
  | 'intercity_makkah_madinah_sameday' // Same-day round trip
  | 'ziyarat_taif'                  // Taif Ziyarat
  | 'ziyarat_taif_bani_saad'        // Taif Ziyarat + Bani Saad
  | 'ziyarat_makkah'                // Makkah Ziyarat
  | string;

/** Airport terminals — applicable to airport routes */
export type TerminalCode = 'terminal_1' | 'terminal_h' | 'terminal_n' | 'all_terminals' | string | null;

/** Dynamic Vehicle Type configured by Admin in Rate Master */
export interface RateVehicleType {
  id: string;
  name: string;
  category: string;
  seating_capacity: number;
  luggage_capacity: number;
  description?: string | null;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/** Dynamic Service Type configured by Admin in Rate Master */
export interface RateServiceType {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/** Dynamic Route configured by Admin in Rate Master */
export interface RateRoute {
  id: string;
  service_id?: string | null;
  route_name: string;
  origin_name: string;
  destination_name: string;
  is_airport: boolean;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/** Dynamic Terminal configured by Admin in Rate Master */
export interface RateTerminal {
  id: string;
  name: string;
  code: string;
  route_id?: string | null;
  description?: string | null;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/** A single row from the fixed_fare_rates table */
export interface FixedFareRate {
  id: string;
  vehicle_category: VehicleCategory;
  service_type: ServiceType;
  terminal: TerminalCode;
  fare_amount: number;
  currency: 'SAR';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Result returned by the authoritative fare resolver */
export interface FixedFareResult {
  found: true;
  fare: number;
  currency: 'SAR';
  fareType: 'fixed';
  rateId: string;
}

export interface FixedFareNotFound {
  found: false;
  reason: string;
}

export type FareResolution = FixedFareResult | FixedFareNotFound;

/** Shape sent to the server when requesting fare validation */
export interface FareValidationRequest {
  vehicleCategory: VehicleCategory;
  serviceType: ServiceType;
  terminal?: TerminalCode;
}

// ─── End Fixed-Fare Types ───────────────────────────────────────────────────
export type UserStatus = 'active' | 'suspended' | 'deactivated';

export type VehicleType = 'sedan' | 'suv' | 'van' | 'vip_gmc' | 'bus';
export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'inactive';

export type DriverStatus = 'available' | 'assigned' | 'on_trip' | 'busy' | 'offline' | 'on_break' | 'unavailable';

export type BookingType = 'immediate' | 'scheduled';
export type BookingMethod = 'fixed' | 'custom';
export type TripType = 'one_way' | 'round_trip';

export interface IntermediateStop {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
  stop_order: number;
}

export type BookingStatus =
  | 'pending_review'
  | 'pending_verification'
  | 'payment_rejected'
  | 'payment_verified'
  | 'pending'
  | 'confirmed'
  | 'searching'
  | 'driver_assigned'
  | 'accepted'
  | 'driver_accepted'
  | 'on_the_way'
  | 'driver_arriving'
  | 'arrived'
  | 'driver_arrived'
  | 'started'
  | 'trip_started'
  | 'ride_started'
  | 'completed'
  | 'trip_completed'
  | 'ride_completed'
  | 'cancelled'
  | 'rejected'
  | 'no_show'
  | 'payment_pending'
  | 'payment_completed';

export type PaymentMethod = 'cash' | 'online' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'failed' | 'refunded';

export type AdditionalChargeType = 'waiting' | 'parking' | 'toll' | 'extra_luggage' | 'special_service';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  status: UserStatus;
  preferred_language?: 'en' | 'ar' | string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  customer_id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url?: string | null;
  base_price: number;
  vehicle_type: VehicleType;
  features: string[];
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  emergency_contact?: string | null;
  preferred_language: string;
  notes?: string | null;
  created_at: string;
  profile?: Profile;
  emergency_contacts?: EmergencyContact[];
}

export interface Vehicle {
  id: string;
  plate_number: string;
  license_plate?: string | null;
  make: string;
  model: string;
  year?: number | null;
  vehicle_type: VehicleType;
  color?: string | null;
  seating_capacity: number;
  status: VehicleStatus;
  insurance_expiry?: string | null;
  inspection_expiry?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  license_number?: string | null;
  national_id?: string | null;
  assigned_vehicle_id?: string | null;
  status: DriverStatus;
  rating: number | null;
  rating_count?: number;
  total_rides: number;
  total_earnings: number;
  cash_collected: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  assigned_vehicle?: Vehicle | null;
  vehicle?: Vehicle | null;
  location?: DriverLocation | null;
}

export interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

export interface FareRule {
  id: string;
  vehicle_type: VehicleType;
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  waiting_charge_per_min: number;
  minimum_fare: number;
  cancellation_fee: number;
  is_active: boolean;
  created_at: string;
}

export interface FixedRoute {
  id: string;
  route_name: string;
  origin_name: string;
  destination_name: string;
  vehicle_type: VehicleType;
  fixed_fare: number;
  estimated_distance_km: number;
  is_active: boolean;
}

export interface AdditionalCharge {
  id: string;
  booking_id: string;
  charge_type: AdditionalChargeType;
  amount: number;
  description?: string | null;
  added_by?: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id?: string | null;
  passenger_name: string;
  passenger_phone: string;
  booking_type: BookingType;
  booking_method?: BookingMethod;
  trip_type?: TripType;
  intermediate_stops?: IntermediateStop[];
  status: BookingStatus;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  scheduled_at?: string | null;
  return_scheduled_at?: string | null;
  vehicle_type: VehicleType;
  // Fixed-fare fields
  vehicle_category?: VehicleCategory | null;
  service_type?: ServiceType | null;
  terminal?: TerminalCode;
  fixed_fare_amount?: number | null;
  fare_rate_id?: string | null;
  assigned_driver_id?: string | null;
  passenger_count: number;
  notes?: string | null;
  special_instructions?: string | null;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare?: number | null;
  final_fare?: number | null;
  confirmed_fare?: number | null;
  dispatcher_notes?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  payment_screenshot_url?: string | null;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_rejected_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  driver?: Driver | null;
  customer?: Profile | null;
  additional_charges?: AdditionalCharge[];
  payment?: Payment | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  customer_id?: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_reference?: string | null;
  collected_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  fare_breakdown: {
    base_fare?: number;
    distance_charge?: number;
    time_charge?: number;
    vehicle_multiplier?: number;
    extra_charges?: { type: string; amount: number; description?: string }[];
  };
  subtotal: number;
  taxes: number;
  additional_charges: number;
  discount: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'void';
  created_at: string;
  booking?: Booking;
}

export interface RatingFeedback {
  id: string;
  booking_id: string;
  customer_id?: string | null;
  driver_id?: string | null;
  rating: number;
  feedback?: string | null;
  category: 'rating' | 'complaint' | 'suggestion';
  created_at: string;
  booking?: Booking | {
    booking_reference?: string;
    pickup_address?: string;
    destination_address?: string;
    passenger_name?: string;
    created_at?: string;
  } | null;
  customer?: Profile | {
    full_name?: string;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
  driver?: Driver | {
    id?: string;
    rating?: number | null;
    total_rides?: number;
    profile?: {
      full_name?: string;
      avatar_url?: string | null;
    } | null;
  } | null;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description?: string | null;
  cost: number;
  service_date: string;
  next_service_date?: string | null;
  status: 'completed' | 'scheduled' | 'in_progress';
  created_at: string;
  vehicle?: Vehicle;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity: string;
  details: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
  user?: Profile;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  company_tagline: string;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  address: string;
  currency: string;
  tax_percentage: number;
  updated_at: string;
}

export type SavedPlaceType = 'home' | 'work' | 'custom';

export interface SavedPlace {
  id: string;
  customer_id: string;
  name: string;
  type: SavedPlaceType;
  address: string;
  latitude: number;
  longitude: number;
  place_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecentLocation {
  id: string;
  customer_id: string;
  place_id?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  last_used_at: string;
}

export interface LocationPoint {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  polylineCoords?: [number, number][];
  source: 'google' | 'osrm' | 'haversine';
}

export interface DriverSettlement {
  id: string;
  driver_id: string;
  amount: number;
  settlement_reference: string;
  payment_method: 'bank_transfer' | 'cash';
  status: 'pending' | 'completed' | 'cancelled';
  bank_name?: string | null;
  transaction_number?: string | null;
  notes?: string | null;
  processed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverTransactionType = 'ride' | 'settlement';

export interface DriverTransaction {
  id: string;
  type: DriverTransactionType;
  reference: string;
  date: string;
  route: string;
  passenger_name: string;
  vehicle_type: string;
  payment_method: 'cash' | 'online' | 'card' | 'bank_transfer';
  payment_destination: 'company_account' | 'driver_pocket' | 'driver_account';
  payment_method_label: string;
  gross_amount: number;
  deduction_amount: number;
  net_amount: number;
  status: string;
  payment_status: string;
  notes?: string | null;
  booking_id?: string;
  additional_charges?: number;
}

export interface DriverEarningsSummary {
  driver_id: string;
  currency: string;
  gross_earnings: number;
  cash_collection: number;
  total_deductions: number;
  net_earnings: number;
  paid_via_bank: number;
  paid_via_cash_settlement: number;
  remaining_payable: number;
  cash_due_to_company: number;
  completed_rides_count: number;
  commission_rate: number;
  settlements_count: number;
}


