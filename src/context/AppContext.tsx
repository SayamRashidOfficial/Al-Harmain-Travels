'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Booking,
  Driver,
  Vehicle,
  SystemSettings,
  UserRole,
  UserStatus,
  Profile,
  BookingStatus,
  DriverStatus,
  AdditionalCharge,
  RatingFeedback,
  VehicleType,
  ServiceItem,
  EmergencyContact,
  SavedPlace,
  RecentLocation,
  FixedFareRate,
  TerminalCode,
  RateVehicleType,
  RateServiceType,
  RateRoute,
  RateTerminal,
  DriverLocation,
  DriverSettlement,
} from '@/types';
import {
  INITIAL_SETTINGS,
  FALLBACK_GUEST_PROFILE,
} from '@/lib/mock-data';
import {
  getAllRatesAsObjects,
  CANONICAL_RATE_VEHICLES,
  CANONICAL_RATE_SERVICES,
  CANONICAL_RATE_ROUTES,
  CANONICAL_RATE_TERMINALS,
} from '@/lib/fixed-fare';
import { generateBookingReference, formatCurrency } from '@/lib/utils';
import { calculateEstimatedFare } from '@/lib/fare-calculator';
import { calculateDistanceKm, estimateDurationMinutes } from '@/lib/geo';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  checkDriverOverlap,
  isBookingActive,
  isBookingCompleted,
  isBookingCancelled,
  isBookingForCustomer,
  isCashBooking,
  isCashPaid,
} from '@/lib/assignment-utils';
import {
  calculateDriverRating,
  calculateDriverCompletedRides,
  resolveDriverVehicle,
} from '@/lib/driver-stats';
import { isValidCoordinate } from '@/lib/maps/location-service';

// Location write throttling map (driverId -> last written payload & timestamp)
const locationThrottleMap = new Map<
  string,
  {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: number;
    timer?: ReturnType<typeof setTimeout>;
  }
>();

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'ride';
  role?: UserRole;
}

export interface VerificationState {
  fullName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  emailSentAt: number;
}

interface AppContextType {
  // Authentication & RBAC
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: Profile;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  verificationState: VerificationState | null;
  signUpCustomer: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }>;
  resendEmailConfirmation: (email?: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailVerification: () => Promise<boolean>;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; role?: UserRole; requiresVerification?: boolean; email?: string; error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;

  // Profile & Emergency Contacts
  emergencyContacts: EmergencyContact[];
  updateUserProfile: (updates: Partial<Profile>) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<string | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => Promise<boolean>;
  deleteEmergencyContact: (id: string) => Promise<boolean>;
  setPrimaryEmergencyContact: (id: string) => Promise<boolean>;

  // Saved Places & Recent Locations
  savedPlaces: SavedPlace[];
  recentLocations: RecentLocation[];
  addSavedPlace: (place: Omit<SavedPlace, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => Promise<SavedPlace>;
  updateSavedPlace: (id: string, updates: Partial<SavedPlace>) => Promise<boolean>;
  deleteSavedPlace: (id: string) => Promise<boolean>;
  addRecentLocation: (location: { address: string; latitude: number; longitude: number; place_id?: string | null }) => Promise<void>;
  clearRecentLocations: () => Promise<void>;

  // Data Collections & Loading State
  isDataLoading: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  usersList: Profile[];
  settings: SystemSettings;
  ratings: RatingFeedback[];
  notifications: NotificationItem[];

  // Settings & Notifications
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'ride', role?: UserRole) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Services Management (Admin / CMS)
  addService: (service: Omit<ServiceItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateService: (id: string, service: Partial<ServiceItem>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleServiceActive: (id: string) => Promise<void>;

  // Fixed Fare Rates Management (Admin & Live Customer Booking)
  fixedFareRates: FixedFareRate[];
  addFixedFareRate: (rate: Omit<FixedFareRate, 'id' | 'created_at' | 'updated_at'>) => Promise<FixedFareRate>;
  addBulkFixedFareRates: (payload: {
    service_type: string;
    terminal?: TerminalCode | string | null;
    is_active?: boolean;
    rates: Array<{ vehicle_category: string; fare_amount: number; id?: string }>;
  }) => Promise<{ success: boolean; rates?: FixedFareRate[]; error?: string }>;
  updateFixedFareRate: (id: string, updates: Partial<FixedFareRate>) => Promise<boolean>;
  deleteFixedFareRate: (id: string) => Promise<boolean>;
  toggleFixedFareRateStatus: (id: string) => Promise<boolean>;

  // Rate Master Configuration Models (Vehicles, Capacities, Services, Routes, Terminals)
  rateVehicles: RateVehicleType[];
  rateServices: RateServiceType[];
  rateRoutes: RateRoute[];
  rateTerminals: RateTerminal[];

  addRateVehicle: (vehicle: Omit<RateVehicleType, 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; vehicle?: RateVehicleType }>;
  updateRateVehicle: (id: string, updates: Partial<RateVehicleType>) => Promise<{ success: boolean; error?: string; vehicle?: RateVehicleType }>;
  deleteRateVehicle: (id: string) => Promise<{ success: boolean; error?: string; canDeactivate?: boolean; linkedBookings?: number }>;

  addRateService: (service: Omit<RateServiceType, 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; service?: RateServiceType }>;
  updateRateService: (id: string, updates: Partial<RateServiceType>) => Promise<{ success: boolean; error?: string; service?: RateServiceType }>;
  deleteRateService: (id: string) => Promise<{ success: boolean; error?: string }>;

  addRateRoute: (route: Omit<RateRoute, 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; route?: RateRoute }>;
  updateRateRoute: (id: string, updates: Partial<RateRoute>) => Promise<{ success: boolean; error?: string; route?: RateRoute }>;
  deleteRateRoute: (id: string) => Promise<{ success: boolean; error?: string; canDeactivate?: boolean; linkedBookings?: number }>;

  addRateTerminal: (terminal: Omit<RateTerminal, 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; terminal?: RateTerminal }>;
  updateRateTerminal: (id: string, updates: Partial<RateTerminal>) => Promise<{ success: boolean; error?: string; terminal?: RateTerminal }>;
  deleteRateTerminal: (id: string) => Promise<{ success: boolean; error?: string; canDeactivate?: boolean; linkedBookings?: number }>;

  // User Management (Admin)
  adminCreateUser: (data: {
    role: UserRole;
    full_name: string;
    email: string;
    phone: string;
    password?: string;
    email_verified?: boolean;
    status?: UserStatus;
    license_number?: string;
    national_id?: string;
    assigned_vehicle_id?: string;
    avatar_url?: string;
  }) => Promise<{ success: boolean; user?: Profile; error?: string; generatedPassword?: string }>;
  adminUpdateUser: (userId: string, data: {
    full_name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
    email_verified?: boolean;
    phone_verified?: boolean;
    license_number?: string;
    national_id?: string;
    assigned_vehicle_id?: string | null;
    password?: string;
    avatar_url?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  adminAssignVehicle: (driverId: string, vehicleId: string | null) => Promise<{ success: boolean; error?: string }>;
  createStaffAccount: (data: { full_name: string; email: string; phone: string }) => Promise<Profile>;
  createDriverAccount: (data: { full_name: string; email: string; phone: string; license_number: string; vehicle_id?: string }) => Promise<Profile>;
  toggleUserStatus: (id: string) => Promise<void> | void;
  deleteUser: (id: string, force?: boolean) => Promise<boolean>;
  uploadDriverAvatar: (file: File, driverId?: string) => Promise<string | null>;
  uploadCustomerAvatar: (file: File, customerId?: string) => Promise<string | null>;

  // Vehicle Management (Admin)
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;

  // Booking Actions & Lifecycle
  uploadPaymentScreenshot: (file: File) => Promise<string | null>;
  uploadCustomerPaymentProof: (bookingId: string, file: File) => Promise<boolean>;
  createBooking: (data: {
    passenger_name: string;
    passenger_phone: string;
    booking_type: 'immediate' | 'scheduled';
    booking_method?: 'fixed' | 'custom';
    trip_type?: 'one_way' | 'round_trip';
    intermediate_stops?: import('@/types').IntermediateStop[];
    return_scheduled_at?: string;
    pickup_address: string;
    pickup_latitude: number;
    pickup_longitude: number;
    destination_address: string;
    destination_latitude: number;
    destination_longitude: number;
    vehicle_type: VehicleType;
    passenger_count: number;
    notes?: string;
    scheduled_at?: string;
    payment_screenshot_url?: string;
    // Fixed-fare fields (optional — legacy or custom bookings won't have these)
    vehicle_category?: string | null;
    service_type?: string | null;
    terminal?: string | null;
    fixed_fare_amount?: number | null;
    fare_rate_id?: string | null;
    // Dispatcher & Custom extensions
    customer_id?: string | null;
    custom_fare?: number | null;
    initial_status?: BookingStatus;
    payment_method?: 'cash' | 'online' | 'card';
    dispatcher_notes?: string | null;
  }) => Promise<Booking>;

  confirmBooking: (bookingId: string) => Promise<void>;
  verifyPayment: (bookingId: string) => Promise<void>;
  confirmCashReceived: (bookingId: string, driverId?: string) => Promise<{ success: boolean; error?: string }>;
  rejectPayment: (bookingId: string, reason: string) => Promise<void>;
  rejectBooking: (bookingId: string, reason: string) => Promise<void>;
  setCustomBookingFare: (bookingId: string, fare: number, dispatcherNotes?: string) => Promise<void>;
  assignDriver: (bookingId: string, driverId: string) => Promise<boolean>;
  reassignDriver: (bookingId: string, driverId: string) => Promise<boolean>;
  autoAssignDriver: (bookingId: string) => Promise<boolean>;
  searchAndMatchDriver: (
    bookingId: string,
    vehicleType?: VehicleType
  ) => Promise<{
    success: boolean;
    matched: boolean;
    driver?: any;
    vehicle?: any;
    etaMinutes?: number;
    etaFormatted?: string;
    message?: string;
  }>;
  driverAcceptBooking: (bookingId: string) => Promise<void>;
  driverRejectBooking: (bookingId: string, reason?: string) => Promise<void>;
  driverUpdateRideStatus: (
    bookingId: string,
    status:
      | 'accepted'
      | 'driver_accepted'
      | 'on_the_way'
      | 'driver_arriving'
      | 'arrived'
      | 'driver_arrived'
      | 'started'
      | 'trip_started'
      | 'completed'
      | 'trip_completed'
  ) => Promise<{ success: boolean; error?: string } | void>;
  startTrip: (bookingId: string) => Promise<void>;
  completeTrip: (bookingId: string) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: BookingStatus, notes?: string) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;

  // Driver Actions
  updateDriverStatus: (driverId: string, status: DriverStatus) => void;
  updateDriverLocation: (driverId: string, lat: number, lng: number, heading?: number, speed?: number) => void;
  addAdditionalCharge: (bookingId: string, charge: Omit<AdditionalCharge, 'id' | 'booking_id' | 'created_at'>) => void;

  // Payments & Ratings
  recordPayment: (bookingId: string, method: 'cash' | 'online' | 'card', amount: number) => void;
  submitRating: (
    data: Omit<RatingFeedback, 'id' | 'created_at'>
  ) => Promise<{ success: boolean; alreadyRated?: boolean; message?: string; rating?: RatingFeedback; error?: string }>;

  // Driver Settlements
  driverSettlements: DriverSettlement[];
  createDriverSettlement: (data: {
    driver_id: string;
    amount: number;
    payment_method?: 'bank_transfer' | 'cash';
    bank_name?: string;
    transaction_number?: string;
    notes?: string;
  }) => Promise<{ success: boolean; settlement?: DriverSettlement; error?: string }>;

  // Helper getters
  activeCustomerBooking?: Booking;
  activeDriverBooking?: Booking;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Authentication & User State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [currentUser, setCurrentUser] = useState<Profile>(FALLBACK_GUEST_PROFILE);

  // Verification state for customer registration (email-only flow)
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);

  // Core Data & Loading State
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [fixedFareRates, setFixedFareRates] = useState<FixedFareRate[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('alharmain_fixed_fare_rates');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return getAllRatesAsObjects();
  });

  const [rateVehicles, setRateVehicles] = useState<RateVehicleType[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('alharmain_rate_vehicles');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return CANONICAL_RATE_VEHICLES;
  });

  const [rateServices, setRateServices] = useState<RateServiceType[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('alharmain_rate_services');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return CANONICAL_RATE_SERVICES;
  });

  const [rateRoutes, setRateRoutes] = useState<RateRoute[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('alharmain_rate_routes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return CANONICAL_RATE_ROUTES;
  });

  const [rateTerminals, setRateTerminals] = useState<RateTerminal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('alharmain_rate_terminals');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return CANONICAL_RATE_TERMINALS;
  });

  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [ratings, setRatings] = useState<RatingFeedback[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [driverSettlements, setDriverSettlements] = useState<DriverSettlement[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Sync data from Supabase without falling back to mock records.
  // Accepts an optional authenticatedUserId so customer-scoped queries
  // (emergency_contacts, saved_places, recent_locations) are always filtered
  // to the currently signed-in user rather than fetching all rows.
  const fetchRemoteData = useCallback(async (authenticatedUserId?: string) => {
    setIsDataLoading(true);
    setDataError(null);
    try {
      // Resolve the effective user ID: prefer the explicitly passed value,
      // then fall back to the session (handles fresh sign-in where React state
      // may not yet reflect the new user ID due to closure staleness).
      let effectiveUserId = authenticatedUserId;
      if (!effectiveUserId || effectiveUserId === 'guest') {
        try {
          const { data: sess } = await supabase.auth.getSession();
          if (sess?.session?.user?.id) {
            effectiveUserId = sess.session.user.id;
          }
        } catch { /* non-fatal: fall through to unfiltered queries */ }
      }

      const isValidUser = !!effectiveUserId && effectiveUserId !== 'guest';

      // Build customer-scoped queries only when we have a real user ID.
      // Without a valid user, return empty arrays so the UI correctly shows
      // an empty state rather than either erroring or leaking other users' data.
      const contactsQuery = isValidUser
        ? supabase.from('emergency_contacts').select('*').eq('customer_id', effectiveUserId)
        : Promise.resolve({ data: [], error: null });

      const placesQuery = isValidUser
        ? supabase.from('saved_places').select('*').eq('customer_id', effectiveUserId).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const recentsQuery = isValidUser
        ? supabase.from('recent_locations').select('*').eq('customer_id', effectiveUserId).order('last_used_at', { ascending: false }).limit(8)
        : Promise.resolve({ data: [], error: null });

      const notifsQuery = isValidUser
        ? supabase.from('notifications').select('*').or(`user_id.eq.${effectiveUserId},user_id.is.null`).order('created_at', { ascending: false }).limit(40)
        : supabase.from('notifications').select('*').is('user_id', null).order('created_at', { ascending: false }).limit(40);

      const [
        { data: dbServices, error: errServices },
        { data: dbProfiles, error: errProfiles },
        { data: dbContacts, error: errContacts },
        { data: dbSettings, error: errSettings },
        { data: dbVehicles, error: errVehicles },
        { data: dbPlaces, error: errPlaces },
        { data: dbRecents, error: errRecents },
        { data: dbNotifs },
        { data: dbDrivers, error: errDrivers },
        { data: dbBookings, error: errBookings },
        { data: dbFixedRates, error: errFixedRates },
        { data: dbRateVehicles },
        { data: dbRateServices },
        { data: dbRateRoutes },
        { data: dbRateTerminals },
        { data: dbRatings },
        { data: dbSettlements },
      ] = await Promise.all([
        supabase.from('services').select('*').order('display_order', { ascending: true }),
        supabase.from('profiles').select('*'),
        contactsQuery,
        supabase.from('system_settings').select('*').maybeSingle(),
        supabase.from('vehicles').select('*'),
        placesQuery,
        recentsQuery,
        notifsQuery,
        supabase.from('drivers').select(`
          *,
          profile:profiles(*),
          assigned_vehicle:rate_vehicle_types(*),
          location:driver_locations(*)
        `),
        supabase.from('bookings').select(`
          *,
          driver:drivers(*, profile:profiles(*), assigned_vehicle:rate_vehicle_types(*), location:driver_locations(*)),
          payments(*)
        `).order('created_at', { ascending: false }),
        supabase.from('fixed_fare_rates').select('*').order('created_at', { ascending: true }),
        supabase.from('rate_vehicle_types').select('*').order('display_order', { ascending: true }),
        supabase.from('rate_service_types').select('*').order('display_order', { ascending: true }),
        supabase.from('rate_routes').select('*').order('display_order', { ascending: true }),
        supabase.from('rate_terminals').select('*').order('display_order', { ascending: true }),
        supabase.from('ratings_feedback').select('*').order('created_at', { ascending: false }),
        supabase.from('driver_settlements').select('*').order('created_at', { ascending: false }),
      ]);

      if (dbSettlements) {
        setDriverSettlements(dbSettlements as DriverSettlement[]);
      }

      if (dbRatings) {
        setRatings(dbRatings as RatingFeedback[]);
      }

      if (dbFixedRates && dbFixedRates.length > 0) {
        setFixedFareRates(dbFixedRates as FixedFareRate[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_fixed_fare_rates', JSON.stringify(dbFixedRates));
          } catch {}
        }
      }

      if (dbRateVehicles && dbRateVehicles.length > 0) {
        setRateVehicles(dbRateVehicles as RateVehicleType[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_rate_vehicles', JSON.stringify(dbRateVehicles));
          } catch {}
        }
      }

      if (dbRateServices && dbRateServices.length > 0) {
        setRateServices(dbRateServices as RateServiceType[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_rate_services', JSON.stringify(dbRateServices));
          } catch {}
        }
      }

      if (dbRateRoutes && dbRateRoutes.length > 0) {
        setRateRoutes(dbRateRoutes as RateRoute[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_rate_routes', JSON.stringify(dbRateRoutes));
          } catch {}
        }
      }

      if (dbRateTerminals && dbRateTerminals.length > 0) {
        setRateTerminals(dbRateTerminals as RateTerminal[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_rate_terminals', JSON.stringify(dbRateTerminals));
          } catch {}
        }
      }

      if (dbServices) setServices(dbServices as ServiceItem[]);
      // Always replace usersList with the current Supabase result.
      // An empty array is a valid response (no profiles) and must replace any stale state.
      // If there's an error, clear usersList to avoid showing deleted/stale records.
      if (!errProfiles) {
        setUsersList(dbProfiles as Profile[] ?? []);
      } else {
        setUsersList([]);
      }
      if (dbContacts) setEmergencyContacts(dbContacts as EmergencyContact[]);
      if (dbSettings) setSettings((prev) => ({ ...prev, ...dbSettings }));
      if (dbVehicles) setVehicles(dbVehicles as Vehicle[]);
      if (dbPlaces) setSavedPlaces(dbPlaces as SavedPlace[]);
      if (dbRecents) setRecentLocations(dbRecents as RecentLocation[]);
      if (dbNotifs && dbNotifs.length > 0) {
        setNotifications(
          (dbNotifs as any[]).map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timestamp: n.created_at,
            read: n.read ?? false,
            type: (n.type as any) || 'info',
            role: n.role as UserRole | undefined,
          }))
        );
      }

      const allRatings: RatingFeedback[] = (dbRatings as RatingFeedback[]) || [];
      const currentRateVehs: RateVehicleType[] = (dbRateVehicles && dbRateVehicles.length > 0)
        ? (dbRateVehicles as RateVehicleType[])
        : rateVehicles;
      const currentVehicles: Vehicle[] = (dbVehicles && dbVehicles.length > 0)
        ? (dbVehicles as Vehicle[])
        : vehicles;
      const rawBookings: Booking[] = (dbBookings as Booking[]) || [];

      let mappedDrivers: Driver[] = [];
      if (dbDrivers) {
        mappedDrivers = (dbDrivers as any[]).map((d) => {
          const prof = (dbProfiles as Profile[] || []).find((p) => p.id === d.id) || d.profile;
          const completedRides = calculateDriverCompletedRides(rawBookings, d.id);
          const ratingStats = calculateDriverRating(allRatings, d.id);
          const resolvedVeh = resolveDriverVehicle(d.assigned_vehicle_id, currentRateVehs, currentVehicles);

          const rawLoc = Array.isArray(d.location) ? d.location[0] : d.location;
          const cleanLoc: DriverLocation | null =
            rawLoc &&
            !isNaN(Number(rawLoc.latitude)) &&
            !isNaN(Number(rawLoc.longitude)) &&
            isValidCoordinate(Number(rawLoc.latitude), Number(rawLoc.longitude))
              ? {
                  driver_id: rawLoc.driver_id || d.id,
                  latitude: Number(rawLoc.latitude),
                  longitude: Number(rawLoc.longitude),
                  heading: Number(rawLoc.heading || 0),
                  speed: Number(rawLoc.speed || 0),
                  updated_at: rawLoc.updated_at || d.updated_at || new Date().toISOString(),
                }
              : null;

          return {
            ...d,
            profile: prof || d.profile,
            full_name: prof?.full_name || d.full_name || d.profile?.full_name || 'Captain',
            phone: prof?.phone || d.phone || d.profile?.phone || null,
            avatar_url: prof?.avatar_url || d.avatar_url || d.profile?.avatar_url || null,
            rating: ratingStats.rating,
            rating_count: ratingStats.count,
            total_rides: completedRides,
            assigned_vehicle: resolvedVeh || d.assigned_vehicle,
            vehicle: resolvedVeh || d.vehicle,
            location: cleanLoc,
          };
        });
        setDrivers(mappedDrivers);
      }

      if (dbBookings) {
        const uniqueMap = new Map<string, Booking>();
        for (const rawB of dbBookings as any[]) {
          if (rawB.id && !uniqueMap.has(rawB.id)) {
            const b = { ...rawB };
            if (b.assigned_driver_id && mappedDrivers.length > 0) {
              const matchedD = mappedDrivers.find((d) => d.id === b.assigned_driver_id);
              if (matchedD) {
                b.driver = matchedD;
              }
            }
            if (rawB.payments && Array.isArray(rawB.payments) && rawB.payments.length > 0) {
              b.payment = rawB.payments[0];
            }
            uniqueMap.set(b.id, b as Booking);
          }
        }
        setBookings(Array.from(uniqueMap.values()));
      }

      const anyError =
        errServices ||
        errProfiles ||
        errContacts ||
        errSettings ||
        errVehicles ||
        errPlaces ||
        errRecents ||
        errDrivers ||
        errBookings;
      if (anyError) {
        console.warn('Supabase data query warning:', anyError.message);
      }
    } catch (err: any) {
      console.error('Error fetching Supabase data:', err);
      setDataError(err?.message || 'Failed to load transportation records.');
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Sync initial data and subscribe to real-time updates
  useEffect(() => {
    fetchRemoteData();

    // Listen to real-time driver locations
    const locationChannel = supabase
      .channel('public:driver_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
        if (payload.new && 'driver_id' in payload.new) {
          const updated = payload.new as {
            driver_id: string;
            latitude: number;
            longitude: number;
            heading?: number;
            speed?: number;
            updated_at?: string;
          };
          const numLat = Number(updated.latitude);
          const numLng = Number(updated.longitude);
          if (!isValidCoordinate(numLat, numLng)) return;

          const nowStr = updated.updated_at || new Date().toISOString();
          const cleanLoc: DriverLocation = {
            driver_id: updated.driver_id,
            latitude: numLat,
            longitude: numLng,
            heading: Number(updated.heading || 0),
            speed: Number(updated.speed || 0),
            updated_at: nowStr,
          };

          setDrivers((prev) =>
            prev.map((d) =>
              d.id === updated.driver_id
                ? {
                  ...d,
                  location: cleanLoc,
                }
                : d
            )
          );

          setBookings((prev) =>
            prev.map((b) =>
              b.assigned_driver_id === updated.driver_id
                ? {
                  ...b,
                  driver: b.driver
                    ? {
                      ...b.driver,
                      location: cleanLoc,
                    }
                    : b.driver,
                }
                : b
            )
          );
        }
      })
      .subscribe();

    // Listen to real-time booking status & driver assignment updates
    const bookingsChannel = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
          return;
        }

        if (payload.new && 'id' in payload.new) {
          const updated = payload.new as any;
          setBookings((prev) => {
            const existingIndex = prev.findIndex(
              (b) => b.id === updated.id || (updated.booking_reference && b.booking_reference === updated.booking_reference)
            );
            if (existingIndex >= 0) {
              const existing = prev[existingIndex];
              // Keep driver and vehicle relations intact or resolve driver
              let attachedDriver = existing.driver;
              if (updated.assigned_driver_id && (!attachedDriver || attachedDriver.id !== updated.assigned_driver_id)) {
                attachedDriver = drivers.find((d) => d.id === updated.assigned_driver_id) || attachedDriver;
              } else if (updated.assigned_driver_id === null) {
                attachedDriver = null as any;
              }
              const merged: Booking = {
                ...existing,
                ...updated,
                id: updated.id,
                driver: attachedDriver,
                updated_at: updated.updated_at || new Date().toISOString(),
              };
              const copy = [...prev];
              copy[existingIndex] = merged;
              return copy;
            } else {
              let attachedDriver = null;
              if (updated.assigned_driver_id) {
                attachedDriver = drivers.find((d) => d.id === updated.assigned_driver_id) || null;
              }
              const newBookingRecord: Booking = {
                ...(updated as Booking),
                driver: attachedDriver as any,
              };
              return [newBookingRecord, ...prev];
            }
          });
        }
      })
      .subscribe();

    // Listen to real-time driver updates (status, vehicle assignment)
    const driversChannel = supabase
      .channel('public:drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) setDrivers((prev) => prev.filter((d) => d.id !== deletedId));
          return;
        }
        if (payload.new && 'id' in payload.new) {
          const updatedD = payload.new as any;
          setDrivers((prev) =>
            prev.map((d) => (d.id === updatedD.id ? { ...d, ...updatedD } : d))
          );
        }
      })
      .subscribe();

    // Listen to real-time payments updates
    const paymentsChannel = supabase
      .channel('public:payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        if (payload.new && 'booking_id' in payload.new) {
          const p = payload.new as any;
          setBookings((prev) =>
            prev.map((b) => {
              if (b.id === p.booking_id) {
                return {
                  ...b,
                  payment_status: p.status === 'paid' ? 'paid' : (p.status === 'failed' ? 'failed' : b.payment_status),
                  payment: {
                    id: p.id,
                    booking_id: p.booking_id,
                    customer_id: p.customer_id,
                    amount: p.amount,
                    method: p.method,
                    status: p.status,
                    transaction_reference: p.transaction_reference,
                    collected_by: p.collected_by,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                  },
                };
              }
              return b;
            })
          );
        }
      })
      .subscribe();

    // Listen to real-time profile changes (INSERT, UPDATE, DELETE)
    // This ensures that when a customer/user is deleted from Supabase,
    // they immediately disappear from all frontend lists without a page refresh.
    const profilesChannel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, (payload) => {
        const deletedId = (payload.old as any)?.id;
        if (deletedId) {
          // Remove from usersList immediately
          setUsersList((prev) => prev.filter((u) => u.id !== deletedId));
          // Also remove any driver whose profile was deleted
          setDrivers((prev) => prev.filter((d) => d.id !== deletedId && d.profile?.id !== deletedId));
          // If the currently active user was deleted from the database, force immediate sign out
          setCurrentUser((current) => {
            if (current && current.id === deletedId) {
              supabase.auth.signOut().catch(() => { });
              setIsAuthenticated(false);
              setUserRole('customer');
              syncRoleCookie(null);
              toast.error('Your profile was deleted. You have been signed out.');
              if (typeof window !== 'undefined') {
                window.location.href = '/sign-in';
              }
              return FALLBACK_GUEST_PROFILE;
            }
            return current;
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new && 'id' in payload.new) {
          const newProfile = payload.new as Profile;
          setUsersList((prev) => {
            // Avoid duplicates (e.g. optimistic insert already applied)
            if (prev.some((u) => u.id === newProfile.id)) {
              return prev.map((u) => (u.id === newProfile.id ? { ...u, ...newProfile } : u));
            }
            return [newProfile, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new && 'id' in payload.new) {
          const updatedProfile = payload.new as Profile;
          // If the active user has been deactivated or suspended
          if (updatedProfile.status === 'deactivated' || updatedProfile.status === 'suspended') {
            setCurrentUser((current) => {
              if (current && current.id === updatedProfile.id) {
                supabase.auth.signOut().catch(() => { });
                setIsAuthenticated(false);
                setUserRole('customer');
                syncRoleCookie(null);
                toast.error(`Your account has been ${updatedProfile.status}. Access denied.`);
                if (typeof window !== 'undefined') {
                  window.location.href = '/sign-in';
                }
                return FALLBACK_GUEST_PROFILE;
              }
              return current;
            });
          }
          setUsersList((prev) =>
            prev.map((u) => (u.id === updatedProfile.id ? { ...u, ...updatedProfile } : u))
          );
          // Keep driver profile in sync
          setDrivers((prev) =>
            prev.map((d) =>
              d.id === updatedProfile.id || d.profile?.id === updatedProfile.id
                ? { ...d, profile: { ...(d.profile || {}), ...updatedProfile } }
                : d
            )
          );
        }
      })
      .subscribe();

    // Listen to real-time fixed fare rates and rate configuration changes
    const ratesChannel = supabase
      .channel('public:rate_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_fare_rates' }, () => {
        fetchRemoteData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_vehicle_types' }, () => {
        fetchRemoteData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_service_types' }, () => {
        fetchRemoteData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_routes' }, () => {
        fetchRemoteData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_terminals' }, () => {
        fetchRemoteData();
      })
      .subscribe();

    // Listen to real-time notifications
    const notifsChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const n = payload.new as any;
          setNotifications((prev) => [
            {
              id: n.id,
              title: n.title,
              message: n.message,
              timestamp: n.created_at,
              read: n.read ?? false,
              type: n.type || 'info',
              role: n.role,
            },
            ...prev,
          ]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const n = payload.new as any;
          setNotifications((prev) =>
            prev.map((item) => (item.id === n.id ? { ...item, read: n.read ?? item.read } : item))
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const delId = (payload.old as any).id;
          setNotifications((prev) => prev.filter((item) => item.id !== delId));
        }
      })
      .subscribe();

    // Listen to real-time ratings & reviews
    const ratingsChannel = supabase
      .channel('public:ratings_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings_feedback' }, (payload) => {
        if (payload.new && 'driver_id' in payload.new) {
          const newRating = payload.new as RatingFeedback;
          setRatings((prev) => {
            const nextRatings = [...prev.filter((r) => r.id !== newRating.id), newRating];
            if (newRating.driver_id) {
              const driverStats = calculateDriverRating(nextRatings, newRating.driver_id);
              setDrivers((prevDrivers) =>
                prevDrivers.map((d) =>
                  d.id === newRating.driver_id
                    ? { ...d, rating: driverStats.rating, rating_count: driverStats.count }
                    : d
                )
              );
              setBookings((prevBookings) =>
                prevBookings.map((b) =>
                  b.assigned_driver_id === newRating.driver_id && b.driver
                    ? {
                        ...b,
                        driver: {
                          ...b.driver,
                          rating: driverStats.rating,
                          rating_count: driverStats.count,
                        },
                      }
                    : b
                )
              );
            }
            return nextRatings;
          });
        }
      })
      .subscribe();

    // Listen to real-time driver settlements (payouts)
    const settlementsChannel = supabase
      .channel('public:driver_settlements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_settlements' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setDriverSettlements((prev) => [payload.new as DriverSettlement, ...prev.filter((s) => s.id !== (payload.new as any).id)]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setDriverSettlements((prev) => prev.map((s) => (s.id === (payload.new as any).id ? (payload.new as DriverSettlement) : s)));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setDriverSettlements((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ratesChannel);
      supabase.removeChannel(notifsChannel);
      supabase.removeChannel(ratingsChannel);
      supabase.removeChannel(settlementsChannel);
    };
    // Empty dependency array: channels are set up once on mount and torn down
    // on unmount. Using [drivers] here caused re-subscriptions (and channel
    // leaks) on every driver location update, which is incorrect.
  }, []);

  // Helper to sync role cookie for Next.js middleware and SSR
  const syncRoleCookie = (role?: UserRole | null) => {
    if (typeof document === 'undefined') return;
    if (role) {
      document.cookie = `aht_role=${role}; path=/; max-age=604800; SameSite=Lax`;
      localStorage.setItem('aht_user_role', role);
    } else {
      document.cookie = 'aht_role=; path=/; max-age=0; SameSite=Lax';
      localStorage.removeItem('aht_user_role');
      localStorage.removeItem('aht_demo_user');
    }
  };

  // Sync Supabase Auth session and listen to auth changes
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.error('Session retrieval error:', sessionErr);
        }

        const session = sessionData?.session;
        if (session?.user && isMounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && isMounted) {
            if (profile.status === 'suspended' || profile.status === 'deactivated') {
              await supabase.auth.signOut().catch(() => { });
              setIsAuthenticated(false);
              setCurrentUser(FALLBACK_GUEST_PROFILE);
              setUserRole('customer');
              syncRoleCookie(null);
              return;
            }

            const isConfirmed = !!session.user.email_confirmed_at || !!profile.email_verified;
            const validLang = (profile as any)?.preferred_language === 'ar' ? 'ar' : 'en';
            const updatedProfile: Profile = {
              ...(profile as Profile),
              preferred_language: validLang,
              email_verified: isConfirmed,
            };
            setCurrentUser(updatedProfile);
            if (typeof window !== 'undefined') {
              localStorage.setItem('alharmain_customer_language', validLang);
            }
            setUserRole(updatedProfile.role as UserRole);
            setIsAuthenticated(true);
            syncRoleCookie(updatedProfile.role as UserRole);
            fetchRemoteData(updatedProfile.id);
          } else if (isMounted) {
            // Profile does NOT exist in Supabase profiles table.
            // If user has role metadata in auth.users, upsert into profiles
            const userMetaRole = session.user.user_metadata?.role as UserRole | undefined;
            if (userMetaRole) {
              const newProfile: Profile = {
                id: session.user.id,
                role: userMetaRole,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || '',
                phone: session.user.user_metadata?.phone || '',
                email_verified: !!session.user.email_confirmed_at,
                phone_verified: !!session.user.user_metadata?.phone_verified,
                status: 'active',
                created_at: session.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              await supabase.from('profiles').upsert(newProfile);
              setCurrentUser(newProfile);
              setUserRole(newProfile.role);
              setIsAuthenticated(true);
              syncRoleCookie(newProfile.role);
              fetchRemoteData(newProfile.id);
            } else {
              await supabase.auth.signOut().catch(() => { });
              setIsAuthenticated(false);
              setCurrentUser(FALLBACK_GUEST_PROFILE);
              setUserRole('customer');
              syncRoleCookie(null);
            }
          }
        } else if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(FALLBACK_GUEST_PROFILE);
          setUserRole('customer');
          syncRoleCookie(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/reset-password')) {
          window.location.href = '/reset-password';
        }
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        setIsAuthenticated(false);
        setCurrentUser(FALLBACK_GUEST_PROFILE);
        setUserRole('customer');
        syncRoleCookie(null);
        setIsAuthLoading(false);
        return;
      }

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && isMounted) {
          if (profile.status === 'suspended' || profile.status === 'deactivated') {
            await supabase.auth.signOut().catch(() => { });
            setIsAuthenticated(false);
            setCurrentUser(FALLBACK_GUEST_PROFILE);
            setUserRole('customer');
            syncRoleCookie(null);
          } else {
            const isConfirmed = !!session.user.email_confirmed_at || !!profile.email_verified;
            const validLang = (profile as any)?.preferred_language === 'ar' ? 'ar' : 'en';
            const updatedProfile: Profile = {
              ...(profile as Profile),
              preferred_language: validLang,
              email_verified: isConfirmed,
            };
            setCurrentUser(updatedProfile);
            if (typeof window !== 'undefined') {
              localStorage.setItem('alharmain_customer_language', validLang);
            }
            setUserRole(updatedProfile.role as UserRole);
            setIsAuthenticated(true);
            syncRoleCookie(updatedProfile.role as UserRole);
            fetchRemoteData(updatedProfile.id);
          }
        } else if (isMounted) {
          // Profile was deleted from Supabase: force sign out immediately
          await supabase.auth.signOut().catch(() => { });
          setIsAuthenticated(false);
          setCurrentUser(FALLBACK_GUEST_PROFILE);
          setUserRole('customer');
          syncRoleCookie(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchRemoteData]);

  // Safe role switching: only available to authenticated administrators
  const switchRole = (role: UserRole) => {
    if (currentUser.role === 'admin') {
      setUserRole(role);
      syncRoleCookie(role);
      toast.info(`Admin view switched to ${role.toUpperCase()} portal`);
    } else {
      toast.error('Only administrators can switch portal roles.');
    }
  };

  // Sign In via Supabase Auth
  const signIn = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; role?: UserRole; requiresVerification?: boolean; email?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!password) {
      return { success: false, error: 'Password is required to sign in.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const errMsg = error.message || '';
        const isUnconfirmed =
          errMsg.toLowerCase().includes('email not confirmed') ||
          errMsg.toLowerCase().includes('not confirmed') ||
          errMsg.toLowerCase().includes('email_not_confirmed');

        if (isUnconfirmed) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('aht_pending_verification_email', cleanEmail);
          }
          return {
            success: false,
            requiresVerification: true,
            email: cleanEmail,
            error: 'Your email address is not verified yet. Please check your inbox for the confirmation link or resend it.',
          };
        }

        return {
          success: false,
          error: errMsg || 'Invalid email or password. Please verify your credentials.',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user account found. Please check your credentials or register.',
        };
      }

      // Check if user has confirmed email
      const isEmailConfirmed = !!data.user.email_confirmed_at;
      if (!isEmailConfirmed) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('aht_pending_verification_email', cleanEmail);
        }
        return {
          success: false,
          requiresVerification: true,
          email: cleanEmail,
          error: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
        };
      }

      // Retrieve user profile from PostgreSQL profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        // If profile does not exist in profiles table, link/create from user metadata
        const userMetaRole = (data.user.user_metadata?.role as UserRole) || 'customer';
        const userMetaName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0];
        const newProfile: Profile = {
          id: data.user.id,
          role: userMetaRole,
          full_name: userMetaName,
          email: cleanEmail,
          phone: data.user.user_metadata?.phone || '',
          email_verified: !!data.user.email_confirmed_at,
          phone_verified: !!data.user.user_metadata?.phone_verified,
          status: 'active',
          created_at: data.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabase.from('profiles').upsert(newProfile);
        setUserRole(userMetaRole);
        setCurrentUser(newProfile);
        setIsAuthenticated(true);
        syncRoleCookie(userMetaRole);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('aht_pending_verification_email');
        }
        addNotification('Signed In', `Welcome back, ${userMetaName}`, 'success', userMetaRole);
        return { success: true, role: userMetaRole };
      }

      // Check if user account is deactivated or suspended
      if (profile.status === 'suspended' || profile.status === 'deactivated') {
        await supabase.auth.signOut().catch(() => { });
        setIsAuthenticated(false);
        setCurrentUser(FALLBACK_GUEST_PROFILE);
        setUserRole('customer');
        syncRoleCookie(null);
        return {
          success: false,
          error: `Your account has been ${profile.status}. Please contact administration.`,
        };
      }

      // Ensure profile in database has email_verified set to true
      if (!profile.email_verified) {
        await supabase
          .from('profiles')
          .update({ email_verified: true, updated_at: new Date().toISOString() })
          .eq('id', data.user.id);
        profile.email_verified = true;
      }

      const validLang = (profile as any)?.preferred_language === 'ar' ? 'ar' : 'en';
      profile.preferred_language = validLang;
      setUserRole(profile.role);
      setCurrentUser(profile);
      setIsAuthenticated(true);
      syncRoleCookie(profile.role);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aht_pending_verification_email');
        localStorage.setItem('alharmain_customer_language', validLang);
      }
      addNotification('Signed In', `Welcome back, ${profile.full_name}`, 'success', profile.role);

      return { success: true, role: profile.role };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      return { success: false, error: msg };
    }
  };

  // Sign Up Customer via Supabase Auth
  const signUpCustomer = async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/callback`
        : undefined;

      // ─── Step 1: Pre-check auth.users via server-side API ───────────────────────
      // This is the key fix: checking BOTH auth.users and public.profiles before
      // attempting signUp. The browser client cannot query auth.users directly.
      let checkResult: {
        existsInAuth: boolean;
        authId: string | null;
        emailConfirmed: boolean;
        existsInProfiles: boolean;
        profileVerified: boolean;
        isOrphaned: boolean;
      } | null = null;

      try {
        const checkRes = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          if (checkJson.success) {
            checkResult = checkJson;
          }
        }
      } catch (checkErr) {
        // Non-fatal: if the check API fails, fall through to standard signUp flow
        console.warn('[signUpCustomer] check-user API unavailable, proceeding with signUp:', checkErr);
      }

      if (checkResult) {
        // Case A: Fully verified existing user in both auth and profiles
        if (checkResult.existsInAuth && checkResult.emailConfirmed && checkResult.existsInProfiles && checkResult.profileVerified) {
          return {
            success: false,
            error: 'An account with this email is already registered and verified. Please sign in instead.',
          };
        }

        // Case B: Unconfirmed existing user in auth (with or without a profile row)
        // Re-send confirmation email without creating a duplicate auth user.
        if (checkResult.existsInAuth && !checkResult.emailConfirmed) {
          const { error: resendErr } = await supabase.auth.resend({
            type: 'signup',
            email: cleanEmail,
            options: { emailRedirectTo },
          });

          setVerificationState({
            fullName: data.fullName.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            emailVerified: false,
            emailSentAt: Date.now(),
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem('aht_pending_verification_email', cleanEmail);
          }

          if (resendErr) {
            toast.warning('Account exists but is unverified. Could not resend — please try again shortly.');
          } else {
            toast.info('Account already exists but was unverified. We resent your confirmation link.');
          }

          return {
            success: true,
            requiresVerification: true,
            email: cleanEmail,
          };
        }

        // Case C: Orphaned auth.users row (user was deleted but auth wasn't cleaned up).
        // Delete the stale auth row so a fresh sign up can proceed.
        if (checkResult.isOrphaned && checkResult.authId) {
          try {
            await fetch('/api/admin/delete-user', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: checkResult.authId }),
            });
          } catch (orphanCleanErr) {
            console.warn('[signUpCustomer] Could not clean orphaned auth user, proceeding anyway:', orphanCleanErr);
          }
        }
      }

      // ─── Step 2: Execute fresh Supabase Auth signUp ──────────────────────────────
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: data.fullName.trim(),
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already been registered') ||
          signUpError.message.toLowerCase().includes('user already exists')
        ) {
          return { success: false, error: 'An account with this email already exists. Please sign in.' };
        }
        return { success: false, error: signUpError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed. Please try again.' };
      }

      // ─── Step 3: Handle Supabase's "existing account" signal ─────────────────────
      // Supabase returns an empty identities array when it silently detects an
      // already-registered email. This is a secondary safety net in case our
      // pre-check missed something (e.g. race condition).
      const isExistingAccount = !authData.user.identities || authData.user.identities.length === 0;
      if (isExistingAccount) {
        // The pre-check confirmed the user is in auth; this means they're confirmed.
        return {
          success: false,
          error: 'An account with this email is already registered. Please sign in.',
        };
      }

      const isAlreadyConfirmed = !!authData.user.email_confirmed_at;

      const newVerificationState: VerificationState = {
        fullName: data.fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        emailVerified: isAlreadyConfirmed,
        emailSentAt: Date.now(),
      };
      setVerificationState(newVerificationState);

      if (typeof window !== 'undefined') {
        localStorage.setItem('aht_pending_verification_email', cleanEmail);
        localStorage.setItem('aht_pending_verification_name', data.fullName.trim());
      }

      addNotification(
        'Account Registered',
        `Verification email dispatched to ${cleanEmail}. Please verify your email to access the customer dashboard.`,
        'info',
        'customer'
      );

      return {
        success: true,
        requiresVerification: !isAlreadyConfirmed,
        email: cleanEmail,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during registration.';
      return { success: false, error: msg };
    }
  };

  // Resend confirmation email via Supabase
  const resendEmailConfirmation = async (email?: string): Promise<{ success: boolean; error?: string }> => {
    let targetEmail = email?.trim().toLowerCase() || verificationState?.email || '';
    if (!targetEmail && typeof window !== 'undefined') {
      targetEmail = localStorage.getItem('aht_pending_verification_email') || '';
    }

    if (!targetEmail) {
      return { success: false, error: 'No email address available. Please re-enter your email or restart registration.' };
    }

    // Check if user is already verified
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('email', targetEmail)
      .maybeSingle();

    if (existingProfile?.email_verified) {
      return {
        success: false,
        error: 'This account is already verified! Please proceed to Sign In.',
      };
    }

    if (verificationState?.emailSentAt) {
      const elapsed = (Date.now() - verificationState.emailSentAt) / 1000;
      if (elapsed < 60) {
        const wait = Math.ceil(60 - elapsed);
        return { success: false, error: `Please wait ${wait} seconds before resending another confirmation email.` };
      }
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/callback`
        : undefined;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setVerificationState((prev) =>
        prev
          ? { ...prev, emailSentAt: Date.now() }
          : {
            fullName: (typeof window !== 'undefined' && localStorage.getItem('aht_pending_verification_name')) || 'Customer',
            email: targetEmail,
            phone: '',
            emailVerified: false,
            emailSentAt: Date.now(),
          }
      );

      toast.success('Confirmation email resent. Please check your inbox.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend email.';
      return { success: false, error: msg };
    }
  };

  // Poll Supabase session to check if email has been confirmed
  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user?.email_confirmed_at) {
        setVerificationState((prev) => (prev ? { ...prev, emailVerified: true } : null));
        return true;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.email_confirmed_at) {
        setVerificationState((prev) => (prev ? { ...prev, emailVerified: true } : null));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on sign out
    } finally {
      setIsAuthenticated(false);
      setUserRole('customer');
      setCurrentUser(FALLBACK_GUEST_PROFILE);
      setVerificationState(null);
      syncRoleCookie(null);
      setBookings([]);
      setDrivers([]);
      setEmergencyContacts([]);
      setSavedPlaces([]);
      setRecentLocations([]);
      setNotifications([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aht_user_role');
        localStorage.removeItem('aht_demo_user');
        window.location.href = '/sign-in';
      }
      toast.info('You have been securely signed out.');
    }
  };

  // Profile Management
  const updateUserProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    try {
      const sanitizedLang = updates.preferred_language !== undefined
        ? (updates.preferred_language === 'ar' ? 'ar' : 'en')
        : (currentUser.preferred_language === 'ar' ? 'ar' : 'en');

      const updatedUser: Profile = {
        ...currentUser,
        ...updates,
        preferred_language: sanitizedLang,
        updated_at: new Date().toISOString(),
      };
      setCurrentUser(updatedUser);
      setUsersList((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      // Keep drivers state synchronized with profile updates immediately
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === updatedUser.id || d.profile?.id === updatedUser.id) {
            return {
              ...d,
              full_name: updatedUser.full_name,
              phone: updatedUser.phone,
              avatar_url: updatedUser.avatar_url,
              profile: {
                ...(d.profile || {}),
                ...updatedUser,
              },
            };
          }
          return d;
        })
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('alharmain_customer_language', sanitizedLang);
        localStorage.setItem('alharmain_preferred_language', sanitizedLang);
      }

      // Sync to Supabase profiles
      await supabase.from('profiles').update({
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
        date_of_birth: updatedUser.date_of_birth,
        gender: updatedUser.gender,
        email_verified: updatedUser.email_verified,
        phone_verified: updatedUser.phone_verified,
        preferred_language: sanitizedLang,
        updated_at: updatedUser.updated_at,
      }).eq('id', updatedUser.id);

      // Also sync to customers table if user is a customer
      if (updatedUser.role === 'customer') {
        await supabase.from('customers').upsert({
          id: updatedUser.id,
          preferred_language: sanitizedLang,
        }, { onConflict: 'id' });
      }

      const isLanguageOnlyUpdate = Object.keys(updates).length === 1 && updates.preferred_language !== undefined;
      if (!isLanguageOnlyUpdate) {
        addNotification('Profile Updated', 'Your profile details have been saved successfully.', 'success', currentUser.role);
        toast.success('Profile details saved successfully.');
      }
      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile. Please try again.');
      return false;
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPEG, PNG, or WebP).');
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit. Please choose a smaller photo.');
        return null;
      }

      let publicUrl = '';

      // 1. Try server storage route first (admin service role for resilient avatar uploads)
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser.id);

        const res = await fetch('/api/storage/avatar', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.url) {
          publicUrl = data.url;
        }
      } catch (apiErr) {
        console.warn('API avatar upload failed, trying direct Supabase storage:', apiErr);
      }

      // 2. Direct client storage fallback
      if (!publicUrl) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (!error && data) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        } else {
          // Fallback to Data URL
          publicUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
      }

      await updateUserProfile({ avatar_url: publicUrl });
      toast.success('Profile photo updated successfully!');
      return publicUrl;
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Could not process photo upload. Please try again.');
      return null;
    }
  };

  const uploadPaymentScreenshot = async (file: File): Promise<string | null> => {
    try {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPEG, PNG, or WebP).');
        return null;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit. Please choose a smaller image.');
        return null;
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `receipt-${currentUser.id || 'guest'}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage bucket payment_proofs
      const { data, error } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file, { upsert: true });

      let publicUrl = '';
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('payment_proofs').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } else {
        // Fallback to Data URL
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      return publicUrl;
    } catch (err) {
      console.error('Payment screenshot upload failed:', err);
      try {
        const fallbackDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return fallbackDataUrl;
      } catch {
        toast.error('Could not process receipt upload. Please try again.');
        return null;
      }
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      return { success: false, error: 'Password must contain uppercase letters, lowercase letters, and at least one number.' };
    }

    try {
      if (currentUser.email && currentPassword) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword,
        });
        if (verifyErr && verifyErr.message?.toLowerCase().includes('invalid login credentials')) {
          return { success: false, error: 'Current password is incorrect. Please verify and try again.' };
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      return { success: false, error: msg };
    }

    addNotification('Security Alert', 'Your account password was successfully updated.', 'success', currentUser.role);
    toast.success('Password changed successfully.');
    return { success: true };
  };

  // Emergency Contacts CRUD
  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id' | 'customer_id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      let assignedId = 'emg-' + Date.now();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);

      if (isUuid) {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .insert({
            customer_id: currentUser.id,
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            email: contact.email || null,
            is_primary: contact.is_primary ?? false,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to add emergency contact to Supabase:', error);
          toast.error('Failed to save emergency contact to database.');
          return false;
        }
        if (data?.id) {
          assignedId = data.id;
        }
      }

      const newContact: EmergencyContact = {
        ...contact,
        id: assignedId,
        customer_id: currentUser.id,
        created_at: now,
        updated_at: now,
      };

      setEmergencyContacts((prev) => {
        let updated = [...prev];
        if (newContact.is_primary) {
          updated = updated.map((c) => ({ ...c, is_primary: false }));
        }
        return [newContact, ...updated];
      });

      toast.success('Emergency contact added successfully.');
      return true;
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
      toast.error('Failed to save emergency contact.');
      return false;
    }
  };

  const updateEmergencyContact = async (id: string, updates: Partial<EmergencyContact>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      setEmergencyContacts((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return { ...c, ...updates, updated_at: now };
          }
          if (updates.is_primary && c.id !== id) {
            return { ...c, is_primary: false };
          }
          return c;
        })
      );

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from('emergency_contacts').update({
          ...updates,
          updated_at: now,
        }).eq('id', id);
      }

      toast.success('Emergency contact updated.');
      return true;
    } catch (err) {
      console.error('Failed to update emergency contact:', err);
      toast.error('Failed to update emergency contact.');
      return false;
    }
  };

  const deleteEmergencyContact = async (id: string): Promise<boolean> => {
    try {
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from('emergency_contacts').delete().eq('id', id);
      }
      toast.success('Emergency contact removed.');
      return true;
    } catch (err) {
      console.error('Failed to delete emergency contact:', err);
      toast.error('Failed to remove emergency contact.');
      return false;
    }
  };

  const setPrimaryEmergencyContact = async (id: string): Promise<boolean> => {
    return updateEmergencyContact(id, { is_primary: true });
  };

  // Saved Places CRUD
  const addSavedPlace = async (
    place: Omit<SavedPlace, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
  ): Promise<SavedPlace> => {
    const now = new Date().toISOString();
    let assignedId = 'sp-' + Date.now();
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);

    if (isUserUuid) {
      try {
        const { data, error } = await supabase
          .from('saved_places')
          .insert({
            customer_id: currentUser.id,
            name: place.name,
            type: place.type,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            place_id: place.place_id || null,
          })
          .select()
          .single();

        if (data?.id) {
          assignedId = data.id;
        }
      } catch (err) {
        console.warn('Supabase addSavedPlace error:', err);
      }
    }

    const newPlace: SavedPlace = {
      ...place,
      id: assignedId,
      customer_id: currentUser.id,
      created_at: now,
      updated_at: now,
    };

    setSavedPlaces((prev) => [newPlace, ...prev]);
    toast.success(`"${newPlace.name}" added to saved places.`);
    return newPlace;
  };

  const updateSavedPlace = async (id: string, updates: Partial<SavedPlace>): Promise<boolean> => {
    const now = new Date().toISOString();
    setSavedPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p))
    );

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        await supabase.from('saved_places').update({ ...updates, updated_at: now }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateSavedPlace error:', err);
      }
    }

    toast.success('Saved place updated.');
    return true;
  };

  const deleteSavedPlace = async (id: string): Promise<boolean> => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        await supabase.from('saved_places').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteSavedPlace error:', err);
      }
    }

    toast.success('Saved place removed.');
    return true;
  };

  // Recent Locations Operations
  const addRecentLocation = async (loc: {
    address: string;
    latitude: number;
    longitude: number;
    place_id?: string | null;
  }) => {
    const now = new Date().toISOString();
    const existingIndex = recentLocations.findIndex(
      (r) =>
        r.address.toLowerCase() === loc.address.toLowerCase() ||
        (Math.abs(r.latitude - loc.latitude) < 0.002 && Math.abs(r.longitude - loc.longitude) < 0.002)
    );

    let updated: RecentLocation[];
    if (existingIndex >= 0) {
      const existing = { ...recentLocations[existingIndex], last_used_at: now, address: loc.address };
      updated = [existing, ...recentLocations.filter((_, idx) => idx !== existingIndex)];
    } else {
      const newRec: RecentLocation = {
        id: 'rec-' + Date.now(),
        customer_id: currentUser.id,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        place_id: loc.place_id || null,
        last_used_at: now,
      };
      updated = [newRec, ...recentLocations].slice(0, 8);
    }

    setRecentLocations(updated);

    try {
      await supabase.from('recent_locations').upsert({
        customer_id: currentUser.id,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        place_id: loc.place_id || null,
        last_used_at: now,
      });
    } catch {
      // Local state retained
    }
  };

  const clearRecentLocations = async () => {
    setRecentLocations([]);
    try {
      await supabase.from('recent_locations').delete().eq('customer_id', currentUser.id);
    } catch {
      // Local state retained
    }
    toast.info('Recent locations cleared.');
  };

  // Notifications helper
  const addNotification = async (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'ride' = 'info',
    role?: UserRole
  ) => {
    const now = new Date().toISOString();
    const tempId = 'notif-' + Date.now();
    const newItem: NotificationItem = {
      id: tempId,
      title,
      message,
      timestamp: now,
      read: false,
      type,
      role,
    };
    setNotifications((prev) => [newItem, ...prev]);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
    try {
      await supabase.from('notifications').insert({
        user_id: isUuid ? currentUser.id : null,
        role: role || (currentUser.id !== 'guest' ? currentUser.role : null),
        title,
        message,
        type,
        read: false,
      });
    } catch (err) {
      console.warn('Supabase addNotification error:', err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      } catch (err) {
        console.warn('Supabase markNotificationAsRead error:', err);
      }
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
    if (isUuid) {
      try {
        await supabase.from('notifications').delete().eq('user_id', currentUser.id);
      } catch (err) {
        console.warn('Supabase clearNotifications error:', err);
      }
    }
  };

  // Settings
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addNotification('Settings Updated', 'System configurations updated by Admin.', 'success', 'admin');
    toast.success('Settings updated successfully');
  };

  // Services CMS
  const addService = async (service: Omit<ServiceItem, 'id' | 'created_at' | 'updated_at'>) => {
    const newService: ServiceItem = {
      ...service,
      id: 'srv-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setServices((prev) => [...prev, newService]);
    try {
      await supabase.from('services').insert(newService);
    } catch { }
    addNotification('Service Added', `New service "${service.title}" published.`, 'success', 'admin');
    toast.success(`Service "${service.title}" published`);
  };

  const updateService = async (id: string, partial: Partial<ServiceItem>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...partial, updated_at: new Date().toISOString() } : s))
    );
    try {
      await supabase.from('services').update(partial).eq('id', id);
    } catch { }
    toast.success('Service updated successfully');
  };

  const deleteService = async (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    try {
      await supabase.from('services').delete().eq('id', id);
    } catch { }
    toast.success('Service removed');
  };

  const toggleServiceActive = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;
    const newActive = !target.is_active;
    await updateService(id, { is_active: newActive });
  };

  // Fixed Fare Rates Management (Admin & Customer Live Pricing)
  const addFixedFareRate = async (
    rate: Omit<FixedFareRate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<FixedFareRate> => {
    const effectiveTerminal = rate.terminal && rate.terminal.trim() ? (rate.terminal.trim() as TerminalCode) : null;
    const rateId = `${rate.vehicle_category}-${rate.service_type}${effectiveTerminal ? `-${effectiveTerminal}` : ''}-${Date.now()}`;
    const now = new Date().toISOString();
    const newRate: FixedFareRate = {
      ...rate,
      id: rateId,
      terminal: effectiveTerminal,
      fare_amount: Number(rate.fare_amount),
      currency: 'SAR',
      is_active: rate.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    setFixedFareRates((prev) => {
      const updated = [...prev, newRate];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('alharmain_fixed_fare_rates', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    try {
      await fetch('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate),
      });
      await supabase.from('fixed_fare_rates').upsert(newRate, { onConflict: 'id' });
    } catch (err) {
      console.warn('Syncing new rate error:', err);
    }

    addNotification(
      'New Rate Published',
      `Rate added for ${rate.vehicle_category} (${rate.service_type}): SAR ${rate.fare_amount}.`,
      'success',
      'admin'
    );
    toast.success('New rate successfully published');
    return newRate;
  };

  const addBulkFixedFareRates = async (payload: {
    service_type: string;
    terminal?: TerminalCode | string | null;
    is_active?: boolean;
    rates: Array<{ vehicle_category: string; fare_amount: number; id?: string }>;
  }): Promise<{ success: boolean; rates?: FixedFareRate[]; error?: string }> => {
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save rates');
      }

      const savedRates: FixedFareRate[] = data.rates || [];

      // Update local state atomically
      setFixedFareRates((prev) => {
        const savedIds = new Set(savedRates.map((r) => r.id));
        const filtered = prev.filter((r) => !savedIds.has(r.id));
        const updated = [...filtered, ...savedRates];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_fixed_fare_rates', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      addNotification(
        'Fixed Fares Saved',
        `Configured ${savedRates.length} vehicle rate(s) for ${payload.service_type}.`,
        'success',
        'admin'
      );
      toast.success(`Successfully saved ${savedRates.length} vehicle rate(s)`);
      return { success: true, rates: savedRates };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save rates';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const updateFixedFareRate = async (
    id: string,
    updates: Partial<FixedFareRate>
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    setFixedFareRates((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates, updated_at: now } : r));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('alharmain_fixed_fare_rates', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    try {
      await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      await supabase.from('fixed_fare_rates').update({ ...updates, updated_at: now }).eq('id', id);
    } catch (err) {
      console.warn('Syncing rate update error:', err);
    }

    toast.success('Rate updated successfully');
    return true;
  };

  const deleteFixedFareRate = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/rates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete rate');
        return false;
      }
      setFixedFareRates((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('alharmain_fixed_fare_rates', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      addNotification('Rate Removed', 'A rate entry was deleted from the rate list.', 'info', 'admin');
      toast.success('Rate entry deleted');
      return true;
    } catch (err: unknown) {
      console.warn('Syncing rate deletion error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete rate';
      toast.error(msg);
      return false;
    }
  };

  const toggleFixedFareRateStatus = async (id: string): Promise<boolean> => {
    const target = fixedFareRates.find((r) => r.id === id);
    if (!target) return false;
    const newStatus = !target.is_active;
    await updateFixedFareRate(id, { is_active: newStatus });
    toast.info(`Rate is now ${newStatus ? 'Active' : 'Inactive'}`);
    return true;
  };

  // ─── Rate Master Entities (Vehicles, Capacities, Services, Routes, Terminals) ───

  const addRateVehicle = async (vehicle: Omit<RateVehicleType, 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/rates/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add vehicle type');
        return { success: false, error: data.error };
      }
      const newV: RateVehicleType = data.vehicle;
      setRateVehicles((prev) => {
        const filtered = prev.filter((v) => v.id !== newV.id);
        const updated = [...filtered, newV];
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_vehicles', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Vehicle "${newV.name}" created with ${newV.seating_capacity} seats capacity.`);
      return { success: true, vehicle: newV };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding vehicle';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const updateRateVehicle = async (id: string, updates: Partial<RateVehicleType>) => {
    try {
      const res = await fetch('/api/admin/rates/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update vehicle type');
        return { success: false, error: data.error };
      }
      const updatedV: RateVehicleType = data.vehicle;
      setRateVehicles((prev) => {
        const updated = prev.map((v) => (v.id === id ? { ...v, ...updatedV } : v));
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_vehicles', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      // Synchronize assigned driver's vehicle details with updated Rates vehicle
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.assigned_vehicle_id === id) {
            return {
              ...d,
              assigned_vehicle: {
                id: updatedV.id || id,
                plate_number: (updatedV.category || d.assigned_vehicle?.plate_number || '').toUpperCase(),
                make: updatedV.name || d.assigned_vehicle?.make || '',
                model: `(${updatedV.seating_capacity ?? d.assigned_vehicle?.seating_capacity ?? 4} Seats)`,
                vehicle_type: (updatedV.category || d.assigned_vehicle?.vehicle_type) as any,
                seating_capacity: updatedV.seating_capacity ?? d.assigned_vehicle?.seating_capacity ?? 4,
                status: updatedV.is_active === false ? 'inactive' : 'assigned',
                created_at: d.assigned_vehicle?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            };
          }
          return d;
        })
      );
      toast.success(`Vehicle "${updatedV.name || id}" updated.`);
      return { success: true, vehicle: updatedV };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating vehicle';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const deleteRateVehicle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rates/vehicles?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete vehicle type');
        return {
          success: false,
          error: data.error,
          canDeactivate: Boolean(data.canDeactivate),
          linkedBookings: data.linkedBookings,
        };
      }
      setRateVehicles((prev) => {
        const updated = prev.filter((v) => v.id !== id);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_vehicles', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      // Automatically unassign any driver whose assigned rate vehicle was deleted
      setDrivers((prev) =>
        prev.map((d) =>
          d.assigned_vehicle_id === id
            ? { ...d, assigned_vehicle_id: null, assigned_vehicle: null, status: 'available' }
            : d
        )
      );
      toast.success('Vehicle type deleted successfully.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting vehicle';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const addRateService = async (service: Omit<RateServiceType, 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/rates/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add service type');
        return { success: false, error: data.error };
      }
      const newS: RateServiceType = data.service;
      setRateServices((prev) => {
        const filtered = prev.filter((s) => s.id !== newS.id);
        const updated = [...filtered, newS];
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_services', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Service category "${newS.name}" added.`);
      return { success: true, service: newS };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding service';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const updateRateService = async (id: string, updates: Partial<RateServiceType>) => {
    try {
      const res = await fetch('/api/admin/rates/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update service type');
        return { success: false, error: data.error };
      }
      const updatedS: RateServiceType = data.service;
      setRateServices((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedS } : s));
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_services', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Service "${updatedS.name || id}" updated.`);
      return { success: true, service: updatedS };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating service';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const deleteRateService = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rates/services?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete service type');
        return { success: false, error: data.error };
      }
      setRateServices((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_services', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success('Service type deleted.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting service';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const addRateRoute = async (route: Omit<RateRoute, 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/rates/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(route),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add route');
        return { success: false, error: data.error };
      }
      const newR: RateRoute = data.route;
      setRateRoutes((prev) => {
        const filtered = prev.filter((r) => r.id !== newR.id);
        const updated = [...filtered, newR];
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_routes', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Route "${newR.route_name}" created.`);
      return { success: true, route: newR };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding route';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const updateRateRoute = async (id: string, updates: Partial<RateRoute>) => {
    try {
      const res = await fetch('/api/admin/rates/routes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update route');
        return { success: false, error: data.error };
      }
      const updatedR: RateRoute = data.route;
      setRateRoutes((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updatedR } : r));
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_routes', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Route "${updatedR.route_name || id}" updated.`);
      return { success: true, route: updatedR };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating route';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const deleteRateRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rates/routes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete route');
        return {
          success: false,
          error: data.error,
          canDeactivate: Boolean(data.canDeactivate),
          linkedBookings: data.linkedBookings,
        };
      }
      setRateRoutes((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_routes', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success('Route deleted successfully.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting route';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const addRateTerminal = async (terminal: Omit<RateTerminal, 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/rates/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terminal),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add terminal');
        return { success: false, error: data.error };
      }
      const newT: RateTerminal = data.terminal;
      setRateTerminals((prev) => {
        const filtered = prev.filter((t) => t.id !== newT.id);
        const updated = [...filtered, newT];
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_terminals', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Terminal "${newT.name}" added.`);
      return { success: true, terminal: newT };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding terminal';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const updateRateTerminal = async (id: string, updates: Partial<RateTerminal>) => {
    try {
      const res = await fetch('/api/admin/rates/terminals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update terminal');
        return { success: false, error: data.error };
      }
      const updatedT: RateTerminal = data.terminal;
      setRateTerminals((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, ...updatedT } : t));
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_terminals', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success(`Terminal "${updatedT.name || id}" updated.`);
      return { success: true, terminal: updatedT };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating terminal';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const deleteRateTerminal = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/rates/terminals?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete terminal');
        return {
          success: false,
          error: data.error,
          canDeactivate: Boolean(data.canDeactivate),
          linkedBookings: data.linkedBookings,
        };
      }
      setRateTerminals((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('alharmain_rate_terminals', JSON.stringify(updated)); } catch {}
        }
        return updated;
      });
      toast.success('Terminal deleted.');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting terminal';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // User Management (Admin & Operations)
  const adminCreateUser = async (data: {
    role: UserRole;
    full_name: string;
    email: string;
    phone: string;
    password?: string;
    email_verified?: boolean;
    status?: UserStatus;
    license_number?: string;
    national_id?: string;
    assigned_vehicle_id?: string;
    avatar_url?: string;
  }): Promise<{ success: boolean; user?: Profile; error?: string; generatedPassword?: string }> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !resData.success) {
        const errorMsg = resData.error || 'Failed to create user account';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const createdProfile: Profile = resData.user;
      setUsersList((prev) => [createdProfile, ...prev.filter((u) => u.id !== createdProfile.id)]);

      if (data.role === 'driver' && resData.driver) {
        const matchedRateVeh = data.assigned_vehicle_id
          ? rateVehicles.find((rv) => rv.id === data.assigned_vehicle_id || rv.category === data.assigned_vehicle_id) || null
          : null;
        const matchedLegacyVeh = !matchedRateVeh && data.assigned_vehicle_id
          ? vehicles.find((v) => v.id === data.assigned_vehicle_id) || null
          : null;

        const assignedVeh: Vehicle | null = matchedRateVeh
          ? {
              id: matchedRateVeh.id,
              plate_number: matchedRateVeh.category.toUpperCase(),
              make: matchedRateVeh.name,
              model: `(${matchedRateVeh.seating_capacity} Seats)`,
              vehicle_type: matchedRateVeh.category as any,
              seating_capacity: matchedRateVeh.seating_capacity,
              status: 'assigned',
              created_at: matchedRateVeh.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : matchedLegacyVeh;

        const newDriver: Driver = {
          ...resData.driver,
          profile: createdProfile,
          full_name: createdProfile.full_name,
          phone: createdProfile.phone,
          avatar_url: createdProfile.avatar_url || data.avatar_url || null,
          assigned_vehicle: assignedVeh,
        };
        setDrivers((prev) => [newDriver, ...prev.filter((d) => d.id !== createdProfile.id)]);
      }

      addNotification(
        'User Created',
        `${createdProfile.full_name} onboarded as ${createdProfile.role.toUpperCase()}.`,
        'info',
        'admin'
      );
      toast.success(resData.message || `Account for ${createdProfile.full_name} created successfully`);
      return {
        success: true,
        user: createdProfile,
        generatedPassword: resData.generatedPassword,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const adminUpdateUser = async (
    userId: string,
    updates: {
      full_name?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      status?: UserStatus;
      email_verified?: boolean;
      phone_verified?: boolean;
      license_number?: string;
      national_id?: string;
      assigned_vehicle_id?: string | null;
      password?: string;
      avatar_url?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });

      const resData = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !resData.success) {
        const errorMsg = resData.error || 'Failed to update user';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const updatedProfile: Profile = resData.user;
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updatedProfile } : u))
      );

      // Handle driver state update whenever this user is in the fleet roster
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === userId || d.profile?.id === userId) {
            let assignedVeh = d.assigned_vehicle;
            if (updates.assigned_vehicle_id !== undefined) {
              const matchedRateVeh = updates.assigned_vehicle_id
                ? rateVehicles.find((rv) => rv.id === updates.assigned_vehicle_id || rv.category === updates.assigned_vehicle_id) || null
                : null;
              const matchedLegacyVeh = !matchedRateVeh && updates.assigned_vehicle_id
                ? vehicles.find((v) => v.id === updates.assigned_vehicle_id) || null
                : null;

              assignedVeh = matchedRateVeh
                ? {
                    id: matchedRateVeh.id,
                    plate_number: matchedRateVeh.category.toUpperCase(),
                    make: matchedRateVeh.name,
                    model: `(${matchedRateVeh.seating_capacity} Seats)`,
                    vehicle_type: matchedRateVeh.category as any,
                    seating_capacity: matchedRateVeh.seating_capacity,
                    status: 'assigned',
                    created_at: matchedRateVeh.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                : matchedLegacyVeh;
            }

            const updatedStatus = updates.status !== undefined ? updates.status : d.profile?.status;
            let resolvedDutyStatus = d.status;
            if (updatedStatus === 'deactivated' || updatedStatus === 'suspended') {
              resolvedDutyStatus = 'unavailable';
            } else if (updates.status === 'active' && resolvedDutyStatus === 'unavailable') {
              resolvedDutyStatus = (updates.assigned_vehicle_id !== undefined ? updates.assigned_vehicle_id : d.assigned_vehicle_id) ? 'assigned' : 'available';
            } else if (updates.assigned_vehicle_id !== undefined) {
              resolvedDutyStatus = updates.assigned_vehicle_id ? 'assigned' : 'available';
            }

            const newAvatar = updates.avatar_url !== undefined
              ? (updates.avatar_url || null)
              : (updatedProfile.avatar_url !== undefined ? updatedProfile.avatar_url : d.avatar_url);

            return {
              ...d,
              full_name: updatedProfile.full_name || d.full_name,
              phone: updatedProfile.phone || d.phone,
              avatar_url: newAvatar,
              license_number:
                updates.license_number !== undefined ? updates.license_number : d.license_number,
              national_id:
                updates.national_id !== undefined ? updates.national_id : d.national_id,
              assigned_vehicle_id:
                updates.assigned_vehicle_id !== undefined
                  ? updates.assigned_vehicle_id
                  : d.assigned_vehicle_id,
              assigned_vehicle: assignedVeh,
              status: resolvedDutyStatus,
              profile: {
                ...d.profile,
                ...updatedProfile,
                avatar_url: newAvatar,
              } as Profile,
            };
          }
          return d;
        })
      );

      toast.success(resData.message || 'User updated successfully');
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const adminAssignVehicle = async (
    driverId: string,
    vehicleId: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: driverId,
          assigned_vehicle_id: vehicleId,
        }),
      });

      const data = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Failed to update vehicle assignment';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const matchedRateVeh = vehicleId
        ? rateVehicles.find((rv) => rv.id === vehicleId || rv.category === vehicleId) || null
        : null;
      const matchedLegacyVeh = !matchedRateVeh && vehicleId
        ? vehicles.find((v) => v.id === vehicleId) || null
        : null;

      const matchedVeh: Vehicle | null = matchedRateVeh
        ? {
            id: matchedRateVeh.id,
            plate_number: matchedRateVeh.category.toUpperCase(),
            make: matchedRateVeh.name,
            model: `(${matchedRateVeh.seating_capacity} Seats)`,
            vehicle_type: matchedRateVeh.category as any,
            seating_capacity: matchedRateVeh.seating_capacity,
            status: 'assigned',
            created_at: matchedRateVeh.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : matchedLegacyVeh;

      const targetDriver = drivers.find((d) => d.id === driverId);

      // Update drivers state
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === driverId) {
            return {
              ...d,
              assigned_vehicle_id: vehicleId,
              assigned_vehicle: matchedVeh,
              status: vehicleId ? 'assigned' : 'available',
            };
          }
          return d;
        })
      );

      const driverName = targetDriver?.profile?.full_name || 'Captain';
      if (vehicleId && matchedVeh) {
        addNotification(
          'Vehicle Assigned',
          `${matchedVeh.make} (${matchedVeh.plate_number}) assigned to ${driverName}.`,
          'info',
          'admin'
        );
        toast.success(`Vehicle "${matchedVeh.make}" assigned to ${driverName}`);
      } else {
        addNotification(
          'Vehicle Unassigned',
          `Vehicle unassigned from ${driverName}.`,
          'info',
          'admin'
        );
        toast.success(`Vehicle unassigned from ${driverName}`);
      }
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update vehicle assignment';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const createStaffAccount = async (data: { full_name: string; email: string; phone: string }): Promise<Profile> => {
    const res = await adminCreateUser({
      role: 'dispatcher',
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      email_verified: true,
      status: 'active',
    });
    if (res.success && res.user) return res.user;

    // Resilient fallback
    const fallbackStaff: Profile = {
      id: 'staff-' + Date.now(),
      role: 'dispatcher',
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      email_verified: true,
      phone_verified: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUsersList((prev) => [fallbackStaff, ...prev]);
    return fallbackStaff;
  };

  const createDriverAccount = async (data: {
    full_name: string;
    email: string;
    phone: string;
    license_number: string;
    vehicle_id?: string;
  }): Promise<Profile> => {
    const res = await adminCreateUser({
      role: 'driver',
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      license_number: data.license_number,
      assigned_vehicle_id: data.vehicle_id,
      email_verified: true,
      status: 'active',
    });
    if (res.success && res.user) return res.user;

    // Resilient fallback
    const fallbackId = 'drv-' + Date.now();
    const fallbackDriverProfile: Profile = {
      id: fallbackId,
      role: 'driver',
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      email_verified: true,
      phone_verified: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const fallbackDriver: Driver = {
      id: fallbackId,
      license_number: data.license_number,
      assigned_vehicle_id: data.vehicle_id || null,
      status: 'available',
      rating: 5.0,
      total_rides: 0,
      total_earnings: 0,
      cash_collected: 0,
      profile: fallbackDriverProfile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUsersList((prev) => [fallbackDriverProfile, ...prev]);
    setDrivers((prev) => [fallbackDriver, ...prev]);
    return fallbackDriverProfile;
  };

  const toggleUserStatus = async (id: string) => {
    const targetUser = usersList.find((u) => u.id === id);
    const targetDriver = drivers.find((d) => d.id === id || d.profile?.id === id);
    const currentStatus = targetUser?.status || targetDriver?.profile?.status || 'active';
    const newStatus: UserStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    const isCustomer = (targetUser?.role || 'customer') === 'customer' && !targetDriver;

    // 1. Optimistic state updates
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: newStatus, updated_at: new Date().toISOString() } : u
      )
    );

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === id || d.profile?.id === id) {
          const updatedProfile = d.profile ? { ...d.profile, status: newStatus } : undefined;
          return {
            ...d,
            profile: updatedProfile as Profile,
            status: newStatus === 'deactivated'
              ? 'unavailable'
              : (d.assigned_vehicle_id ? 'assigned' : 'available'),
          };
        }
        return d;
      })
    );

    // 2. Persist to Supabase and Auth via PATCH /api/admin/users
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, status: newStatus }),
      });
    } catch (err) {
      console.warn('toggleUserStatus server sync warning:', err);
    }

    if (newStatus === 'deactivated') {
      if (isCustomer) {
        toast.info('Customer account deactivated. New bookings are suspended.');
        addNotification(
          'Customer Account Deactivated',
          `${targetUser?.full_name || 'Customer'} account has been suspended.`,
          'warning',
          'dispatcher'
        );
      } else {
        toast.info('Driver account deactivated. Cannot receive new ride assignments.');
        addNotification(
          'Driver Deactivated',
          `${targetDriver?.profile?.full_name || 'Captain'} suspended from fleet duty.`,
          'warning',
          'admin'
        );
      }
    } else {
      if (isCustomer) {
        toast.success('Customer account reactivated. Eligible for bookings.');
        addNotification(
          'Customer Account Reactivated',
          `${targetUser?.full_name || 'Customer'} account restored to active status.`,
          'info',
          'dispatcher'
        );
      } else {
        toast.success('Driver account reactivated and restored to fleet duty.');
        addNotification(
          'Driver Reactivated',
          `${targetDriver?.profile?.full_name || 'Captain'} restored to active duty.`,
          'info',
          'admin'
        );
      }
    }
  };

  const deleteUser = async (id: string, force: boolean = false): Promise<boolean> => {
    try {
      // 1. For UUID users: call server-side Admin API route with active trip checks
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const res = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id, force }),
        });

        const json = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));

        if (!res.ok || !json.success) {
          const errMsg = json.error || 'Server deletion failed.';
          console.error('deleteUser server error:', errMsg);
          toast.error(errMsg);
          return false;
        }
      } else {
        // Local/demo record — remove from public tables
        await supabase.from('customers').delete().eq('id', id);
        await supabase.from('drivers').delete().eq('id', id);
        await supabase.from('profiles').delete().eq('id', id);
      }

      // 2. Release any vehicle assigned to this driver
      const targetDriver = drivers.find((d) => d.id === id || d.profile?.id === id);
      if (targetDriver?.assigned_vehicle_id) {
        const vehId = targetDriver.assigned_vehicle_id;
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehId ? { ...v, status: 'available' } : v))
        );
      }

      // 3. Optimistically preserve historical trips in local state by nullifying foreign keys
      setBookings((prev) =>
        prev.map((b) =>
          b.customer_id === id
            ? { ...b, customer_id: null }
            : b.assigned_driver_id === id
            ? { ...b, assigned_driver_id: null }
            : b
        )
      );

      // 4. Optimistically remove from all frontend user lists immediately
      setUsersList((prev) => prev.filter((u) => u.id !== id));
      setDrivers((prev) => prev.filter((d) => d.id !== id && d.profile?.id !== id));

      // 5. If the user being deleted is the currently active session, sign out first
      if (currentUser.id === id) {
        await signOut();
      }

      toast.success('Account permanently deleted.');
      return true;
    } catch (err: unknown) {
      console.error('deleteUser error:', err);
      toast.error('An unexpected error occurred while deleting user.');
      await fetchRemoteData();
      return false;
    }
  };

  const uploadDriverAvatar = async (file: File, driverId?: string): Promise<string | null> => {
    try {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPEG, PNG, or WebP).');
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit. Please choose a smaller photo.');
        return null;
      }

      const formData = new FormData();
      formData.append('file', file);
      if (driverId) formData.append('userId', driverId);

      const res = await fetch('/api/storage/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !data.success || !data.url) {
        toast.error(data.error || 'Failed to upload photo.');
        return null;
      }

      return data.url;
    } catch (err) {
      console.error('uploadDriverAvatar error:', err);
      toast.error('Failed to upload driver photo.');
      return null;
    }
  };

  const uploadCustomerAvatar = async (file: File, customerId?: string): Promise<string | null> => {
    return uploadDriverAvatar(file, customerId);
  };

  // Vehicle Management
  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: 'veh-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    try {
      await supabase.from('vehicles').insert(newVehicle);
    } catch { }
    toast.success(`Vehicle ${vehicle.plate_number} added successfully`);
  };

  const updateVehicle = async (id: string, partial: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...partial, updated_at: new Date().toISOString() } : v))
    );
    try {
      await supabase.from('vehicles').update(partial).eq('id', id);
    } catch { }
    toast.success('Vehicle updated successfully');
  };

  // Booking Creation
  const createBooking = async (data: {
    passenger_name: string;
    passenger_phone: string;
    booking_type: 'immediate' | 'scheduled';
    booking_method?: 'fixed' | 'custom';
    trip_type?: 'one_way' | 'round_trip';
    intermediate_stops?: import('@/types').IntermediateStop[];
    return_scheduled_at?: string;
    pickup_address: string;
    pickup_latitude: number;
    pickup_longitude: number;
    destination_address: string;
    destination_latitude: number;
    destination_longitude: number;
    vehicle_type: VehicleType;
    passenger_count: number;
    notes?: string;
    scheduled_at?: string;
    payment_screenshot_url?: string;
    // Fixed-fare fields
    vehicle_category?: string | null;
    service_type?: string | null;
    terminal?: string | null;
    fixed_fare_amount?: number | null;
    fare_rate_id?: string | null;
    // Dispatcher & Custom extensions
    customer_id?: string | null;
    custom_fare?: number | null;
    initial_status?: BookingStatus;
    payment_method?: 'cash' | 'online' | 'card';
    dispatcher_notes?: string | null;
  }): Promise<Booking> => {
    const isCustom = data.booking_method === 'custom';
    const bookingMethod = data.booking_method || 'fixed';
    const tripType = data.trip_type || 'one_way';
    const intermediateStops = data.intermediate_stops || [];
    const returnScheduledAt = data.return_scheduled_at || null;

    const distKm = calculateDistanceKm(
      data.pickup_latitude,
      data.pickup_longitude,
      data.destination_latitude,
      data.destination_longitude
    );
    const durationMin = estimateDurationMinutes(distKm);

    // CRITICAL REQUIREMENT:
    // For custom route bookings submitted without an agreed fare, fare remains null.
    // If a dispatcher supplies custom_fare (manually agreed rate), use it as confirmedFare!
    // For fixed-fare bookings, use the server-validated fixed fare or distance-based estimate.
    const confirmedFare = isCustom
      ? (data.custom_fare !== undefined && data.custom_fare !== null ? Number(data.custom_fare) : null)
      : (data.fixed_fare_amount !== undefined && data.fixed_fare_amount !== null
          ? Number(data.fixed_fare_amount)
          : calculateEstimatedFare(data.vehicle_type, distKm, durationMin).total_fare);

    // Initial status:
    // If payment screenshot uploaded -> always pending_verification!
    // Otherwise respect caller's initial_status, or default based on booking method.
    const initialStatus: BookingStatus = data.payment_screenshot_url
      ? 'pending_verification'
      : (data.initial_status || (isCustom ? (confirmedFare !== null ? 'confirmed' : 'pending_review') : 'confirmed'));

    const ref = generateBookingReference();
    let customerId: string | null = data.customer_id !== undefined ? data.customer_id : null;

    // Check if phone matches an existing customer in usersList
    if (!customerId && data.passenger_phone) {
      const cleanPhone = data.passenger_phone.replace(/[\s\-\(\)\.]/g, '');
      const matchingProfile = usersList.find(
        (u) => u.role === 'customer' && u.phone && u.phone.replace(/[\s\-\(\)\.]/g, '') === cleanPhone
      );
      if (matchingProfile) {
        customerId = matchingProfile.id;
      }
    }

    if (!customerId) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user?.id && currentUser.role === 'customer') {
          customerId = sess.session.user.id;
        }
      } catch {}
    }
    if (!customerId && currentUser.role === 'customer' && currentUser.id && currentUser.id !== 'guest') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
      if (isUuid) {
        customerId = currentUser.id;
      }
    }

    // Resolve customer profile object
    const custProfile = customerId
      ? (usersList.find((u) => u.id === customerId) || (currentUser.id === customerId ? currentUser : null))
      : null;

    // Enforce active account constraint: Inactive customers must not be allowed to make new bookings
    if (custProfile && (custProfile.status === 'deactivated' || custProfile.status === 'suspended')) {
      const errorMsg = `The customer account for ${custProfile.full_name || 'this passenger'} is currently deactivated. Booking creation is not allowed.`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    if (data.passenger_phone) {
      const cleanPhone = data.passenger_phone.replace(/[\s\-\(\)\.]/g, '');
      const matchingProfile = usersList.find(
        (u) => u.role === 'customer' && u.phone && u.phone.replace(/[\s\-\(\)\.]/g, '') === cleanPhone
      );
      if (matchingProfile && (matchingProfile.status === 'deactivated' || matchingProfile.status === 'suspended')) {
        const errorMsg = `The account associated with phone ${data.passenger_phone} is deactivated. Booking creation is not allowed.`;
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

    const now = new Date().toISOString();

    let newBooking: Booking = {
      id: 'bk-' + Date.now(),
      booking_reference: ref,
      customer_id: customerId,
      passenger_name: data.passenger_name,
      passenger_phone: data.passenger_phone,
      booking_type: data.booking_type,
      booking_method: bookingMethod,
      trip_type: tripType,
      intermediate_stops: intermediateStops,
      return_scheduled_at: returnScheduledAt,
      status: initialStatus,
      pickup_address: data.pickup_address,
      pickup_latitude: data.pickup_latitude,
      pickup_longitude: data.pickup_longitude,
      destination_address: data.destination_address,
      destination_latitude: data.destination_latitude,
      destination_longitude: data.destination_longitude,
      vehicle_type: data.vehicle_type,
      // Fixed-fare extended fields
      vehicle_category: (data.vehicle_category as any) ?? null,
      service_type: (data.service_type as any) ?? null,
      terminal: (data.terminal as any) ?? null,
      fixed_fare_amount: isCustom ? null : (data.fixed_fare_amount ?? null),
      fare_rate_id: isCustom ? null : (data.fare_rate_id ?? null),
      passenger_count: data.passenger_count,
      notes: data.notes,
      scheduled_at: data.scheduled_at,
      payment_screenshot_url: data.payment_screenshot_url || null,
      payment_status: 'pending',
      payment_method: data.payment_method || (data.payment_screenshot_url ? 'online' : 'cash'),
      estimated_distance_km: distKm,
      estimated_duration_min: durationMin,
      estimated_fare: confirmedFare,
      final_fare: confirmedFare,
      confirmed_fare: confirmedFare,
      dispatcher_notes: data.dispatcher_notes || null,
      created_at: now,
      updated_at: now,
      customer: custProfile || (currentUser.role === 'customer' ? currentUser : null),
    };

    // Push to Supabase
    try {
      const { data: inserted, error: insertErr } = await supabase.from('bookings').insert({
        booking_reference: newBooking.booking_reference,
        customer_id: customerId,
        passenger_name: newBooking.passenger_name,
        passenger_phone: newBooking.passenger_phone,
        booking_type: newBooking.booking_type,
        booking_method: newBooking.booking_method,
        trip_type: newBooking.trip_type,
        intermediate_stops: newBooking.intermediate_stops,
        return_scheduled_at: newBooking.return_scheduled_at,
        status: newBooking.status,
        pickup_address: newBooking.pickup_address,
        pickup_latitude: newBooking.pickup_latitude,
        pickup_longitude: newBooking.pickup_longitude,
        destination_address: newBooking.destination_address,
        destination_latitude: newBooking.destination_latitude,
        destination_longitude: newBooking.destination_longitude,
        vehicle_type: newBooking.vehicle_type,
        vehicle_category: newBooking.vehicle_category ?? null,
        service_type: newBooking.service_type ?? null,
        terminal: newBooking.terminal ?? null,
        fixed_fare_amount: newBooking.fixed_fare_amount ?? null,
        fare_rate_id: newBooking.fare_rate_id ?? null,
        passenger_count: newBooking.passenger_count,
        notes: newBooking.notes,
        scheduled_at: newBooking.scheduled_at,
        payment_screenshot_url: newBooking.payment_screenshot_url,
        payment_status: 'pending',
        payment_method: newBooking.payment_method || 'cash',
        estimated_distance_km: newBooking.estimated_distance_km,
        estimated_duration_min: newBooking.estimated_duration_min,
        estimated_fare: newBooking.estimated_fare,
        final_fare: newBooking.final_fare,
        confirmed_fare: newBooking.confirmed_fare,
        dispatcher_notes: newBooking.dispatcher_notes,
      }).select(`
        *,
        driver:drivers(*, profile:profiles(*), assigned_vehicle:rate_vehicle_types(*), location:driver_locations(*))
      `).single();

      if (insertErr) {
        console.error('Supabase booking insert error:', insertErr);
      }

      if (inserted) {
        newBooking = {
          ...newBooking,
          ...inserted,
          customer: custProfile || (currentUser.role === 'customer' ? currentUser : null),
        };

        // For fixed-fare or custom bookings with a confirmed fare, insert into payments table
        const paymentAmount = confirmedFare ?? (isCustom ? null : data.fixed_fare_amount) ?? 0;
        if (paymentAmount > 0) {
          await supabase.from('payments').insert({
            booking_id: inserted.id,
            customer_id: customerId,
            amount: paymentAmount,
            method: data.payment_screenshot_url ? 'online' : (data.payment_method || 'cash'),
            status: 'pending',
            transaction_reference: ref,
          });
        }

        // Insert into booking status history with audit details
        const actorId = (currentUser.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)) ? currentUser.id : null;
        await supabase.from('booking_status_history').insert({
          booking_id: inserted.id,
          status: newBooking.status,
          notes: data.payment_screenshot_url
            ? (currentUser.role === 'dispatcher' || currentUser.role === 'admin'
                ? `Dispatcher uploaded customer payment screenshot. Awaiting verification audit.`
                : 'Customer submitted booking request with payment proof. Awaiting Staff verification.')
            : (newBooking.payment_method === 'cash'
                ? `Booking registered with Cash on Pickup (Pending Cash Collection by chauffeur).`
                : (isCustom
                    ? `Custom booking registered with agreed fare (${paymentAmount} SAR).`
                    : 'Fixed-fare booking registered on behalf of customer.')),
          changed_by: actorId,
        });
      }
    } catch (dbErr) {
      console.warn('Supabase booking insert error:', dbErr);
    }

    setBookings((prev) => {
      const filtered = prev.filter(
        (b) => b.id !== newBooking.id && b.booking_reference !== newBooking.booking_reference
      );
      return [newBooking, ...filtered];
    });

    if (newBooking.status === 'pending_verification') {
      addNotification(
        'New Booking Awaiting Verification',
        `Booking ${ref} submitted by ${data.passenger_name} with payment proof. Review in Queue.`,
        'info',
        'dispatcher'
      );
      addNotification(
        'Booking Request Submitted',
        `Your booking (${ref}) is received and pending payment verification by our dispatch team.`,
        'success',
        'customer'
      );
    } else if (isCustom && !data.custom_fare) {
      addNotification(
        'New Custom Route Request',
        `Custom booking ${ref} submitted by ${data.passenger_name}. Awaiting fare quote and review.`,
        'info',
        'dispatcher'
      );
      addNotification(
        'Custom Route Request Received',
        `Your booking request (${ref}) has been received. Our dispatcher will contact you to confirm vehicle availability, fare, and payment details.`,
        'success',
        'customer'
      );
    } else {
      addNotification(
        'New Confirmed Booking',
        `Booking ${ref} created for ${data.passenger_name} (${newBooking.vehicle_type.toUpperCase()}). Ready for driver assignment.`,
        'success',
        'dispatcher'
      );
      addNotification(
        'Booking Confirmed',
        `Your trip ${ref} has been confirmed. A chauffeur will be assigned shortly.`,
        'success',
        'customer'
      );
    }

    return newBooking;
  };

  // Dispatcher confirms custom route fare
  const setCustomBookingFare = async (bookingId: string, fare: number, dispatcherNotes?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            confirmed_fare: fare,
            final_fare: fare,
            estimated_fare: fare,
            dispatcher_notes: dispatcherNotes || b.dispatcher_notes,
            updated_at: now,
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            confirmed_fare: fare,
            final_fare: fare,
            estimated_fare: fare,
            dispatcher_notes: dispatcherNotes || null,
            updated_at: now,
          })
          .eq('id', booking.id);

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: booking.status,
          notes: `Dispatcher confirmed fare of SAR ${fare}. ${dispatcherNotes ? `Notes: ${dispatcherNotes}` : ''}`,
        });
      }
    } catch (err) {
      console.warn('Supabase setCustomBookingFare error:', err);
    }

    addNotification(
      'Fare Confirmed for Custom Route',
      `Fare of SAR ${fare} set for booking ${booking.booking_reference}.`,
      'info',
      'dispatcher'
    );
    addNotification(
      'Fare Confirmed by Dispatcher',
      `Dispatcher confirmed fare of SAR ${fare} for booking ${booking.booking_reference}. Please contact dispatch or complete payment.`,
      'success',
      'customer'
    );
    toast.success(`Fare of SAR ${fare} confirmed for ${booking.booking_reference}`);
  };

  // Staff rejects a booking request
  const rejectBooking = async (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: 'rejected',
            cancellation_reason: reason,
            cancelled_by: currentUser.id,
            cancelled_at: now,
            updated_at: now,
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'rejected',
            cancellation_reason: reason,
            cancelled_by: currentUser.id,
            cancelled_at: now,
            updated_at: now,
          })
          .eq('id', booking.id);

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'rejected',
          notes: `Booking request rejected by Dispatcher. Reason: ${reason}`,
        });
      }
    } catch (err) {
      console.warn('Supabase rejectBooking error:', err);
    }

    addNotification(
      'Booking Request Rejected',
      `Booking ${booking.booking_reference} rejected. Reason: ${reason}`,
      'warning',
      'dispatcher'
    );
    addNotification(
      'Booking Request Rejected',
      `Your booking request ${booking.booking_reference} could not be confirmed: ${reason}`,
      'warning',
      'customer'
    );
    toast.info(`Booking ${booking.booking_reference} rejected.`);
  };

  // Customer uploads payment receipt after fare is confirmed
  const uploadCustomerPaymentProof = async (bookingId: string, file: File): Promise<boolean> => {
    const url = await uploadPaymentScreenshot(file);
    if (!url) return false;

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            payment_screenshot_url: url,
            status: 'pending_verification',
            payment_status: 'pending',
            updated_at: now,
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            payment_screenshot_url: url,
            status: 'pending_verification',
            payment_status: 'pending',
            updated_at: now,
          })
          .eq('id', bookingId);

        await supabase.from('booking_status_history').insert({
          booking_id: bookingId,
          status: 'pending_verification',
          notes: 'Customer uploaded payment receipt. Awaiting dispatcher verification.',
        });
      }
    } catch (err) {
      console.warn('uploadCustomerPaymentProof supabase error:', err);
    }

    addNotification(
      'Payment Proof Uploaded',
      `Customer uploaded payment proof. Review in queue.`,
      'info',
      'dispatcher'
    );
    toast.success('Payment receipt submitted for verification!');
    return true;
  };

  // Staff verifies payment
  const verifyPayment = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: now,
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: now,
          })
          .eq('id', booking.id);

        await supabase
          .from('payments')
          .update({ status: 'paid', updated_at: now })
          .eq('booking_id', booking.id);

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'confirmed',
          notes: 'Payment verified and booking confirmed by Staff/Dispatcher.',
        });
      }
    } catch (err) {
      console.warn('Supabase verifyPayment update error:', err);
    }

    addNotification(
      'Payment Verified & Confirmed',
      `Booking ${booking.booking_reference} payment verified. Ready for driver assignment.`,
      'success',
      'dispatcher'
    );
    addNotification(
      'Payment Verified',
      `Your payment for booking ${booking.booking_reference} has been verified! Assigning driver shortly.`,
      'success',
      'customer'
    );
    toast.success(`Booking ${booking.booking_reference} payment verified!`);
  };

  // Driver confirms cash received from passenger
  const confirmCashReceived = async (
    bookingId: string,
    driverId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      toast.error('Booking not found.');
      return { success: false, error: 'Booking not found.' };
    }

    const effectiveDriverId =
      driverId ||
      booking.assigned_driver_id ||
      (currentUser.role === 'driver' ? currentUser.id : null);

    if (!effectiveDriverId) {
      toast.error('Driver ID required to confirm cash receipt.');
      return { success: false, error: 'Driver ID required.' };
    }

    const fareAmount = Number(
      booking.final_fare ?? booking.confirmed_fare ?? booking.fixed_fare_amount ?? booking.estimated_fare ?? 0
    );

    const now = new Date().toISOString();

    // 1. Call secure server-side API endpoint
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/driver/cash-confirmation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: booking.id,
          driverId: effectiveDriverId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        const errorMsg = json.error || 'Server error confirming cash payment.';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (apiErr) {
      console.warn('API call failed, attempting direct Supabase fallback:', apiErr);
      // Resilient fallback: direct Supabase update
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
        if (isUuid) {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              payment_method: 'cash',
              updated_at: now,
            })
            .eq('id', booking.id);

          await supabase
            .from('payments')
            .update({
              status: 'paid',
              method: 'cash',
              collected_by: effectiveDriverId,
              updated_at: now,
            })
            .eq('booking_id', booking.id);

          await supabase.from('booking_status_history').insert({
            booking_id: booking.id,
            status: booking.status,
            notes: `Cash on Pickup: SAR ${fareAmount} confirmed received by Chauffeur (${effectiveDriverId}).`,
            changed_by: effectiveDriverId,
          });

          const { data: dData } = await supabase
            .from('drivers')
            .select('cash_collected')
            .eq('id', effectiveDriverId)
            .maybeSingle();

          if (dData) {
            await supabase
              .from('drivers')
              .update({
                cash_collected: Number(dData.cash_collected || 0) + fareAmount,
                updated_at: now,
              })
              .eq('id', effectiveDriverId);
          }
        }
      } catch (fbErr) {
        console.warn('Direct fallback error:', fbErr);
      }
    }

    // 2. Synchronize local Bookings state immediately
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              payment_status: 'paid',
              payment_method: 'cash',
              payment: {
                ...(b.payment || {
                  id: 'pmt-' + Date.now(),
                  booking_id: b.id,
                  customer_id: b.customer_id,
                  amount: fareAmount,
                  created_at: now,
                }),
                method: 'cash',
                status: 'paid',
                collected_by: effectiveDriverId,
                updated_at: now,
              },
              updated_at: now,
            }
          : b
      )
    );

    // 3. Synchronize Driver local state cash_collected
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === effectiveDriverId
          ? {
              ...d,
              cash_collected: Math.round(((d.cash_collected || 0) + fareAmount) * 100) / 100,
              updated_at: now,
            }
          : d
      )
    );

    // 4. Notifications
    addNotification(
      'Cash Fare Collected',
      `You confirmed collecting ${formatCurrency(fareAmount, settings.currency)} in cash for booking #${booking.booking_reference}.`,
      'success',
      'driver'
    );
    addNotification(
      'Cash Fare Collected by Driver',
      `Captain confirmed cash collection of ${formatCurrency(fareAmount, settings.currency)} for booking ${booking.booking_reference}.`,
      'info',
      'dispatcher'
    );
    addNotification(
      'Payment Received',
      `Your cash payment of ${formatCurrency(fareAmount, settings.currency)} has been recorded as paid by your chauffeur for trip ${booking.booking_reference}.`,
      'success',
      'customer'
    );

    toast.success(`Cash payment of ${formatCurrency(fareAmount, settings.currency)} confirmed received!`);
    return { success: true };
  };

  // Staff rejects payment
  const rejectPayment = async (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: 'payment_rejected',
            payment_status: 'failed',
            payment_rejected_reason: reason,
            updated_at: now,
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'payment_rejected',
            payment_status: 'failed',
            payment_rejected_reason: reason,
            updated_at: now,
          })
          .eq('id', booking.id);

        await supabase
          .from('payments')
          .update({ status: 'failed', updated_at: now })
          .eq('booking_id', booking.id);

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'payment_rejected',
          notes: `Payment proof rejected by Staff. Reason: ${reason}`,
        });
      }
    } catch (err) {
      console.warn('Supabase rejectPayment update error:', err);
    }

    addNotification(
      'Payment Proof Rejected',
      `Booking ${booking.booking_reference} payment rejected: ${reason}`,
      'warning',
      'dispatcher'
    );
    addNotification(
      'Payment Verification Issue',
      `Your payment proof for booking ${booking.booking_reference} was rejected: ${reason}. Please contact support.`,
      'warning',
      'customer'
    );
    toast.error(`Payment rejected for ${booking.booking_reference}`);
  };

  // Staff confirms booking
  const confirmBooking = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      toast.error('Cannot confirm a cancelled or rejected booking.');
      return;
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'confirmed', updated_at: now } : b))
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase.from('bookings').update({ status: 'confirmed', updated_at: now }).eq('id', booking.id);
        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'confirmed',
          notes: 'Booking confirmed/scheduled by Staff.',
        });
      }
    } catch (err) {
      console.warn('Supabase confirmBooking error:', err);
    }

    addNotification(
      'Booking Confirmed',
      `Booking ${booking.booking_reference} confirmed. Ready for driver assignment.`,
      'success',
      'dispatcher'
    );
    addNotification(
      'Your Booking is Confirmed',
      `Booking ${booking.booking_reference} has been confirmed. Assigning an executive captain.`,
      'success',
      'customer'
    );
    toast.success(`Booking ${booking.booking_reference} confirmed`);
  };

  // Staff assigns driver
  // Staff manually assigns driver to confirmed booking with overlap check
  const assignDriver = async (bookingId: string, driverId: string): Promise<boolean> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return false;

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      toast.error('Cannot assign a driver to a cancelled booking.');
      return false;
    }

    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) {
      toast.error('Selected driver not found.');
      return false;
    }

    if (selectedDriver.profile?.status === 'deactivated' || selectedDriver.profile?.status === 'suspended') {
      toast.error(`Cannot assign ${selectedDriver.profile?.full_name || 'Driver'}: Chauffeur account is currently inactive / deactivated.`);
      return false;
    }

    // Overlap prevention: Ensure no time conflict with existing active/scheduled assignments
    const existingDriverBookings = bookings.filter((b) => b.assigned_driver_id === driverId);
    const overlapResult = checkDriverOverlap(existingDriverBookings, booking);
    if (overlapResult.hasOverlap) {
      toast.error(
        `Scheduling Conflict: ${selectedDriver.profile?.full_name || 'Captain'} ${overlapResult.message}`
      );
      return false;
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            assigned_driver_id: driverId,
            driver: selectedDriver,
            status: 'driver_assigned',
            updated_at: now,
          }
          : b
      )
    );

    // Keep driver status updated
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId && d.status === 'available' ? { ...d, status: 'assigned' } : d))
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase.from('bookings').update({
          assigned_driver_id: driverId,
          status: 'driver_assigned',
          updated_at: now,
        }).eq('id', booking.id);

        if (selectedDriver.status === 'available') {
          await supabase.from('drivers').update({ status: 'assigned', updated_at: now }).eq('id', driverId);
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'driver_assigned',
          notes: `Captain ${selectedDriver.profile?.full_name || 'Driver'} assigned by Staff.`,
        });
      }
    } catch (err) {
      console.warn('Supabase assignDriver error:', err);
    }

    addNotification(
      'New Trip Assigned',
      `Trip ${booking.booking_reference} has been assigned to you. Please review and accept.`,
      'ride',
      'driver'
    );
    addNotification(
      'Driver Assigned',
      `${selectedDriver.profile?.full_name || 'Captain'} has been assigned to your ride.`,
      'ride',
      'customer'
    );
    toast.success(`Assigned to ${selectedDriver.profile?.full_name}`);
    return true;
  };

  // Staff reassigns driver with overlap check
  const reassignDriver = async (bookingId: string, newDriverId: string): Promise<boolean> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return false;

    const previousDriverId = booking.assigned_driver_id;
    const newDriver = drivers.find((d) => d.id === newDriverId);
    if (!newDriver) {
      toast.error('Selected driver not found.');
      return false;
    }

    if (newDriver.profile?.status === 'deactivated' || newDriver.profile?.status === 'suspended') {
      toast.error(`Cannot assign ${newDriver.profile?.full_name || 'Driver'}: Chauffeur account is currently inactive / deactivated.`);
      return false;
    }

    // Overlap prevention for new driver
    const existingDriverBookings = bookings.filter((b) => b.assigned_driver_id === newDriverId);
    const overlapResult = checkDriverOverlap(existingDriverBookings, booking);
    if (overlapResult.hasOverlap) {
      toast.error(
        `Scheduling Conflict: ${newDriver.profile?.full_name || 'Captain'} ${overlapResult.message}`
      );
      return false;
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            assigned_driver_id: newDriverId,
            driver: newDriver,
            status: 'driver_assigned',
            updated_at: now,
          }
          : b
      )
    );

    const prevDriverHasOtherBookings = bookings.some(
      (b) =>
        b.id !== bookingId &&
        b.assigned_driver_id === previousDriverId &&
        !isBookingCompleted(b.status) &&
        !isBookingCancelled(b.status)
    );

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === newDriverId && d.status === 'available') return { ...d, status: 'assigned' };
        if (d.id === previousDriverId && !prevDriverHasOtherBookings) return { ...d, status: 'available' };
        return d;
      })
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase.from('bookings').update({
          assigned_driver_id: newDriverId,
          status: 'driver_assigned',
          updated_at: now,
        }).eq('id', booking.id);

        if (newDriverId) {
          await supabase.from('drivers').update({ status: 'assigned', updated_at: now }).eq('id', newDriverId);
        }
        if (previousDriverId && !prevDriverHasOtherBookings) {
          await supabase.from('drivers').update({ status: 'available', updated_at: now }).eq('id', previousDriverId);
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'driver_assigned',
          notes: `Chauffeur reassigned to ${newDriver.profile?.full_name || 'Captain'} by Dispatcher.`,
        });
      }
    } catch (err) {
      console.warn('Supabase reassignDriver error:', err);
    }

    addNotification(
      'Trip Reassigned',
      `Trip ${booking.booking_reference} reassigned to you. Please review and accept.`,
      'ride',
      'driver'
    );
    addNotification(
      'Captain Reassigned',
      `${newDriver.profile?.full_name || 'Captain'} is now assigned to your ride.`,
      'ride',
      'customer'
    );
    toast.success(`Trip reassigned to ${newDriver.profile?.full_name}`);
    return true;
  };

  // Auto assign driver with overlap prevention
  const autoAssignDriver = async (bookingId: string): Promise<boolean> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return false;

    // Filter available drivers without time overlap and ensure account is active
    const eligibleDrivers = drivers.filter((d) => {
      if (d.status === 'offline' || d.status === 'unavailable' || d.status === 'on_break') return false;
      if (d.profile?.status === 'deactivated' || d.profile?.status === 'suspended') return false;
      if (booking.vehicle_type && d.assigned_vehicle?.vehicle_type && d.assigned_vehicle.vehicle_type !== booking.vehicle_type) {
        return false;
      }
      const existing = bookings.filter((b) => b.assigned_driver_id === d.id);
      const overlap = checkDriverOverlap(existing, booking);
      return !overlap.hasOverlap;
    });

    const candidate = eligibleDrivers.find((d) => d.status === 'available') || eligibleDrivers[0];

    if (!candidate) {
      toast.warning('No available drivers without scheduling conflict found for auto-dispatch.');
      return false;
    }

    return await assignDriver(bookingId, candidate.id);
  };

  // Server-Side Search & Match Driver
  const searchAndMatchDriver = async (
    bookingId: string,
    vehicleType?: VehicleType
  ): Promise<{
    success: boolean;
    matched: boolean;
    driver?: any;
    vehicle?: any;
    etaMinutes?: number;
    etaFormatted?: string;
    message?: string;
  }> => {
    try {
      const res = await fetch('/api/bookings/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, vehicleType }),
      });

      const data = await res.json();

      if (data.success && (data.matched || data.dispatched) && data.driver) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId || b.booking_reference === bookingId || b.booking_reference === data.bookingReference
              ? {
                ...b,
                status: 'driver_assigned',
                assigned_driver_id: data.driver.id,
                driver: {
                  id: data.driver.id,
                  status: 'assigned',
                  rating: data.driver.rating,
                  rating_count: data.driver.rating_count ?? 0,
                  total_rides: data.driver.totalRides ?? 0,
                  avatar_url: data.driver.photo,
                  phone: data.driver.phone,
                  full_name: data.driver.name,
                  total_earnings: 0,
                  cash_collected: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  profile: {
                    id: data.driver.id,
                    role: 'driver',
                    full_name: data.driver.name,
                    phone: data.driver.phone,
                    avatar_url: data.driver.photo,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  assigned_vehicle: {
                    id: 'veh-' + data.driver.id,
                    plate_number: data.vehicle.plateNumber,
                    make: data.vehicle.make,
                    model: data.vehicle.model,
                    color: data.vehicle.color,
                    vehicle_type: data.vehicle.vehicleType,
                    seating_capacity: 4,
                    status: 'assigned',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  location: {
                    driver_id: data.driver.id,
                    latitude: data.driver.location?.latitude || 21.4225,
                    longitude: data.driver.location?.longitude || 39.8262,
                    heading: 0,
                    updated_at: new Date().toISOString(),
                  },
                },
                updated_at: new Date().toISOString(),
              }
              : b
          )
        );

        setDrivers((prev) =>
          prev.map((d) => (d.id === data.driver.id ? { ...d, status: 'assigned' } : d))
        );

        addNotification(
          'Driver Assigned',
          `${data.driver.name} has been assigned to your ride. ETA: ${data.etaFormatted || 'soon'}.`,
          'ride',
          'customer'
        );
      }
      return {
        ...data,
        matched: Boolean(data.matched || data.dispatched),
      };
    } catch (err: any) {
      console.error('searchAndMatchDriver error:', err);
      return { success: false, matched: false, message: err.message || 'Matching request failed.' };
    }
  };

  // Driver accepts booking (Enforces only ONE active assignment at a time)
  const driverAcceptBooking = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      toast.error('Booking has been cancelled by customer.');
      return;
    }

    // STRICT ASSIGNMENT RULE:
    // The driver can have multiple upcoming assignments, but can have ONLY ONE active assignment at a time.
    if (booking.assigned_driver_id) {
      const activeTrip = bookings.find(
        (b) =>
          b.id !== bookingId &&
          b.assigned_driver_id === booking.assigned_driver_id &&
          isBookingActive(b.status)
      );
      if (activeTrip) {
        toast.error(
          `Active mission in progress (#${activeTrip.booking_reference}). You must complete it before accepting or starting another assignment.`
        );
        return;
      }
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'driver_accepted', updated_at: now }
          : b
      )
    );

    if (booking.assigned_driver_id) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === booking.assigned_driver_id ? { ...d, status: 'on_trip' } : d))
      );
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'driver_accepted',
            updated_at: now,
          })
          .eq('id', booking.id);

        if (booking.assigned_driver_id) {
          await supabase.from('drivers').update({ status: 'on_trip', updated_at: now }).eq('id', booking.assigned_driver_id);
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'driver_accepted',
          notes: 'Driver accepted trip assignment.',
        });
      }
    } catch (dbErr) {
      console.warn('Supabase driverAcceptBooking update error:', dbErr);
    }

    addNotification(
      'Driver Accepted Ride',
      `Captain has accepted booking ${booking.booking_reference} and is preparing vehicle.`,
      'ride',
      'customer'
    );
    addNotification(
      'Trip Accepted by Driver',
      `Driver accepted booking ${booking.booking_reference}.`,
      'info',
      'dispatcher'
    );
    toast.success('You have accepted the trip assignment.');
  };

  // Driver rejects assignment
  const driverRejectBooking = async (bookingId: string, reason: string = 'Captain unavailable') => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const previousDriverId = booking.assigned_driver_id;
    const now = new Date().toISOString();

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: 'confirmed',
            assigned_driver_id: null,
            driver: null,
            updated_at: now,
          }
          : b
      )
    );

    if (previousDriverId) {
      const prevDriverHasOtherBookings = bookings.some(
        (b) =>
          b.id !== bookingId &&
          b.assigned_driver_id === previousDriverId &&
          !isBookingCompleted(b.status) &&
          !isBookingCancelled(b.status)
      );

      setDrivers((prev) =>
        prev.map((d) => (d.id === previousDriverId && !prevDriverHasOtherBookings ? { ...d, status: 'available' } : d))
      );
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            assigned_driver_id: null,
            updated_at: now,
          })
          .eq('id', booking.id);

        if (previousDriverId) {
          const prevDriverHasOtherBookings = bookings.some(
            (b) =>
              b.id !== bookingId &&
              b.assigned_driver_id === previousDriverId &&
              !isBookingCompleted(b.status) &&
              !isBookingCancelled(b.status)
          );
          if (!prevDriverHasOtherBookings) {
            await supabase.from('drivers').update({ status: 'available', updated_at: now }).eq('id', previousDriverId);
          }
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'confirmed',
          notes: `Driver rejected assignment: ${reason}. Returned to dispatch queue.`,
        });
      }
    } catch (dbErr) {
      console.warn('Supabase driverRejectBooking update error:', dbErr);
    }

    addNotification(
      'Driver Rejected Assignment',
      `Captain declined booking ${booking.booking_reference} (${reason}). Reassign in Queue.`,
      'warning',
      'dispatcher'
    );
    toast.info('Assignment declined. Booking returned to dispatch queue.');
  };

  // Driver updates ride status progression:
  // Assigned -> Accepted -> Heading to Pickup -> Arrived at Pickup -> Trip Started -> Trip Completed
  const driverUpdateRideStatus = async (
    bookingId: string,
    newStatus:
      | 'accepted'
      | 'driver_accepted'
      | 'on_the_way'
      | 'driver_arriving'
      | 'arrived'
      | 'driver_arrived'
      | 'started'
      | 'trip_started'
      | 'completed'
      | 'trip_completed'
  ) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Normalize canonical status
    let canonicalStatus: BookingStatus = newStatus as BookingStatus;
    if (newStatus === 'accepted') canonicalStatus = 'driver_accepted';
    if (newStatus === 'on_the_way') canonicalStatus = 'driver_arriving';
    if (newStatus === 'arrived') canonicalStatus = 'driver_arrived';
    if (newStatus === 'started') canonicalStatus = 'trip_started';
    if (newStatus === 'completed') canonicalStatus = 'completed';

    const isCompleted = canonicalStatus === 'trip_completed' || canonicalStatus === 'completed';

    // Strict validation: For Cash on Pickup rides, cash must be confirmed before ride completion
    if (isCompleted && isCashBooking(booking) && !isCashPaid(booking)) {
      toast.error('Cannot complete ride: Full cash payment must be confirmed received first.');
      return { success: false, error: 'Full cash payment must be confirmed received first.' };
    }

    // Strict validation: driver cannot start another trip while one is active
    if (
      (canonicalStatus === 'driver_accepted' ||
        canonicalStatus === 'driver_arriving' ||
        canonicalStatus === 'driver_arrived' ||
        canonicalStatus === 'trip_started') &&
      booking.assigned_driver_id
    ) {
      const otherActive = bookings.find(
        (b) =>
          b.id !== bookingId &&
          b.assigned_driver_id === booking.assigned_driver_id &&
          isBookingActive(b.status)
      );
      if (otherActive) {
        toast.error(
          `Cannot start: Mission #${otherActive.booking_reference} is active. Please complete it first.`
        );
        return { success: false, error: 'Another mission is currently active.' };
      }
    }

    // Call server-side API to enforce sequence and validation
    if (isCompleted) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const token = sessData?.session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/driver/complete-ride', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bookingId: booking.id,
            driverId: booking.assigned_driver_id || (currentUser.role === 'driver' ? currentUser.id : undefined),
            status: canonicalStatus,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          const errMsg = json.error || 'Server error completing ride.';
          toast.error(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (apiErr) {
        console.warn('API complete-ride error, continuing with fallback:', apiErr);
      }
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: canonicalStatus,
            updated_at: now,
          }
          : b
      )
    );

    if (isCompleted && booking.assigned_driver_id) {
      // Check if driver has other upcoming assigned bookings
      const hasOtherAssignments = bookings.some(
        (b) =>
          b.id !== bookingId &&
          b.assigned_driver_id === booking.assigned_driver_id &&
          !isBookingCompleted(b.status) &&
          !isBookingCancelled(b.status)
      );

      const nextDriverStatus: DriverStatus = hasOtherAssignments ? 'assigned' : 'available';
      const updatedBookings = bookings.map((b) =>
        b.id === bookingId ? { ...b, status: canonicalStatus } : b
      );
      const newCompletedRides = calculateDriverCompletedRides(updatedBookings, booking.assigned_driver_id);

      setDrivers((prev) =>
        prev.map((d) =>
          d.id === booking.assigned_driver_id
            ? {
              ...d,
              status: nextDriverStatus,
              total_rides: newCompletedRides,
              total_earnings: d.total_earnings + (booking.final_fare || booking.confirmed_fare || booking.estimated_fare || 0),
            }
            : d
        )
      );
    } else if (booking.assigned_driver_id && !isCompleted) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === booking.assigned_driver_id ? { ...d, status: 'on_trip' } : d))
      );
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: canonicalStatus,
            updated_at: now,
          })
          .eq('id', booking.id);

        if (booking.assigned_driver_id) {
          const hasOtherAssignments = bookings.some(
            (b) =>
              b.id !== bookingId &&
              b.assigned_driver_id === booking.assigned_driver_id &&
              !isBookingCompleted(b.status) &&
              !isBookingCancelled(b.status)
          );
          const nextDriverStatus = isCompleted ? (hasOtherAssignments ? 'assigned' : 'available') : 'on_trip';
          const updatePayload: any = { status: nextDriverStatus, updated_at: now };
          if (isCompleted) {
            const updatedBookings = bookings.map((b) =>
              b.id === bookingId ? { ...b, status: canonicalStatus } : b
            );
            updatePayload.total_rides = calculateDriverCompletedRides(updatedBookings, booking.assigned_driver_id);
          }
          await supabase.from('drivers').update(updatePayload).eq('id', booking.assigned_driver_id);
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: canonicalStatus,
          notes: `Ride status updated to ${canonicalStatus} by Captain.`,
        });
      }
    } catch (dbErr) {
      console.warn('Supabase driverUpdateRideStatus error:', dbErr);
    }

    const labelMap: Record<string, string> = {
      driver_accepted: 'Ride Accepted',
      driver_arriving: 'Captain En Route to Pickup',
      driver_arrived: 'Captain Arrived at Pickup',
      trip_started: 'Trip Started',
      trip_completed: 'Trip Completed Successfully. Next scheduled assignment is now unlocked.',
      completed: 'Ride Completed Successfully. Next scheduled assignment is now unlocked.',
    };

    addNotification(
      labelMap[canonicalStatus] || 'Ride Update',
      `Booking ${booking.booking_reference}: ${labelMap[canonicalStatus] || canonicalStatus}`,
      'ride',
      'customer'
    );
    toast.success(labelMap[canonicalStatus] || `Ride status updated: ${canonicalStatus}`);
    return { success: true };
  };

  // Driver starts trip (alias)
  const startTrip = async (bookingId: string) => {
    await driverUpdateRideStatus(bookingId, 'trip_started');
  };

  // Driver completes trip (alias)
  const completeTrip = async (bookingId: string) => {
    await driverUpdateRideStatus(bookingId, 'completed');
  };

  // Generic status update with strict transition checks
  const updateBookingStatus = async (bookingId: string, status: BookingStatus, notes?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Strict validation: cancelled or completed rides cannot casually move to active states
    if (booking.status === 'cancelled' && status !== 'cancelled') {
      toast.error('Cannot change the status of a cancelled booking.');
      return;
    }
    if ((booking.status === 'trip_completed' || booking.status === 'completed') && status === 'trip_started') {
      toast.error('Completed trip cannot be restarted.');
      return;
    }

    if (status === 'confirmed') return confirmBooking(bookingId);
    if (status === 'driver_accepted') return driverAcceptBooking(bookingId);
    if (status === 'trip_started' || status === 'ride_started') return startTrip(bookingId);
    if (status === 'trip_completed' || status === 'ride_completed' || status === 'completed') {
      if (isCashBooking(booking) && !isCashPaid(booking)) {
        toast.error('Cannot complete ride: Full cash payment must be confirmed received first.');
        return;
      }
      return completeTrip(bookingId);
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status,
            notes: notes ? `${b.notes || ''} | ${notes}` : b.notes,
            updated_at: new Date().toISOString(),
          }
          : b
      )
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status,
            notes: notes ? `${booking.notes || ''} | ${notes}` : booking.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);
      }
    } catch (dbErr) {
      console.warn('Supabase updateBookingStatus error:', dbErr);
    }

    toast.info(`Booking status updated to ${status.replace('_', ' ').toUpperCase()}`);
  };

  // Cancel booking
  const cancelBooking = async (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (booking.status === 'trip_started' || booking.status === 'trip_completed') {
      toast.error('Cannot cancel a trip that has already started or completed.');
      return;
    }

    const now = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
            ...b,
            status: 'cancelled',
            cancellation_reason: reason,
            cancelled_by: currentUser.id,
            cancelled_at: now,
            updated_at: now,
          }
          : b
      )
    );

    if (booking.assigned_driver_id) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === booking.assigned_driver_id ? { ...d, status: 'available' } : d))
      );
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id);
      if (isUuid) {
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: reason,
            cancelled_by: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
            cancelled_at: now,
            updated_at: now,
          })
          .eq('id', booking.id);

        if (booking.assigned_driver_id) {
          await supabase
            .from('drivers')
            .update({ status: 'available', updated_at: now })
            .eq('id', booking.assigned_driver_id);
        }

        await supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          status: 'cancelled',
          notes: `Booking cancelled. Reason: ${reason}`,
        });
      }
    } catch (dbErr) {
      console.warn('Supabase cancelBooking error:', dbErr);
    }

    addNotification(
      'Booking Cancelled',
      `Booking ${booking.booking_reference} was cancelled. Reason: ${reason}`,
      'warning'
    );
    toast.info('Booking cancelled successfully.');
  };

  const updateDriverStatus = async (driverId: string, status: DriverStatus) => {
    const now = new Date().toISOString();
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, status, updated_at: now } : d)));
    toast.info(`Driver status changed to ${status.toUpperCase()}`);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId);
      if (isUuid) {
        await supabase.from('drivers').update({ status, updated_at: now }).eq('id', driverId);
      }
    } catch (err) {
      console.warn('Supabase updateDriverStatus error:', err);
    }
  };

  const updateDriverLocation = (
    driverId: string,
    lat: number,
    lng: number,
    heading: number = 0,
    speed: number = 0
  ) => {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!isValidCoordinate(numLat, numLng)) return;

    const now = new Date().toISOString();
    const numHeading = Math.round(Number(heading) || 0);
    const numSpeed = Math.round(Number(speed) || 0);

    const cleanLocation: DriverLocation = {
      driver_id: driverId,
      latitude: numLat,
      longitude: numLng,
      heading: numHeading,
      speed: numSpeed,
      updated_at: now,
    };

    // 1. Immediately update local drivers state (zero latency for UI & smooth animation)
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? {
            ...d,
            location: cleanLocation,
          }
          : d
      )
    );

    // 2. Synchronize active bookings referencing this driver
    setBookings((prev) =>
      prev.map((b) =>
        b.assigned_driver_id === driverId
          ? {
            ...b,
            driver: b.driver
              ? {
                ...b.driver,
                location: cleanLocation,
              }
              : b.driver,
          }
          : b
      )
    );

    // 3. Persist to Supabase with write-throttling to prevent database thrashing
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId);
    if (!isUuid) return;

    const nowTime = Date.now();
    const last = locationThrottleMap.get(driverId);
    const timeSinceLastMs = last ? nowTime - last.timestamp : Infinity;
    const distanceMovedMeters = last
      ? calculateDistanceKm(last.lat, last.lng, numLat, numLng) * 1000
      : Infinity;
    const headingDelta = last ? Math.abs((last.heading - numHeading + 360) % 360) : Infinity;

    // Throttle condition:
    // Write immediately if:
    // - Never written before, OR
    // - At least 2500ms passed AND (moved >= 6 meters OR heading turned >= 15° OR speed changed), OR
    // - At least 8000ms passed (keep-alive heartbeat while driving)
    const shouldWriteNow =
      !last ||
      (timeSinceLastMs >= 2500 && (distanceMovedMeters >= 6 || headingDelta >= 15 || Math.abs((last.speed || 0) - numSpeed) > 5)) ||
      timeSinceLastMs >= 8000;

    if (shouldWriteNow) {
      if (last?.timer) clearTimeout(last.timer);
      locationThrottleMap.set(driverId, {
        lat: numLat,
        lng: numLng,
        heading: numHeading,
        speed: numSpeed,
        timestamp: nowTime,
      });

      (async () => {
        try {
          const { error } = await supabase
            .from('driver_locations')
            .upsert({
              driver_id: driverId,
              latitude: numLat,
              longitude: numLng,
              heading: numHeading,
              speed: numSpeed,
              updated_at: now,
            });
          if (error) {
            console.warn('Supabase driver_locations upsert error:', error.message);
          }
        } catch (err) {
          console.warn('Supabase driver_locations network error:', err);
        }
      })();
    } else {
      // Debounce trailing flush: guarantees final resting coordinate is saved when vehicle stops
      if (last?.timer) clearTimeout(last.timer);
      const timer = setTimeout(async () => {
        const trailingNow = new Date().toISOString();
        locationThrottleMap.set(driverId, {
          lat: numLat,
          lng: numLng,
          heading: numHeading,
          speed: numSpeed,
          timestamp: Date.now(),
        });
        try {
          await supabase
            .from('driver_locations')
            .upsert({
              driver_id: driverId,
              latitude: numLat,
              longitude: numLng,
              heading: numHeading,
              speed: numSpeed,
              updated_at: trailingNow,
            });
        } catch {}
      }, 2500);
      if (last) last.timer = timer;
    }
  };

  const addAdditionalCharge = async (
    bookingId: string,
    charge: Omit<AdditionalCharge, 'id' | 'booking_id' | 'created_at'>
  ) => {
    const now = new Date().toISOString();
    const newCharge: AdditionalCharge = {
      id: 'chg-' + Date.now(),
      booking_id: bookingId,
      charge_type: charge.charge_type,
      amount: charge.amount,
      description: charge.description,
      added_by: currentUser.id,
      created_at: now,
    };

    let calculatedFare: number | null = null;
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const currentCharges = b.additional_charges || [];
          const updatedCharges = [...currentCharges, newCharge];
          calculatedFare = (b.final_fare || b.confirmed_fare || b.estimated_fare || 0) + charge.amount;
          return {
            ...b,
            additional_charges: updatedCharges,
            final_fare: calculatedFare,
            updated_at: now,
          };
        }
        return b;
      })
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
      if (isUuid) {
        await supabase.from('additional_charges').insert({
          booking_id: bookingId,
          charge_type: charge.charge_type,
          amount: charge.amount,
          description: charge.description,
          added_by: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
        });

        if (calculatedFare !== null) {
          await supabase
            .from('bookings')
            .update({ final_fare: calculatedFare, updated_at: now })
            .eq('id', bookingId);
        }
      }
    } catch (err) {
      console.warn('Supabase addAdditionalCharge error:', err);
    }

    addNotification(
      'Extra Charge Recorded',
      `${charge.charge_type.toUpperCase()}: +${charge.amount} ${settings.currency} added.`,
      'info'
    );
    toast.success(`Added ${charge.amount} ${settings.currency} charge`);
  };

  const recordPayment = async (bookingId: string, method: 'cash' | 'online' | 'card', amount: number) => {
    const now = new Date().toISOString();
    const pmtRef = method === 'cash' ? `CASH-${Date.now()}` : `ONLINE-${Date.now()}`;
    const newPayment = {
      id: 'pmt-' + Date.now(),
      booking_id: bookingId,
      customer_id: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
      amount,
      method,
      status: 'paid' as const,
      transaction_reference: pmtRef,
      collected_by: currentUser.id,
      created_at: now,
      updated_at: now,
    };

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'payment_completed',
            payment_status: 'paid',
            payment: {
              ...newPayment,
              customer_id: b.customer_id,
            },
            updated_at: now,
          };
        }
        return b;
      })
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
      if (isUuid) {
        await supabase.from('payments').insert({
          booking_id: bookingId,
          customer_id: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
          amount,
          method,
          status: 'paid',
          transaction_reference: pmtRef,
          collected_by: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
        });

        await supabase
          .from('bookings')
          .update({
            status: 'payment_completed',
            payment_status: 'paid',
            updated_at: now,
          })
          .eq('id', bookingId);

        await supabase.from('booking_status_history').insert({
          booking_id: bookingId,
          status: 'payment_completed',
          notes: `Payment of SAR ${amount} recorded via ${method.toUpperCase()}.`,
        });
      }
    } catch (err) {
      console.warn('Supabase recordPayment error:', err);
    }

    addNotification(
      'Payment Settled',
      `Payment of ${amount.toFixed(2)} ${settings.currency} settled via ${method.toUpperCase()}.`,
      'success'
    );
    toast.success('Payment recorded successfully');
  };

  const createDriverSettlement = async (data: {
    driver_id: string;
    amount: number;
    payment_method?: 'bank_transfer' | 'cash';
    bank_name?: string;
    transaction_number?: string;
    notes?: string;
  }): Promise<{ success: boolean; settlement?: DriverSettlement; error?: string }> => {
    try {
      const res = await fetch('/api/driver/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          processed_by: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to record driver settlement.');
        return { success: false, error: json.error };
      }
      toast.success(json.message || 'Settlement payout recorded successfully!');
      if (json.settlement) {
        setDriverSettlements((prev) => [json.settlement, ...prev.filter((s) => s.id !== json.settlement.id)]);
      }
      return { success: true, settlement: json.settlement };
    } catch (err: any) {
      toast.error(err.message || 'Network error recording settlement.');
      return { success: false, error: err.message };
    }
  };

  const submitRating = async (
    data: Omit<RatingFeedback, 'id' | 'created_at'>
  ): Promise<{ success: boolean; alreadyRated?: boolean; message?: string; rating?: RatingFeedback; error?: string }> => {
    // 1. Prevent duplicate submissions locally if already present in state
    const existing = ratings.find((r) => r.booking_id === data.booking_id);
    if (existing) {
      toast.success('Thank you! Your review has been recorded');
      return {
        success: false,
        alreadyRated: true,
        message: 'Thank you! Your review has been recorded',
        rating: existing,
      };
    }

    try {
      // 2. Call server-side API endpoint for authoritative validation and DB unique constraint enforcement
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.status === 409 || resData.alreadyRated) {
        // Already rated on server
        const savedRating: RatingFeedback = resData.data || {
          id: 'rate-' + Date.now(),
          ...data,
          created_at: new Date().toISOString(),
        };

        setRatings((prev) => {
          if (prev.some((r) => r.booking_id === data.booking_id)) return prev;
          return [savedRating, ...prev];
        });

        toast.success('Thank you! Your review has been recorded');
        return {
          success: false,
          alreadyRated: true,
          message: 'Thank you! Your review has been recorded',
          rating: savedRating,
        };
      }

      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to record rating.');
      }

      const recordedRating: RatingFeedback = resData.data;

      // 3. Update local state with the newly created rating
      setRatings((prev) => [
        recordedRating,
        ...prev.filter((r) => r.id !== recordedRating.id && r.booking_id !== recordedRating.booking_id),
      ]);

      // 4. Update driver stats in state
      if (data.driver_id) {
        const stats = calculateDriverRating([recordedRating, ...ratings], data.driver_id);
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === data.driver_id ? { ...d, rating: stats.rating, rating_count: stats.count } : d
          )
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.assigned_driver_id === data.driver_id && b.driver
              ? { ...b, driver: { ...b.driver, rating: stats.rating, rating_count: stats.count } }
              : b
          )
        );
      }

      addNotification('Feedback Submitted', 'Thank you! Your review has been recorded', 'success');
      toast.success('Thank you! Your review has been recorded');

      return {
        success: true,
        message: 'Thank you! Your review has been recorded',
        rating: recordedRating,
      };
    } catch (err: any) {
      console.warn('API submitRating error, executing direct Supabase fallback:', err);

      // Resilient fallback to Supabase direct insert
      try {
        const isBookingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.booking_id);
        if (isBookingUuid) {
          const { data: dbInsert, error: dbErr } = await supabase
            .from('ratings_feedback')
            .insert({
              booking_id: data.booking_id,
              customer_id: data.customer_id && data.customer_id !== 'guest' ? data.customer_id : null,
              driver_id: data.driver_id || null,
              rating: data.rating,
              feedback: data.feedback || null,
              category: data.category || 'rating',
            })
            .select()
            .single();

          if (dbErr) {
            if (dbErr.code === '23505' || dbErr.message?.includes('duplicate key')) {
              toast.success('Thank you! Your review has been recorded');
              return { success: false, alreadyRated: true, message: 'Thank you! Your review has been recorded' };
            }
            throw dbErr;
          }

          const fallbackRating = dbInsert as RatingFeedback;
          setRatings((prev) => [fallbackRating, ...prev.filter((r) => r.booking_id !== data.booking_id)]);

          if (data.driver_id) {
            const stats = calculateDriverRating([fallbackRating, ...ratings], data.driver_id);
            setDrivers((prev) =>
              prev.map((d) =>
                d.id === data.driver_id ? { ...d, rating: stats.rating, rating_count: stats.count } : d
              )
            );
          }

          toast.success('Thank you! Your review has been recorded');
          return { success: true, message: 'Thank you! Your review has been recorded', rating: fallbackRating };
        }
      } catch (fallbackErr: any) {
        console.error('Supabase fallback submitRating error:', fallbackErr);
        toast.error('Unable to submit rating. Please try again.');
        return { success: false, error: fallbackErr?.message || 'Failed to submit rating.' };
      }

      toast.success('Thank you! Your review has been recorded');
      return { success: true, message: 'Thank you! Your review has been recorded' };
    }
  };

  // Helper active bookings
  const activeCustomerBooking = bookings.find(
    (b) =>
      isBookingForCustomer(b, currentUser) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      b.status !== 'trip_completed' &&
      b.status !== 'payment_completed'
  );

  const activeDriverBooking = bookings.find(
    (b) =>
      (b.assigned_driver_id === currentUser.id || (b.driver && b.driver.id === currentUser.id)) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      b.status !== 'trip_completed' &&
      b.status !== 'payment_completed'
  );

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        currentUser,
        isAuthenticated,
        isAuthLoading,
        verificationState,
        signUpCustomer,
        resendEmailConfirmation,
        checkEmailVerification,
        signIn,
        signOut,
        switchRole,

        emergencyContacts,
        updateUserProfile,
        uploadAvatar,
        uploadPaymentScreenshot,
        uploadCustomerPaymentProof,
        changePassword,
        addEmergencyContact,
        updateEmergencyContact,
        deleteEmergencyContact,
        setPrimaryEmergencyContact,

        savedPlaces,
        recentLocations,
        addSavedPlace,
        updateSavedPlace,
        deleteSavedPlace,
        addRecentLocation,
        clearRecentLocations,

        isDataLoading,
        dataError,
        refreshData: fetchRemoteData,

        bookings,
        drivers,
        vehicles,
        services,
        usersList,
        settings,
        ratings,
        notifications,

        updateSettings,
        addNotification,
        markNotificationAsRead,
        clearNotifications,

        addService,
        updateService,
        deleteService,
        toggleServiceActive,

        fixedFareRates,
        addFixedFareRate,
        addBulkFixedFareRates,
        updateFixedFareRate,
        deleteFixedFareRate,
        toggleFixedFareRateStatus,

        rateVehicles,
        rateServices,
        rateRoutes,
        rateTerminals,
        addRateVehicle,
        updateRateVehicle,
        deleteRateVehicle,
        addRateService,
        updateRateService,
        deleteRateService,
        addRateRoute,
        updateRateRoute,
        deleteRateRoute,
        addRateTerminal,
        updateRateTerminal,
        deleteRateTerminal,

        adminCreateUser,
        adminUpdateUser,
        adminAssignVehicle,
        createStaffAccount,
        createDriverAccount,
        toggleUserStatus,
        deleteUser,
        uploadDriverAvatar,
        uploadCustomerAvatar,

        addVehicle,
        updateVehicle,

        createBooking,
        confirmBooking,
        verifyPayment,
        confirmCashReceived,
        rejectPayment,
        rejectBooking,
        setCustomBookingFare,
        assignDriver,
        reassignDriver,
        autoAssignDriver,
        searchAndMatchDriver,
        driverAcceptBooking,
        driverRejectBooking,
        driverUpdateRideStatus,
        startTrip,
        completeTrip,
        updateBookingStatus,
        cancelBooking,

        updateDriverStatus,
        updateDriverLocation,
        addAdditionalCharge,
        recordPayment,
        submitRating,

        driverSettlements,
        createDriverSettlement,

        activeCustomerBooking,
        activeDriverBooking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
