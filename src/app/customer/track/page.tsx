'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Booking, BookingStatus, Driver, AdditionalCharge } from '@/types';
import { supabase } from '@/lib/supabase/client';
import {
  Car,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  MapPin,
  Navigation,
  UserCheck,
  Calendar,
  Check,
  XCircle,
  Send,
  CreditCard,
  Flag,
  Receipt,
  Eye,
  X,
  ExternalLink,
  Zap,
  QrCode,
  RefreshCw,
  Copy,
  Radio,
  ArrowRight,
  Building2,
  Banknote,
  Info,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createInvoicePdfBlobUrl } from '@/lib/pdf-invoice';
import { formatDriverRating, fetchDriverDetails } from '@/lib/driver-stats';
import Modal from '@/components/ui/Modal';

interface TrackingStepConfig {
  id: number;
  title: string;
  subtitle: string;
  shortLabel: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

const TRACKING_STEPS: TrackingStepConfig[] = [
  {
    id: 1,
    title: 'Submitted',
    subtitle: 'Booking Registered',
    shortLabel: 'Submitted',
    description: 'Your ride request has been received and registered in the Al Harmain dispatch central system.',
    icon: ({ className }) => <Send className={className} />,
  },
  {
    id: 2,
    title: 'Payment Verified',
    subtitle: 'Confirmed by Dispatch',
    shortLabel: 'Verified',
    description: 'Payment status and transaction verification confirmed by central staff operations.',
    icon: ({ className }) => <CreditCard className={className} />,
  },
  {
    id: 3,
    title: 'Driver Assigned',
    subtitle: 'Chauffeur Selected',
    shortLabel: 'Assigned',
    description: 'A certified VIP captain and executive vehicle have been allocated for your journey.',
    icon: ({ className }) => <UserCheck className={className} />,
  },
  {
    id: 4,
    title: 'Driver Accepted',
    subtitle: 'Mission Confirmed',
    shortLabel: 'Accepted',
    description: 'Your assigned captain has acknowledged and accepted your VIP transport mission.',
    icon: ({ className }) => <CheckCircle2 className={className} />,
  },
  {
    id: 5,
    title: 'Heading to Pickup',
    subtitle: 'Captain En Route',
    shortLabel: 'En Route',
    description: 'Your chauffeur is actively driving toward your specified pickup address.',
    icon: ({ className }) => <Navigation className={className} />,
  },
  {
    id: 6,
    title: 'Arrived at Pickup',
    subtitle: 'At Pickup Location',
    shortLabel: 'Arrived',
    description: 'Your captain has arrived at the pickup point and is ready for boarding.',
    icon: ({ className }) => <MapPin className={className} />,
  },
  {
    id: 7,
    title: 'Trip Started',
    subtitle: 'Passenger Boarded',
    shortLabel: 'In Transit',
    description: 'Passengers have boarded. Your VIP transport journey is currently underway.',
    icon: ({ className }) => <Car className={className} />,
  },
  {
    id: 8,
    title: 'Trip Completed',
    subtitle: 'Safely Arrived',
    shortLabel: 'Completed',
    description: 'You have safely reached your destination. Official journey invoice and receipt generated.',
    icon: ({ className }) => <Flag className={className} />,
  },
];

/**
 * Deterministically compute the active step index (0 to 7)
 * based strictly on the booking's real Supabase status.
 */
function getActiveStepIndex(status?: BookingStatus | string, assignedDriverId?: string | null): number {
  switch (status) {
    case 'completed':
    case 'trip_completed':
    case 'ride_completed':
    case 'payment_completed':
      return 7; // Step 8: Trip Completed

    case 'started':
    case 'trip_started':
    case 'ride_started':
      return 6; // Step 7: Trip Started

    case 'arrived':
    case 'driver_arrived':
      return 5; // Step 6: Arrived at Pickup

    case 'on_the_way':
    case 'driver_arriving':
      return 4; // Step 5: Heading to Pickup

    case 'accepted':
    case 'driver_accepted':
      return 3; // Step 4: Driver Accepted

    case 'driver_assigned':
      return 2; // Step 3: Driver Assigned

    case 'confirmed':
    case 'payment_verified':
    case 'searching':
      return 1; // Step 2: Payment Verified

    case 'pending_review':
    case 'pending_verification':
    case 'pending':
    default:
      if (assignedDriverId) return 2;
      return 0; // Step 1: Submitted
  }
}

function formatStatusName(status?: BookingStatus | string): string {
  if (!status) return 'Submitted';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STORAGE_KEY = 'alharmain_customer_selected_track_booking';

export default function CustomerTrackPage() {
  const searchParams = useSearchParams();
  const urlRef = searchParams?.get('ref') || searchParams?.get('bookingId') || searchParams?.get('id');

  const {
    currentUser,
    userRole,
    settings,
    submitRating,
    ratings,
    bookings: contextBookings,
  } = useApp();

  const { language, dir, isRTL, t } = useLanguage();

  const trackingSteps: TrackingStepConfig[] = useMemo(() => [
    {
      id: 1,
      title: isRTL ? 'تم إرسال الطلب' : 'Submitted',
      subtitle: isRTL ? 'تسجيل الحجز في النظام' : 'Booking Registered',
      shortLabel: isRTL ? 'تم الإرسال' : 'Submitted',
      description: isRTL
        ? 'تم استلام طلب الرحلة وتسجيله في النظام المركزي لإدارة الأسطول.'
        : 'Your ride request has been received and registered in the Al Harmain dispatch central system.',
      icon: ({ className }) => <Send className={className} />,
    },
    {
      id: 2,
      title: isRTL ? 'تم تأكيد الدفع' : 'Payment Verified',
      subtitle: isRTL ? 'تأكيد من العمليات' : 'Confirmed by Dispatch',
      shortLabel: isRTL ? 'تم التحقق' : 'Verified',
      description: isRTL
        ? 'تم التحقق من عملية الدفع من قبل فريق العمليات والمتابعة المركزية.'
        : 'Payment status and transaction verification confirmed by central staff operations.',
      icon: ({ className }) => <CreditCard className={className} />,
    },
    {
      id: 3,
      title: isRTL ? 'تم تخصيص السائق' : 'Driver Assigned',
      subtitle: isRTL ? 'اختيار الكابتن المعتمد' : 'Chauffeur Selected',
      shortLabel: isRTL ? 'تم التعيين' : 'Assigned',
      description: isRTL
        ? 'تم تعيين كابتن معتمد وتجهيز المركبة الفاخرة لمهمتك.'
        : 'A certified VIP captain and executive vehicle have been allocated for your journey.',
      icon: ({ className }) => <UserCheck className={className} />,
    },
    {
      id: 4,
      title: isRTL ? 'قبول المهمة' : 'Driver Accepted',
      subtitle: isRTL ? 'تأكيد المهمة' : 'Mission Confirmed',
      shortLabel: isRTL ? 'تم القبول' : 'Accepted',
      description: isRTL
        ? 'أكد الكابتن استلام المهمة واستعداده لنقلك بكل أمان وراحة.'
        : 'Your assigned captain has acknowledged and accepted your VIP transport mission.',
      icon: ({ className }) => <CheckCircle2 className={className} />,
    },
    {
      id: 5,
      title: isRTL ? 'في الطريق إليك' : 'Heading to Pickup',
      subtitle: isRTL ? 'الكابتن متوجه للموقع' : 'Captain En Route',
      shortLabel: isRTL ? 'في الطريق' : 'En Route',
      description: isRTL
        ? 'السائق في طريقه الآن إلى نقطة الانطلاق المحددة.'
        : 'Your chauffeur is actively driving toward your specified pickup address.',
      icon: ({ className }) => <Navigation className={className} />,
    },
    {
      id: 6,
      title: isRTL ? 'وصل السائق' : 'Arrived at Pickup',
      subtitle: isRTL ? 'بانتظاركم في الموقع' : 'At Pickup Location',
      shortLabel: isRTL ? 'وصل الكابتن' : 'Arrived',
      description: isRTL
        ? 'وصل الكابتن إلى نقطة الانطلاق وهو بانتظار تشريفكم للانطلاق.'
        : 'Your captain has arrived at the pickup point and is ready for boarding.',
      icon: ({ className }) => <MapPin className={className} />,
    },
    {
      id: 7,
      title: isRTL ? 'الرحلة بدأت' : 'Trip Started',
      subtitle: isRTL ? 'الركاب على متن المركبة' : 'Passenger Boarded',
      shortLabel: isRTL ? 'الرحلة جارية' : 'In Transit',
      description: isRTL
        ? 'تم صعود الركاب. رحلتكم الفاخرة جارية الآن بأمان نحو وجهتكم المباركة.'
        : 'Passengers have boarded. Your VIP transport journey is currently underway.',
      icon: ({ className }) => <Car className={className} />,
    },
    {
      id: 8,
      title: isRTL ? 'اكتملت الرحلة' : 'Trip Completed',
      subtitle: isRTL ? 'وصلتم بحفظ الله' : 'Safely Arrived',
      shortLabel: isRTL ? 'مكتملة' : 'Completed',
      description: isRTL
        ? 'وصلتم بحفظ الله ورعايته إلى وجهتكم. شكراً لاختياركم الحرمين.'
        : 'You have safely reached your destination. Official journey invoice and receipt generated.',
      icon: ({ className }) => <Flag className={className} />,
    },
  ], [isRTL]);

  // Supabase state
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Keep a ref to the currently selected booking to safely update in real-time callbacks
  const selectedBookingRef = useRef<Booking | null>(null);
  useEffect(() => {
    selectedBookingRef.current = selectedBooking;
  }, [selectedBooking]);

  // Invoice & Rating modals state
  const [showInvoice, setShowInvoice] = useState<boolean>(false);
  const [pdfBlobData, setPdfBlobData] = useState<{ blobUrl: string; download: (filename?: string) => void } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);

  // Existing rating for selected booking (persisted from Supabase)
  const existingRating = useMemo(() => {
    if (!selectedBooking?.id) return null;
    return ratings.find((r) => r.booking_id === selectedBooking.id) || null;
  }, [ratings, selectedBooking?.id]);

  const hasBeenRated = !!existingRating || ratingSubmitted;

  // Synchronize rating form state with existing database record on mount / booking switch
  useEffect(() => {
    if (existingRating) {
      setRatingVal(existingRating.rating);
      setFeedbackText(existingRating.feedback || '');
    } else {
      setRatingVal(5);
      setFeedbackText('');
      setRatingSubmitted(false);
    }
  }, [existingRating, selectedBooking?.id]);

  useEffect(() => {
    return () => {
      if (pdfBlobData?.blobUrl) {
        URL.revokeObjectURL(pdfBlobData.blobUrl);
      }
    };
  }, [pdfBlobData]);

  /**
   * Helper to resolve the initial selected booking from a loaded list:
   * 1. URL search param (ref, bookingId, id) - HIGHEST PRIORITY
   * 2. LocalStorage persisted reference/id
   * 3. Latest active booking (not completed/cancelled)
   * 4. Most recent booking (index 0)
   */
  const resolveSelectedBooking = useCallback((bookingsList: Booking[], targetRef?: string | null): Booking | null => {
    if (!bookingsList || bookingsList.length === 0) return null;

    // 1. Target reference match (highest priority, e.g. from URL or explicit selection)
    if (targetRef) {
      const matchTarget = bookingsList.find(
        (b) =>
          b.booking_reference?.toLowerCase() === targetRef.toLowerCase() ||
          b.id?.toLowerCase() === targetRef.toLowerCase()
      );
      if (matchTarget) return matchTarget;
    }

    // 2. URL search param fallback
    if (urlRef) {
      const matchUrl = bookingsList.find(
        (b) =>
          b.booking_reference?.toLowerCase() === urlRef.toLowerCase() ||
          b.id?.toLowerCase() === urlRef.toLowerCase()
      );
      if (matchUrl) return matchUrl;
    }

    // 3. LocalStorage match
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const matchStored = bookingsList.find(
            (b) =>
              b.booking_reference?.toLowerCase() === stored.toLowerCase() ||
              b.id?.toLowerCase() === stored.toLowerCase()
          );
          if (matchStored) return matchStored;
        }
      } catch { }
    }

    // 4. First active booking
    const activeBooking = bookingsList.find(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'rejected' &&
        b.status !== 'completed' &&
        b.status !== 'trip_completed' &&
        b.status !== 'payment_completed'
    );
    if (activeBooking) return activeBooking;

    // 5. Default to first booking
    return bookingsList[0];
  }, [urlRef]);

  /**
   * Fetch customer bookings from Supabase using authenticated customer ID or urlRef
   */
  const fetchCustomerBookings = useCallback(
    async (userId?: string, showRefreshFeedback = false) => {
      try {
        if (showRefreshFeedback) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // 1. Determine target user ID
        let targetId = userId;
        if (!targetId) {
          const { data: sessionData } = await supabase.auth.getSession();
          targetId = sessionData?.session?.user?.id;
        }
        if (!targetId && currentUser?.id && currentUser.id !== 'guest') {
          targetId = currentUser.id;
        }

        if (targetId) {
          setAuthenticatedUserId(targetId);
        }

        let bookingsList: any[] = [];

        // 2. Fetch bookings for this authenticated customer if ID is available
        if (targetId) {
          const { data: rawBookings, error: queryErr } = await supabase
            .from('bookings')
            .select(`
              *,
              driver:drivers(
                *,
                profile:profiles(*),
                assigned_vehicle:rate_vehicle_types(*)
              ),
              additional_charges(*),
              payments(*)
            `)
            .eq('customer_id', targetId)
            .order('created_at', { ascending: false });

          if (!queryErr && rawBookings) {
            bookingsList = rawBookings;
          } else if (queryErr) {
            console.warn('Supabase customer bookings query notice:', queryErr.message);
          }
        }

        // 3. Priority Ref check: If urlRef is provided, ensure the booking is loaded even if it wasn't in customer_id list
        if (urlRef) {
          const matchExisting = bookingsList.find(
            (b) =>
              b.booking_reference?.toLowerCase() === urlRef.toLowerCase() ||
              b.id?.toLowerCase() === urlRef.toLowerCase()
          );

          if (!matchExisting) {
            const cleanRef = urlRef.trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
            let query = supabase
              .from('bookings')
              .select(`
                *,
                driver:drivers(
                  *,
                  profile:profiles(*),
                  assigned_vehicle:rate_vehicle_types(*)
                ),
                additional_charges(*),
                payments(*)
              `);

            query = isUuid
              ? query.or(`booking_reference.ilike.${cleanRef},id.eq.${cleanRef}`)
              : query.ilike('booking_reference', cleanRef);

            const { data: specificBooking, error: specErr } = await query.maybeSingle();

            if (!specErr && specificBooking) {
              bookingsList = [specificBooking, ...bookingsList];
            }
          }
        }

        // 4. Context Store Fallback: In demo/mock mode or if DB returned empty
        if (bookingsList.length === 0 && contextBookings && contextBookings.length > 0) {
          if (urlRef) {
            const matchInContext = contextBookings.find(
              (b) =>
                b.booking_reference?.toLowerCase() === urlRef.toLowerCase() ||
                b.id?.toLowerCase() === urlRef.toLowerCase()
            );
            if (matchInContext) bookingsList = [matchInContext];
          }
          if (bookingsList.length === 0 && targetId) {
            bookingsList = contextBookings.filter((b) => b.customer_id === targetId);
          }
          if (bookingsList.length === 0) {
            bookingsList = contextBookings;
          }
        }

        // 5. Normalize relations and populate driver fallback if missing
        const enhancedBookings: Booking[] = await Promise.all(
          bookingsList.map(async (rawB: any) => {
            const b = { ...rawB };
            // Ensure additional_charges array
            if (!b.additional_charges || !Array.isArray(b.additional_charges)) {
              b.additional_charges = [];
            }
            // Ensure primary payment is populated
            if (!b.payment && Array.isArray(b.payments) && b.payments.length > 0) {
              b.payment = b.payments[0];
            }

            // If a booking has assigned_driver_id, fetch authoritative driver details from Supabase
            if (b.assigned_driver_id) {
              try {
                const driverData = await fetchDriverDetails(supabase, b.assigned_driver_id);
                if (driverData) {
                  b.driver = driverData;
                }
              } catch (err) {
                console.warn('Driver fetch error for track page:', err);
              }
            }
            return b as Booking;
          })
        );

        setCustomerBookings(enhancedBookings);
        setLastSyncedAt(new Date());

        // Select the active booking (urlRef takes precedence!)
        const targetSelection = resolveSelectedBooking(enhancedBookings, urlRef || selectedBookingRef.current?.booking_reference);

        if (targetSelection) {
          setSelectedBooking(targetSelection);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, targetSelection.booking_reference);
              // Update URL parameter without reload (only when no ref was specified in the URL)
              const currentUrlParam = new URLSearchParams(window.location.search).get('ref');
              if (!currentUrlParam && targetSelection.booking_reference) {
                window.history.replaceState(
                  null,
                  '',
                  `?ref=${encodeURIComponent(targetSelection.booking_reference)}`
                );
              }
            } catch { }
          }
        } else {
          setSelectedBooking(null);
        }
      } catch (err: any) {
        console.error('Unexpected error loading journey radar:', err);
        setError(err?.message || 'An unexpected error occurred while loading telemetry.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser?.id, urlRef, resolveSelectedBooking, contextBookings]
  );

  // Initial load and auth state observer
  useEffect(() => {
    fetchCustomerBookings();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid) {
        setAuthenticatedUserId(uid);
        fetchCustomerBookings(uid);
      } else {
        setAuthenticatedUserId(null);
        // Don't wipe bookings if urlRef is available
        if (!urlRef) {
          setCustomerBookings([]);
          setSelectedBooking(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      authSub.unsubscribe();
    };
  }, [fetchCustomerBookings, urlRef]);

  // Real-time Supabase postgres_changes subscription
  useEffect(() => {
    if (!authenticatedUserId) return;

    const channel = supabase
      .channel(`radar_customer_${authenticatedUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${authenticatedUserId}`,
        },
        async (payload) => {
          setLastSyncedAt(new Date());

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            const isCurrentlySelected = selectedBookingRef.current?.id === updated.id;

            // Fetch the updated booking with driver relations, charges, and payments
            const { data: fullUpdated } = await supabase
              .from('bookings')
              .select(`
                *,
                driver:drivers(
                  *,
                  profile:profiles(*),
                  assigned_vehicle:rate_vehicle_types(*)
                ),
                additional_charges(*),
                payments(*)
              `)
              .eq('id', updated.id)
              .maybeSingle();

            const refreshedBooking: Booking = {
              ...(fullUpdated || updated),
              additional_charges: Array.isArray((fullUpdated || updated)?.additional_charges)
                ? (fullUpdated || updated).additional_charges
                : [],
              payment:
                Array.isArray((fullUpdated || updated)?.payments) && (fullUpdated || updated).payments.length > 0
                  ? (fullUpdated || updated).payments[0]
                  : (fullUpdated || updated)?.payment || null,
            };

            // Fetch real driver information using the assigned driver's actual ID
            if (refreshedBooking.assigned_driver_id) {
              try {
                const driverData = await fetchDriverDetails(supabase, refreshedBooking.assigned_driver_id);
                if (driverData) {
                  refreshedBooking.driver = driverData;
                }
              } catch (err) {
                console.warn('Realtime driver fetch notice:', err);
              }
            }

            // Update bookings list
            setCustomerBookings((prev) =>
              prev.map((b) => (b.id === refreshedBooking.id ? refreshedBooking : b))
            );

            // If this is the currently selected booking, update it immediately
            if (isCurrentlySelected) {
              setSelectedBooking(refreshedBooking);
              toast.info(`Journey Status: ${formatStatusName(refreshedBooking.status)}`, {
                description: `Live update received for booking #${refreshedBooking.booking_reference}`,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            // New booking created
            const newRow = payload.new as any;
            toast.success(`New Journey Registered: #${newRow.booking_reference}`);
            fetchCustomerBookings(authenticatedUserId, false);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            setCustomerBookings((prev) => prev.filter((b) => b.id !== deletedId));
            if (selectedBookingRef.current?.id === deletedId) {
              setSelectedBooking(null);
            }
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticatedUserId, fetchCustomerBookings]);

  // Switch to a different booking
  const handleSelectBooking = (bookingId: string) => {
    const found = customerBookings.find((b) => b.id === bookingId || b.booking_reference === bookingId);
    if (found) {
      setSelectedBooking(found);
      setRatingSubmitted(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, found.booking_reference);
          window.history.replaceState(null, '', `?ref=${encodeURIComponent(found.booking_reference)}`);
        } catch { }
      }
      toast.success(`Switched to booking #${found.booking_reference}`);
    }
  };

  // Assigned driver for selected booking
  const assignedDriver = useMemo(() => {
    if (!selectedBooking) return null;
    return selectedBooking.driver || null;
  }, [selectedBooking]);

  // Active step calculation strictly for the selected booking
  const activeStepIdx = useMemo(() => {
    if (!selectedBooking) return 0;
    return getActiveStepIndex(selectedBooking.status, selectedBooking.assigned_driver_id);
  }, [selectedBooking?.status, selectedBooking?.assigned_driver_id]);

  const isCancelled =
    selectedBooking?.status === 'cancelled' || selectedBooking?.status === 'rejected';

  const isPaymentRejected = selectedBooking?.status === 'payment_rejected';

  const isCompleted =
    selectedBooking?.status === 'completed' ||
    selectedBooking?.status === 'trip_completed' ||
    selectedBooking?.status === 'ride_completed' ||
    selectedBooking?.status === 'payment_completed';

  // Display name helpers for service & vehicle class
  const serviceDisplayName = useMemo(() => {
    if (!selectedBooking) return isRTL ? 'توصيل كابتن تنفيذي VIP' : 'VIP Chauffeur Transfer';
    const sType = selectedBooking.service_type;
    if (sType === 'ziyarat_taif') return isRTL ? 'مزارات الطائف التاريخية والجبلية' : 'Taif Mountain & Historic Ziyarat';
    if (sType === 'ziyarat_makkah') return isRTL ? 'مزارات مكة المكرمة والمشاعر المقدسة' : 'Makkah Holy Sites Ziyarat';
    if (sType === 'ziyarat_madinah') return isRTL ? 'مزارات المدينة المنورة التاريخية' : 'Madinah Holy Sites Ziyarat';
    if (sType === 'intercity_jeddah_makkah') return isRTL ? 'مطار جدة ➔ مكة المكرمة' : 'Jeddah Airport ➔ Makkah Transfer';
    if (sType === 'intercity_makkah_jeddah') return isRTL ? 'مكة المكرمة ➔ مطار جدة' : 'Makkah ➔ Jeddah Transfer';
    if (sType === 'intercity_makkah_madinah') return isRTL ? 'مكة المكرمة ➔ المدينة المنورة (طريق الهجرة السريع)' : 'Makkah ➔ Madinah VIP Highway';
    if (sType === 'intercity_madinah_makkah') return isRTL ? 'المدينة المنورة ➔ مكة المكرمة (طريق الهجرة السريع)' : 'Madinah ➔ Makkah VIP Highway';
    if (sType === 'intercity_jeddah_madinah') return isRTL ? 'جدة ➔ المدينة المنورة السريع' : 'Jeddah ➔ Madinah Express';
    if (sType === 'intercity_madinah_jeddah') return isRTL ? 'المدينة المنورة ➔ جدة السريع' : 'Madinah ➔ Jeddah Express';
    if (sType === 'hourly_charter') return isRTL ? 'تأجير كابتن خاص بالساعات' : 'Dedicated Chauffeur Hourly Charter';
    if (selectedBooking.booking_method === 'fixed') return isRTL ? 'باقة عمرة وزيارة ثابتة' : 'Fixed VIP Pilgrimage Package';
    return isRTL ? 'رحلة VIP خاصة' : 'VIP Chauffeur Journey';
  }, [selectedBooking, isRTL]);

  const vehicleClassDisplayName = useMemo(() => {
    if (!selectedBooking) return isRTL ? 'أسطول VIP الفاخر' : 'Executive VIP Fleet';
    const vCat = selectedBooking.vehicle_category || selectedBooking.vehicle_type;
    if (vCat === 'gmc' || vCat === 'vip_gmc') return isRTL ? 'جمس يوكون XL / سوبربان رويال VIP' : 'GMC Yukon XL / Suburban Royal VIP';
    if (vCat === 'staria') return isRTL ? 'هيونداي ستاريا VIP لاونج رجال الأعمال' : 'Hyundai Staria VIP Business Lounge';
    if (vCat === 'hiroof') return isRTL ? 'تويوتا هايس هاي روف سياحي فاخر' : 'Toyota HiAce High Roof Minibus';
    if (vCat === 'sedan') return isRTL ? 'كامري / لكزس ES سيدان تنفيذي' : 'Camry / Lexus ES Executive Sedan';
    if (vCat === 'suv') return isRTL ? 'جيب VIP فاخر' : 'Luxury VIP SUV';
    if (vCat === 'van') return isRTL ? 'تويوتا هايس رويال لاونج' : 'Toyota HiAce Royal Lounge';
    if (vCat === 'bus') return isRTL ? 'حافلة VIP سياحية فاخرة' : 'VIP Luxury Coach';
    return selectedBooking.vehicle_type?.replace(/_/g, ' ').toUpperCase() || (isRTL ? 'أسطول VIP' : 'VIP Fleet');
  }, [selectedBooking, isRTL]);

  // Pricing & Billing Logic
  const isCustomRoute = selectedBooking?.booking_method === 'custom';
  const isPendingQuote =
    isCustomRoute &&
    (selectedBooking?.status === 'pending_review' ||
      (selectedBooking?.estimated_fare == null &&
        selectedBooking?.fixed_fare_amount == null &&
        selectedBooking?.final_fare == null &&
        selectedBooking?.confirmed_fare == null));

  // Base Journey Fare (authoritative package fare or estimated distance fare)
  const baseFare = useMemo(() => {
    if (isPendingQuote) return 0;
    return Number(
      selectedBooking?.fixed_fare_amount ??
      selectedBooking?.confirmed_fare ??
      selectedBooking?.estimated_fare ??
      0
    );
  }, [selectedBooking, isPendingQuote]);

  // Additional itemized charges
  const additionalChargesList: AdditionalCharge[] = useMemo(() => {
    if (!selectedBooking?.additional_charges) return [];
    return Array.isArray(selectedBooking.additional_charges) ? selectedBooking.additional_charges : [];
  }, [selectedBooking?.additional_charges]);

  const extraChargesTotal = useMemo(() => {
    return additionalChargesList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [additionalChargesList]);

  // Final Fare from DB if explicitly stored
  const finalFareDb = selectedBooking?.final_fare != null ? Number(selectedBooking.final_fare) : null;

  // Total all-inclusive fare
  const totalFare = useMemo(() => {
    if (isPendingQuote) return null;
    if (finalFareDb != null && finalFareDb > 0) {
      return Math.max(finalFareDb, baseFare + extraChargesTotal);
    }
    return baseFare + extraChargesTotal;
  }, [isPendingQuote, finalFareDb, baseFare, extraChargesTotal]);

  // Manual Adjustment / Surcharge / Discount (if final_fare in DB diverges from base + extras)
  const fareAdjustment = useMemo(() => {
    if (finalFareDb == null || totalFare == null) return 0;
    const standardTotal = baseFare + extraChargesTotal;
    const diff = finalFareDb - standardTotal;
    return Math.abs(diff) > 0.01 ? diff : 0;
  }, [finalFareDb, totalFare, baseFare, extraChargesTotal]);

  // Fixed Pricing Policy: All passenger transportation fares are guaranteed fixed prices without additional taxes


  const paymentStatus = selectedBooking?.payment_status?.toLowerCase();
  const bookingStatus = selectedBooking?.status;

  const paymentBadge = useMemo(() => {
    if (!selectedBooking) {
      return {
        label: isRTL ? 'بانتظار تحديد الأجرة' : 'Awaiting Fare',
        bg: 'bg-muted/10 border-base',
        text: 'text-muted',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }

    if (isCancelled) {
      return {
        label: isRTL ? 'تم إلغاء الرحلة' : 'Trip Cancelled',
        bg: 'bg-rose-500/10 border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-400',
        icon: <XCircle className="w-3.5 h-3.5" />,
      };
    }

    if (bookingStatus === 'payment_rejected' || paymentStatus === 'failed') {
      return {
        label: isRTL ? 'تم رفض إيصال الدفع' : 'Payment Rejected',
        bg: 'bg-rose-500/10 border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-400',
        icon: <XCircle className="w-3.5 h-3.5" />,
      };
    }

    if (paymentStatus === 'refunded') {
      return {
        label: isRTL ? 'تم استرجاع الأجرة' : 'Fare Refunded',
        bg: 'bg-slate-500/10 border-slate-500/30',
        text: 'text-slate-600 dark:text-slate-400',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
      };
    }

    if (isPendingQuote) {
      return {
        label: isRTL ? 'عرض السعر قيد المراجعة' : 'Quote Under Review',
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }

    // Paid & verified verification states
    if (
      paymentStatus === 'paid' ||
      bookingStatus === 'confirmed' ||
      bookingStatus === 'payment_verified' ||
      bookingStatus === 'payment_completed' ||
      bookingStatus === 'driver_assigned' ||
      bookingStatus === 'driver_accepted' ||
      bookingStatus === 'driver_arriving' ||
      bookingStatus === 'driver_arrived' ||
      bookingStatus === 'trip_started' ||
      bookingStatus === 'completed' ||
      bookingStatus === 'trip_completed'
    ) {
      return {
        label: isRTL ? 'مدفوع وموثق' : 'Paid & Verified',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
    }

    // Cash on boarding
    if (selectedBooking.payment?.method === 'cash') {
      return {
        label: isRTL ? 'نقداً عند الصعود' : 'Cash on Boarding',
        bg: 'bg-blue-500/10 border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }

    // Proof uploaded awaiting dispatch check
    if (selectedBooking.payment_screenshot_url && paymentStatus === 'pending') {
      return {
        label: isRTL ? 'إيصال التحويل قيد التدقيق' : 'Transfer Slip Under Review',
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }

    return {
      label: isRTL ? 'بانتظار التحقق' : 'Verification Pending',
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }, [selectedBooking, isCancelled, bookingStatus, paymentStatus, isPendingQuote, isRTL]);

  const paymentDetails = useMemo(() => {
    if (!selectedBooking) return null;

    const method = selectedBooking.payment?.method;
    const isPaid = paymentStatus === 'paid';
    const hasProof = Boolean(selectedBooking.payment_screenshot_url);
    const txRef = selectedBooking.payment?.transaction_reference || selectedBooking.booking_reference;

    let label = isRTL ? 'تحويل بنكي / تم رفع الإيصال' : 'Bank Transfer / Proof Uploaded';
    let iconName: 'bank' | 'card' | 'cash' = 'bank';

    if (method === 'cash') {
      label = isPaid ? (isRTL ? 'تم الدفع نقداً للكابتن' : 'Cash Paid to Captain') : (isRTL ? 'نقداً عند الصعود' : 'Cash on Boarding');
      iconName = 'cash';
    } else if (method === 'card') {
      label = isRTL ? 'بطاقة مدى / ائتمان' : 'Credit / Debit Card (Mada)';
      iconName = 'card';
    } else if (hasProof) {
      label = isPaid ? (isRTL ? 'تحويل بنكي (إيصال معتمد)' : 'Bank Transfer (Verified Slip)') : (isRTL ? 'تحويل بنكي (الإيصال مرفق)' : 'Bank Transfer (Proof Attached)');
      iconName = 'bank';
    } else if (method === 'online') {
      label = isRTL ? 'دفع إلكتروني معتمد' : 'Online Payment (Verified)';
      iconName = 'card';
    }

    return {
      label,
      iconName,
      txRef,
      isPaid,
      hasProof,
    };
  }, [selectedBooking, paymentStatus, isRTL]);

  const handleCopyRef = () => {
    if (!selectedBooking) return;
    navigator.clipboard.writeText(selectedBooking.booking_reference);
    toast.success('Booking reference copied to clipboard!');
  };

  const handleOpenPdfInvoice = () => {
    if (!selectedBooking) return;
    if (isPendingQuote) {
      toast.info('Invoice will be generated once dispatcher confirms the fare quote.');
      return;
    }

    try {
      const invoiceNum = `INV-${selectedBooking.booking_reference.replace(/[^0-9A-Z]/gi, '')}`;
      const driverName = assignedDriver?.profile?.full_name || assignedDriver?.full_name || 'Executive VIP Chauffeur';
      const vehicleName = (assignedDriver?.assigned_vehicle as any)?.name ||
        `${assignedDriver?.assigned_vehicle?.make || ''} ${assignedDriver?.assigned_vehicle?.model || ''}`.trim() ||
        vehicleClassDisplayName;
      const plate = assignedDriver?.assigned_vehicle?.plate_number || 'KSA-VIP';

      const pdfData = createInvoicePdfBlobUrl({
        companyName: settings?.company_name || 'Al Harmain Travels',
        invoiceNumber: invoiceNum,
        dateStr: formatDateTime(selectedBooking.created_at),
        passengerName: selectedBooking.passenger_name || 'VIP Guest',
        passengerPhone: selectedBooking.passenger_phone || '',
        bookingRef: selectedBooking.booking_reference,
        chauffeurName: driverName,
        vehicleName: vehicleName,
        plateNumber: plate,
        serviceName: serviceDisplayName,
        pickupAddress: selectedBooking.pickup_address,
        destAddress: selectedBooking.destination_address,
        fareAmount: String(totalFare || 0),
        currency: settings?.currency || 'SAR',
        paymentMethod: paymentDetails?.label || 'Bank Transfer (Verified)',
        paymentStatus: selectedBooking.payment_status || 'paid',
      });

      if (pdfBlobData?.blobUrl) {
        URL.revokeObjectURL(pdfBlobData.blobUrl);
      }

      setPdfBlobData(pdfData);
      setShowInvoice(true);
    } catch (err) {
      console.error('Failed to generate PDF invoice:', err);
      toast.error('Unable to generate PDF invoice. Please retry.');
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !assignedDriver || isSubmittingRating) return;

    setIsSubmittingRating(true);
    try {
      await submitRating({
        booking_id: selectedBooking.id,
        customer_id: selectedBooking.customer_id || undefined,
        driver_id: assignedDriver.id,
        rating: ratingVal,
        feedback: feedbackText,
        category: 'rating',
      });
      setRatingSubmitted(true);
    } catch (err: any) {
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Progress percentage
  const progressPercent = isCompleted ? 100 : Math.round(((activeStepIdx + 1) / 8) * 100);

  // Active step config
  const currentStepConfig = trackingSteps[activeStepIdx] || trackingSteps[0];

  // ==========================================
  // Render States: Loading, Error, Empty
  // ==========================================

  if (isLoading) {
    return (
      <div className="page-shell h-[calc(100dvh-9.5rem)] -mb-24 lg:mb-0 lg:h-auto lg:min-h-[65vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-emerald-500/40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-surface border border-emerald-500/30 flex items-center justify-center shadow-lg">
            <Radio className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
            Connecting to Live Journey Radar...
          </h2>
        </div>
      </div>
    );
  }

  if (error && customerBookings.length === 0) {
    return (
      <div className="page-shell py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="type-page-title">Connection Error</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">{error}</p>
        </div>
        <button
          onClick={() => fetchCustomerBookings(authenticatedUserId || undefined, true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Telemetry Connection
        </button>
      </div>
    );
  }

  if (!selectedBooking) {
    return (
      <div className="page-shell py-20 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-xl">
          <Car className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="type-page-title">No Active Bookings Found To Track</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">
            You do not currently have any registered transportation bookings in your account. Reserve a VIP ride to monitor its real-time journey status.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/customer" className="btn-primary">
            Book a Journey
          </Link>
          <Link href="/customer/bookings" className="btn-secondary">
            View My Bookings
          </Link>
          <button
            onClick={() => fetchCustomerBookings(authenticatedUserId || undefined, true)}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-elevated text-secondary text-xs font-semibold border border-base flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-4 pb-8" dir={dir}>
      {/* ========================================================= */}
      {/* Page Header Strip & Multiple Bookings Selector */}
      {/* ========================================================= */}
      <div className="bg-card border border-base p-4 sm:p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="type-eyebrow text-emerald-600 dark:text-emerald-400">
                {isRTL ? 'شركة الحرمين للنقل الفاخر' : 'Al Harmain VIP Telemetry'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {isRealtimeActive ? (isRTL ? 'متزامن بالوقت الفعلي' : 'Live Realtime Synced') : (isRTL ? 'متصل بقاعدة البيانات' : 'Connected to Supabase')}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{isRTL ? 'رادار الرحلة المباشر' : 'Live Journey Radar'}</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="group inline-flex items-center gap-1 font-mono text-base sm:text-lg font-bold text-amber-500 dark:text-amber-400 hover:text-amber-600 transition-colors cursor-pointer"
                title={isRTL ? 'انقر لنسخ المرجع' : 'Click to copy reference'}
              >
                <span>#{selectedBooking.booking_reference}</span>
                <Copy className="w-3.5 h-3.5 text-muted group-hover:text-amber-500 transition-colors" />
              </button>
            </h1>
            <p className="text-[11px] text-secondary mt-0.5">
              {isRTL ? 'تسلسل رحلة النقل الفاخر المعتمد والمحدث مباشرة من غرفة العمليات المركزية.' : 'Deterministic 8-stage journey progression strictly synchronized with Supabase database state.'}
            </p>
          </div>

          {/* Action Strip: Booking Switcher & Refresh Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {customerBookings.length > 1 && (
              <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-base">
                <span className="text-[11px] text-muted font-medium flex items-center gap-1 px-1">
                  <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline">{isRTL ? 'اختر الرحلة:' : 'Select Ride:'}</span>
                </span>
                <select
                  value={selectedBooking.id}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="bg-card text-xs font-semibold text-primary px-2.5 py-1 rounded-lg border border-base focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[190px] truncate"
                >
                  {customerBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booking_reference} &bull; {formatStatusName(b.status)} ({formatDateTime(b.scheduled_at || b.created_at)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchCustomerBookings(authenticatedUserId || undefined, true)}
              disabled={isRefreshing}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-surface hover:bg-elevated text-secondary hover:text-primary text-xs font-semibold border border-base flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title={isRTL ? 'إعادة المزامنة مع قاعدة البيانات' : 'Force re-sync with Supabase'}
            >
              <RefreshCw className={`w-3 h-3 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Re-sync'}</span>
            </button>
          </div>
        </div>

        {/* Cancellation or Rejection Alerts */}
        {isCancelled && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs block">{isRTL ? 'تم إلغاء هذه الرحلة' : 'Journey Cancelled in Database'}</span>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300 text-[11px]">
                {selectedBooking.cancellation_reason || (isRTL ? 'تم إلغاء حجز هذه الرحلة في نظام الترحيل.' : 'This journey reservation was cancelled in the dispatch database.')}
              </p>
            </div>
          </div>
        )}

        {isPaymentRejected && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs block">{isRTL ? 'مطلوب التحقق من عملية الدفع' : 'Payment Verification Required'}</span>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300 text-[11px]">
                {selectedBooking.payment_rejected_reason || (isRTL ? 'تعذر تأكيد الدفع من قبل المشرفين. يرجى مراجعة إشعار التحويل أو التواصل مع العمليات.' : 'Payment verification could not be approved by operations staff. Please review your payment or contact dispatch.')}
              </p>
            </div>
          </div>
        )}

        {/* Selected Booking Quick Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-base text-xs">
          <div className="bg-surface/60 p-2.5 rounded-xl border border-base">
            <span className="text-[9.5px] uppercase font-bold text-muted block">{isRTL ? 'المسار والمسافر' : 'Route & Passenger'}</span>
            <div className="mt-1 space-y-0.5">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-primary line-clamp-1 text-[11px]">{selectedBooking.pickup_address}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Flag className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-primary line-clamp-1 text-[11px]">{selectedBooking.destination_address}</span>
              </div>
            </div>
            <span className="text-[10.5px] text-muted block mt-1">{isRTL ? 'المسافر:' : 'Passenger:'} {selectedBooking.passenger_name}</span>
          </div>

          <div className="bg-surface/60 p-2.5 rounded-xl border border-base">
            <span className="text-[9.5px] uppercase font-bold text-muted block">
              {selectedBooking.booking_type === 'immediate'
                ? (isRTL ? 'توقيت الخدمة' : 'Service Timing')
                : (isRTL ? 'موعد الرحلة المجدول' : 'Scheduled Pickup Time')}
            </span>
            <span className="font-semibold text-primary text-xs mt-0.5 block">
              {selectedBooking.booking_type === 'immediate' ? (
                <span className="text-amber-700 flex items-center gap-1 font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" />
                  {isRTL ? 'حجز فوري (مباشر)' : 'Book Now (Immediate / ASAP)'}
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedBooking.scheduled_at ? formatDateTime(selectedBooking.scheduled_at) : '—'} (AST)
                </span>
              )}
            </span>
            <span className="text-[10.5px] text-muted block mt-0.5">
              {isRTL ? 'تم الطلب في: ' : 'Requested on: '} {formatDateTime(selectedBooking.created_at)}
            </span>
          </div>

          <div className="bg-surface/60 p-2.5 rounded-xl border border-base">
            <span className="text-[9.5px] uppercase font-bold text-muted block">{isRTL ? 'المركبة التنفيذية' : 'Executive Vehicle'}</span>
            <span className="font-semibold text-primary text-xs mt-0.5 uppercase block">
              {vehicleClassDisplayName}
            </span>
            <span className="text-[10.5px] text-muted">
              {assignedDriver
                ? `${isRTL ? 'الكابتن' : 'Captain'} ${assignedDriver.profile?.full_name || assignedDriver.full_name}`
                : (isRTL ? 'بانتظار تعيين السائق' : 'Awaiting Chauffeur')}
            </span>
          </div>

          <div className="bg-surface/60 p-2.5 rounded-xl border border-base flex flex-col justify-between">
            <div>
              <span className="text-[9.5px] uppercase font-bold text-muted block">{isRTL ? 'إجمالي الأجرة' : 'Total Trip Fare'}</span>
              <span className="font-bold text-amber-500 dark:text-amber-400 text-sm sm:text-base mt-0.5 block">
                {formatCurrency(totalFare, settings?.currency || 'SAR')}
              </span>
            </div>
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border self-start ${paymentBadge.bg} ${paymentBadge.text}`}>
              {paymentBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2-COLUMN SECTION: LIVE JOURNEY RADAR & CHAUFFEUR / BILLING */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column: The 8-Stage Live Journey Radar Timeline */}
        <div className="lg:col-span-8 bg-card border border-base p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
          <div className="border-b border-base pb-3 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{isRTL ? 'الرحلة المباشرة' : 'LIVE JOURNEY'}</span>
                <span className="text-muted font-normal">•</span>
                <span className="font-mono text-[10px]">{isRTL ? 'تتبع مباشر بنظام GPS' : 'Real-Time GPS Tracking'}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-primary flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-500" />
                {isRTL ? 'رادار الرحلة والمخطط الزمني' : 'Live Journey Radar & Progression Timeline'}
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                {isRTL ? `تسلسل معتمد لمراحل نقل كبار الشخصيات للحجز رقم #${selectedBooking.booking_reference}.` : `Exact sequence of verified VIP transportation stages for booking #${selectedBooking.booking_reference}.`}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400">
              {activeStepIdx + 1}/8 {isRTL ? 'مراحل' : 'Milestones'}
            </span>
          </div>

          {/* Sequential Step Cards with Connectors */}
          <div className="relative space-y-4 pl-1 rtl:pl-0 rtl:pr-1">
            {trackingSteps.map((step, idx) => {
              const isDone = idx < activeStepIdx || (idx === 7 && isCompleted);
              const isCurrent = idx === activeStepIdx && !isCompleted;
              const isPending = idx > activeStepIdx;
              const isLast = idx === trackingSteps.length - 1;

              return (
                <div key={step.id} className="relative flex items-start gap-3 sm:gap-4 group">
                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div
                      className={`absolute left-[15px] sm:left-[17px] rtl:left-auto rtl:right-[15px] rtl:sm:right-[17px] top-8 bottom-[-18px] w-0.5 transition-colors duration-500 ${isDone ? 'bg-emerald-500' : 'bg-surface border-l-2 rtl:border-l-0 rtl:border-r-2 border-dashed border-base'
                        }`}
                    />
                  )}

                  {/* Step Marker Icon */}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm ${isDone
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/20'
                      : isCurrent
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-400/40 animate-pulse scale-105'
                        : 'bg-surface text-muted border border-base'
                      }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      step.icon({ className: 'w-4 h-4' })
                    )}
                  </div>

                  {/* Step Content Body Card */}
                  <div
                    className={`flex-1 p-3 sm:p-3.5 rounded-xl border transition-all ${isCurrent
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                      : isDone
                        ? 'bg-surface/50 border-base'
                        : 'bg-surface/20 border-base opacity-60'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-muted">
                          0{step.id}
                        </span>
                        <h3 className="font-bold text-primary text-xs sm:text-sm">
                          {step.title}
                        </h3>
                        <span className="text-[11px] text-muted font-medium">
                          &mdash; {step.subtitle}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> {isRTL ? 'مكتمل' : 'Completed'}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            {isRTL ? 'المرحلة النشطة' : 'Active Phase'}
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-base">
                            {isRTL ? 'قيد الانتظار' : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-secondary mt-1.5 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Contextual Step Data */}
                    {step.id === 1 && (
                      <div className="mt-2 pt-2 border-t border-base/60 text-[11px] text-muted flex items-center justify-between flex-wrap gap-2">
                        <span>{isRTL ? 'تاريخ ووقت الطلب:' : 'Submitted At:'} <strong>{formatDateTime(selectedBooking.created_at)}</strong></span>
                        <span className="font-mono">{isRTL ? 'المرجع:' : 'Ref:'} {selectedBooking.booking_reference}</span>
                      </div>
                    )}

                    {step.id === 2 && isDone && (
                      <div className="mt-2 pt-2 border-t border-base/60 text-[11px] flex items-center justify-between flex-wrap gap-2 text-emerald-700 dark:text-emerald-300">
                        <span className="flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          {isRTL ? 'تم التحقق من حالة الدفع وتأكيدها بواسطة العمليات المركزية.' : 'Payment status verified & approved by Central Operations.'}
                        </span>
                        <span className="font-bold uppercase">{selectedBooking.payment_status || 'PAID'}</span>
                      </div>
                    )}

                    {/* Driver details attached to Step 3 & Step 4 */}
                    {(step.id === 3 || step.id === 4) && (isDone || isCurrent) && assignedDriver && (
                      <div className="mt-2 pt-2 border-t border-base/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-card/80 p-2.5 rounded-xl border border-base">
                        <div className="flex items-center gap-2.5">
                          {assignedDriver.avatar_url || assignedDriver.profile?.avatar_url ? (
                            <img
                              src={assignedDriver.avatar_url || assignedDriver.profile?.avatar_url || ''}
                              alt={assignedDriver.profile?.full_name || assignedDriver.full_name || 'Captain'}
                              className="w-8 h-8 rounded-lg object-cover border border-emerald-500 shadow-xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-emerald-500">
                              {assignedDriver.profile?.full_name?.charAt(0) || assignedDriver.full_name?.charAt(0) || 'C'}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-primary block text-xs">
                              {isRTL ? 'الكابتن' : 'Captain'} {assignedDriver.profile?.full_name || assignedDriver.full_name}
                            </span>
                            <span className="text-[10.5px] text-muted">
                              {isRTL ? 'المركبة:' : 'Vehicle:'} {assignedDriver.assigned_vehicle?.make ? `${assignedDriver.assigned_vehicle.make} ${assignedDriver.assigned_vehicle.model || ''}`.trim() : (selectedBooking.vehicle_type?.replace(/_/g, ' ').toUpperCase() || 'VIP Fleet')} &bull; {isRTL ? 'اللوحة:' : 'Plate:'} {assignedDriver.assigned_vehicle?.plate_number || 'KSA 3312'}
                            </span>
                          </div>
                        </div>

                        {(assignedDriver.profile?.phone || assignedDriver.phone) && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${assignedDriver.profile?.phone || assignedDriver.phone}`}
                              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-elevated text-primary text-[11px] font-semibold flex items-center gap-1 border border-base"
                            >
                              <Phone className="w-3 h-3 text-emerald-500" /> {isRTL ? 'اتصال' : 'Call'}
                            </a>
                            <a
                              href={`https://wa.me/${(assignedDriver.profile?.phone || assignedDriver.phone || '').replace(/[^0-9]/g, '')}?text=Salam%20Captain%2C%20I%20am%20passenger%20for%20booking%20${selectedBooking.booking_reference}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-500" /> {isRTL ? 'واتساب' : 'WhatsApp'}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {step.id === 8 && isCompleted && (
                      <div className="mt-2 pt-2 border-t border-base/60 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        <span>{isRTL ? 'اكتملت الرحلة بنجاح. نتطلع لخدمتكم مرة أخرى دائماً.' : 'Journey concluded successfully. We look forward to serving you again.'}</span>
                        <span className="font-bold">{isRTL ? 'الفاتورة الرسمية متوفرة' : 'Official Invoice Available'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chauffeur Card & Billing Summary */}
        <div className="lg:col-span-4 space-y-4">
          {/* Driver & Vehicle Information Card */}
          {assignedDriver ? (
            <div className="bg-card border border-base rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {assignedDriver.avatar_url || assignedDriver.profile?.avatar_url ? (
                    <img
                      src={assignedDriver.avatar_url || assignedDriver.profile?.avatar_url || ''}
                      alt={assignedDriver.profile?.full_name || 'Captain'}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm border border-emerald-400">
                      {assignedDriver.profile?.full_name?.charAt(0) || assignedDriver.full_name?.charAt(0) || 'C'}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow" title="Verified Captain">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[9.5px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {isRTL ? 'السائق التنفيذي المعين' : 'Assigned VIP Chauffeur'}
                  </span>
                  <h3 className="font-bold text-primary truncate text-sm mt-0.5">
                    {isRTL ? 'الكابتن' : 'Captain'} {assignedDriver.profile?.full_name || assignedDriver.full_name || (isRTL ? 'سائق تنفيذي' : 'Executive Chauffeur')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const ratingInfo = formatDriverRating(assignedDriver.rating, assignedDriver.rating_count);
                      if (ratingInfo.isNew) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                            <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                            <span>{isRTL ? 'كابتن جديد (معتمد)' : 'New Captain (Verified)'}</span>
                          </span>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/40">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {ratingInfo.display}
                          </span>
                          <span className="text-[10px] text-muted">
                            ({ratingInfo.countLabel})
                          </span>
                        </div>
                      );
                    })()}
                    <span className="text-[11px] text-muted font-medium">
                      &bull; {assignedDriver.total_rides || 0} {isRTL ? 'رحلة مكتملة' : (assignedDriver.total_rides === 1 ? 'completed ride' : 'completed rides')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className="p-3 rounded-xl bg-surface border border-base space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">{isRTL ? 'المركبة المعينة' : 'Assigned Vehicle'}</span>
                  <span className="font-bold text-primary truncate max-w-[170px] text-right">
                    {assignedDriver.assigned_vehicle?.make
                      ? `${assignedDriver.assigned_vehicle.make} ${assignedDriver.assigned_vehicle.model || ''}`.trim()
                      : (selectedBooking.vehicle_type?.replace(/_/g, ' ').toUpperCase() || 'Executive VIP Fleet')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">{isRTL ? 'لوحة الترخيص' : 'License Plate'}</span>
                  <div className="px-2 py-0.5 rounded-md bg-white text-slate-950 font-mono font-black text-xs tracking-wider border border-slate-900 shadow-xs flex items-center gap-1.5">
                    <span className="text-[9px] text-emerald-700 font-bold">KSA</span>
                    <span>{assignedDriver.assigned_vehicle?.plate_number || 'KSA 3312'}</span>
                  </div>
                </div>
                {assignedDriver.assigned_vehicle?.color && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">{isRTL ? 'اللون الخارجي' : 'Exterior Color'}</span>
                    <span className="font-medium text-secondary">{assignedDriver.assigned_vehicle.color}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted">{isRTL ? 'فئة المركبة' : 'Vehicle Class'}</span>
                  <span className="font-semibold text-secondary uppercase text-[11px]">
                    {vehicleClassDisplayName}
                  </span>
                </div>
                {assignedDriver.assigned_vehicle?.seating_capacity && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">{isRTL ? 'سعة المقاعد' : 'Seating Capacity'}</span>
                    <span className="font-medium text-secondary">{assignedDriver.assigned_vehicle.seating_capacity} {isRTL ? 'مقاعد ركاب' : 'Passenger Seats'}</span>
                  </div>
                )}
              </div>

              {/* Direct Passenger Contact Actions */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <a
                  href={`tel:${assignedDriver.profile?.phone || assignedDriver.phone || ''}`}
                  className="py-2 px-2.5 rounded-xl bg-surface hover:bg-elevated text-primary text-xs font-semibold flex items-center justify-center gap-1.5 border border-base transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {isRTL ? 'اتصال' : 'Call'}
                </a>
                <a
                  href={`https://wa.me/${(assignedDriver.profile?.phone || assignedDriver.phone || '').replace(/[^0-9]/g, '')}?text=Salam%20Captain%2C%20I%20am%20passenger%20for%20booking%20${selectedBooking.booking_reference}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-700/50 transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {isRTL ? 'واتساب' : 'WhatsApp'}
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-base rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-xs sm:text-sm">{isRTL ? 'جاري تخصيص السائق التنفيذي' : 'Chauffeur Allocation In Queue'}</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    {isRTL ? 'يقوم فريق الترحيل المركزي بتخصيص كابتن تنفيذي ومركبة فاخرة لحجزكم.' : 'Central dispatch is allocating an executive chauffeur and luxury vehicle for your reservation.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fare & Billing Summary Card */}
          <div className="bg-card border border-base rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            {/* Header: Title + Dynamic Status Badge */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">{isRTL ? 'الأجرة والفواتير' : 'Fare & Billing'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {selectedBooking.booking_method === 'fixed' ? (isRTL ? 'سعر ثابت' : 'Fixed') : (isRTL ? 'مسار مخصص' : 'Custom')}
                    </span>
                  </div>
                  <span className="text-[10.5px] text-muted font-medium block truncate max-w-[150px]">
                    {serviceDisplayName}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${paymentBadge.bg} ${paymentBadge.text}`}
              >
                {paymentBadge.icon}
                {paymentBadge.label}
              </span>
            </div>

            {/* Total Fare Display */}
            <div className="p-3 rounded-xl bg-surface border border-base flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">
                  {paymentStatus === 'paid' ? (isRTL ? 'المبلغ المسدد بالكامل' : 'Total Settled Amount') : (isRTL ? 'إجمالي قيمة الرحلة' : 'Total Fare Amount')}
                </span>
                {isPendingQuote ? (
                  <div className="mt-1 text-amber-500 font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>{isRTL ? 'عرض السعر قيد مراجعة المنسق' : 'Quote Pending Dispatch Review'}</span>
                  </div>
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
                    {formatCurrency(totalFare || 0, settings?.currency || 'SAR')}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {isRTL ? 'سعر مؤكد ومضمون' : 'Guaranteed Rate'}
                </span>
              </div>
            </div>

            {/* Itemized Fare Breakdown */}
            <div className="p-3 rounded-xl bg-surface/60 border border-base space-y-2 text-xs">
              {isPendingQuote ? (
                <div className="py-1 text-center text-muted text-xs leading-relaxed">
                  {isRTL ? 'تم تسجيل طلب مسارك المخصص في نظام العمليات. يقوم فريقنا بحساب تكلفة النقل الفاخر وتخصيص السائق.' : 'Your custom route request has been registered in central dispatch. Our team is calculating all-inclusive VIP rates with driver allocation.'}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-secondary">
                    <span className="text-muted font-medium text-[11px]">{isRTL ? 'الأجرة الأساسية:' : 'Base Fare:'}</span>
                    <span className="font-semibold text-primary">{formatCurrency(baseFare, settings?.currency || 'SAR')}</span>
                  </div>

                  {additionalChargesList.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-base/60">
                      {additionalChargesList.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-secondary text-[11px]">
                          <span className="text-muted capitalize">
                            {c.charge_type.replace('_', ' ')}:
                            {c.description ? ` (${c.description})` : ''}
                          </span>
                          <span className="font-semibold text-amber-500 dark:text-amber-400">
                            +{formatCurrency(Number(c.amount) || 0, settings?.currency || 'SAR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {fareAdjustment !== 0 && (
                    <div className="flex items-center justify-between text-secondary pt-1 border-t border-base/60 text-[11px]">
                      <span className="text-muted">
                        {fareAdjustment > 0 ? (isRTL ? 'تسوية إضافية:' : 'Adjustment:') : (isRTL ? 'خصم خاص VIP:' : 'VIP Adjustment:')}
                      </span>
                      <span className={`font-semibold ${fareAdjustment > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {fareAdjustment > 0 ? '+' : ''}{formatCurrency(fareAdjustment, settings?.currency || 'SAR')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-secondary pt-1 border-t border-base/60">
                    <span className="text-muted font-bold text-[11px]">{isRTL ? 'إجمالي الأجرة المضمونة:' : 'Total Guaranteed Fare:'}</span>
                    <span className="font-bold text-primary text-xs sm:text-sm">
                      {formatCurrency(totalFare || 0, settings?.currency || 'SAR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-secondary pt-1 border-t border-base/60 text-[11px]">
                    <span className="text-muted">{isRTL ? 'طريقة الدفع:' : 'Payment:'}</span>
                    <span className="font-semibold text-primary flex items-center gap-1">
                      {paymentDetails?.iconName === 'bank' && <Building2 className="w-3 h-3 text-amber-500" />}
                      {paymentDetails?.iconName === 'card' && <CreditCard className="w-3 h-3 text-amber-500" />}
                      {paymentDetails?.iconName === 'cash' && <Banknote className="w-3 h-3 text-emerald-500" />}
                      {paymentDetails?.label || 'Electronic Payment'}
                    </span>
                  </div>

                  {paymentDetails?.txRef && (
                    <div className="flex items-center justify-between text-secondary pt-0.5 text-[11px]">
                      <span className="text-muted">{isRTL ? 'رقم الحوالة:' : 'Trx ID:'}</span>
                      <span className="font-mono text-[10px] font-semibold text-primary bg-surface px-1.5 py-0.5 rounded border border-base">
                        {paymentDetails.txRef}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions: View Slip (if uploaded) & View VAT Invoice */}
            <div className="space-y-1.5 pt-0.5">
              {selectedBooking.payment_screenshot_url && (
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary text-xs font-semibold flex items-center justify-center gap-1.5 border border-base transition-colors shadow-sm cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  {isRTL ? 'عرض إشعار التحويل' : 'View Payment Slip'}
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenPdfInvoice}
                disabled={isPendingQuote}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99] cursor-pointer ${
                  isPendingQuote
                    ? 'bg-muted/30 text-muted cursor-not-allowed border border-base'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <Download className="w-3 h-3" />
                {isPendingQuote ? (isRTL ? 'فاتورة PDF (بانتظار السعر)' : 'PDF Invoice (Pending Quote)') : (isRTL ? 'تحميل فاتورة PDF' : 'Download PDF Invoice')}
              </button>
            </div>
          </div>

          {/* 5-Star Rating Card when trip is completed */}
          {isCompleted && (
            <div className="bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100/50 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 animate-fade-in text-primary dark:text-white">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                {isRTL ? 'تقييم رحلتك' : 'Rate Your Journey'}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {isRTL ? `كيف كانت رحلتك مع ${assignedDriver?.profile?.full_name || 'الكابتن'}؟` : `How was your journey with ${assignedDriver?.profile?.full_name || 'your VIP chauffeur'}?`}
              </h4>

              {hasBeenRated ? (
                <div className="p-3.5 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/40 text-center space-y-2 border border-emerald-300 dark:border-emerald-800/50">
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isRTL ? 'شكراً لك! تم تسجيل تقييمك بنجاح' : 'Thank you! Your review has been recorded'}</span>
                  </div>

                  <div className="flex items-center justify-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (existingRating?.rating ?? ratingVal)
                            ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold ml-1.5 text-slate-800 dark:text-slate-200">
                      {(existingRating?.rating ?? ratingVal).toFixed(1)} / 5.0
                    </span>
                  </div>

                  {(existingRating?.feedback || feedbackText) && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic pt-1.5 border-t border-emerald-200 dark:border-emerald-800/40">
                      &ldquo;{existingRating?.feedback || feedbackText}&rdquo;
                    </p>
                  )}
                  <div className="text-[10px] text-muted pt-0.5">
                    {isRTL ? 'تقييم معتمد من المسافر • تقييم واحد لكل رحلة' : 'Verified Passenger Review • One review per ride recorded'}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRatingSubmit} className="space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 py-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(star)}
                        className="text-xl transition-transform hover:scale-125 cursor-pointer"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= ratingVal
                              ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={isRTL ? 'أضف تعليقاً حول تجربة النقل الفاخر مع الكابتن...' : 'Leave a comment for your chauffeur...'}
                    className="w-full bg-input border border-base rounded-xl p-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingRating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isRTL ? 'جاري إرسال التقييم...' : 'Submitting Review...'}</span>
                      </>
                    ) : (
                      isRTL ? 'إرسال التقييم' : 'Submit Review'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* Official PDF Journey Invoice Modal */}
      {/* ========================================================= */}
      {showInvoice && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[94vh] overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-base flex items-center justify-between gap-3 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="type-card-title text-base">Official Journey Invoice</h3>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      PDF Document
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 font-mono">
                    INV-{selectedBooking.booking_reference.replace(/[^0-9A-Z]/gi, '')} &bull; Fixed Agreed Price
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pdfBlobData?.blobUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => pdfBlobData.download()}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      title="Download PDF to device"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(pdfBlobData.blobUrl, '_blank')}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary border border-base text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Open Fullscreen</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowInvoice(false)}
                  className="p-2 rounded-xl bg-surface hover:bg-elevated text-muted hover:text-primary border border-base transition-colors cursor-pointer"
                  aria-label="Close Invoice Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Price & Guarantee Pill Strip */}
            <div className="px-5 py-3 bg-surface/30 border-b border-base/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted">Passenger: <strong className="text-primary font-semibold">{selectedBooking.passenger_name}</strong></span>
                <span className="text-muted hidden sm:inline">&bull;</span>
                <span className="text-muted hidden sm:inline">Ref: <strong className="font-mono text-primary">{selectedBooking.booking_reference}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-muted">Total Fixed Fare:</span>
                <span className="type-card-title text-base font-extrabold text-amber-500">
                  {formatCurrency(totalFare || 0, settings?.currency || 'SAR')}
                </span>
                <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Fixed Agreed Price &bull; No Taxes Added
                </span>
              </div>
            </div>

            {/* PDF Viewer Body */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto bg-surface/20 min-h-[480px]">
              {pdfBlobData?.blobUrl ? (
                <div className="space-y-4">
                  <div className="w-full h-[540px] sm:h-[600px] rounded-2xl overflow-hidden border border-base shadow-lg bg-slate-900">
                    <iframe
                      src={`${pdfBlobData.blobUrl}#view=FitH`}
                      title={`Invoice-${selectedBooking.booking_reference}`}
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>

                  {/* Fallback bar for mobile / direct download */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-card border border-base rounded-2xl text-xs">
                    <div className="flex items-center gap-2 text-muted">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Standard PDF document formatted for desktop &amp; mobile viewing.</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => pdfBlobData.download()}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Save PDF Copy
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                  <div>
                    <h4 className="type-card-title text-base">Generating PDF Invoice...</h4>
                    <p className="text-xs text-muted mt-1 max-w-sm">
                      Please wait while we prepare the official fixed price invoice for your journey.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenPdfInvoice}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-elevated border border-base text-xs font-semibold text-primary transition-colors cursor-pointer"
                  >
                    Retry Generation
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-base bg-surface/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted">
                {settings?.company_name || 'Al Harmain Travels'} &bull; Fixed Rate Guarantee
              </span>
              <button
                type="button"
                onClick={() => setShowInvoice(false)}
                className="px-5 py-2 rounded-xl bg-surface hover:bg-elevated border border-base text-primary font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Customer Payment Receipt Proof Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(showReceiptModal && selectedBooking?.payment_screenshot_url)}
        onClose={() => setShowReceiptModal(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span className="type-card-title text-sm">Customer Payment Receipt</span>
          </div>
        }
      >
        {selectedBooking?.payment_screenshot_url && (
          <div className="space-y-4">
            {selectedBooking.payment_account_details && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs flex items-center justify-between">
                <span className="text-slate-600 font-medium">Payment Account:</span>
                <span className="font-bold text-amber-950 font-mono">
                  {selectedBooking.payment_account_details.provider_name}
                </span>
              </div>
            )}
            <div className="rounded-2xl overflow-hidden border border-base bg-surface flex items-center justify-center max-h-[65vh] p-2">
              <img
                src={selectedBooking.payment_screenshot_url}
                alt="Payment Slip Proof"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted pt-1">
              <span>Attached to {selectedBooking.booking_reference}</span>
              <a
                href={selectedBooking.payment_screenshot_url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
