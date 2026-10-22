import {
  Booking,
  DriverSettlement,
  AdditionalCharge,
  DriverEarningsSummary,
  DriverTransaction,
} from '@/types';

// Eligible completed journey statuses that qualify for earnings
export const ELIGIBLE_COMPLETED_STATUSES = [
  'trip_completed',
  'completed',
  'payment_completed',
  'ride_completed',
];

export interface CalculateEarningsParams {
  driverId: string;
  bookings: Booking[];
  settlements?: DriverSettlement[];
  additionalCharges?: AdditionalCharge[];
  commissionRate?: number; // e.g. 0 for 0%
  currency?: string;
}

export interface CalculatedEarningsResult {
  summary: DriverEarningsSummary;
  transactions: DriverTransaction[];
}

/**
 * Calculates authoritative driver earnings, summaries, and unified transaction ledger
 * from real database records.
 *
 * Distinguishes:
 * 1. Customer bank transfers made directly to the company account at booking.
 * 2. Cash collected directly by the driver.
 * 3. Driver settlements disbursed by the company to the driver's bank account.
 */
export function calculateDriverEarnings({
  driverId,
  bookings,
  settlements = [],
  additionalCharges = [],
  commissionRate = 0, // Defaults to existing company rule (0% if no commission configured)
  currency = 'SAR',
}: CalculateEarningsParams): CalculatedEarningsResult {
  if (!driverId) {
    return {
      summary: {
        driver_id: '',
        currency,
        gross_earnings: 0,
        cash_collection: 0,
        total_deductions: 0,
        net_earnings: 0,
        paid_via_bank: 0,
        paid_via_cash_settlement: 0,
        remaining_payable: 0,
        cash_due_to_company: 0,
        completed_rides_count: 0,
        commission_rate: 0,
        settlements_count: 0,
      },
      transactions: [],
    };
  }

  // 1. Filter eligible completed rides assigned to this driver
  // Use a Map to prevent duplicate transactions if the same booking appears twice
  const uniqueBookingsMap = new Map<string, Booking>();
  bookings.forEach((b) => {
    if (
      b.assigned_driver_id === driverId &&
      ELIGIBLE_COMPLETED_STATUSES.includes(b.status)
    ) {
      if (!uniqueBookingsMap.has(b.id)) {
        uniqueBookingsMap.set(b.id, b);
      }
    }
  });

  const eligibleBookings = Array.from(uniqueBookingsMap.values());

  // 2. Map additional charges to bookings
  const chargesByBookingId = new Map<string, number>();
  additionalCharges.forEach((c) => {
    if (c.booking_id) {
      const current = chargesByBookingId.get(c.booking_id) || 0;
      chargesByBookingId.set(c.booking_id, current + Number(c.amount || 0));
    }
  });

  // 3. Process completed rides into transaction records and accumulators
  let grossEarnings = 0;
  let cashCollection = 0;
  let totalDeductions = 0;

  const rideTransactions: DriverTransaction[] = eligibleBookings.map((b) => {
    const rawFare = Number(b.final_fare ?? b.confirmed_fare ?? b.estimated_fare ?? 0);
    const extraCharges = chargesByBookingId.get(b.id) || 0;
    const rideGross = rawFare + extraCharges;

    // Commission deduction using existing rule
    const deduction = commissionRate > 0
      ? Math.round((rideGross * (commissionRate / 100)) * 100) / 100
      : 0;

    const rideNet = Math.max(0, rideGross - deduction);

    // Determine payment method and collection point
    const isOnlineCompanyBank =
      b.payment_screenshot_url ||
      b.payment?.method === 'online' ||
      b.payment_method === 'online' ||
      (b.payment_status === 'paid' && b.payment?.method !== 'cash');

    const isCashRide =
      b.payment?.method === 'cash' ||
      b.payment_method === 'cash' ||
      (!isOnlineCompanyBank && b.payment_status !== 'paid');

    const paymentMethod: 'cash' | 'online' | 'card' | 'bank_transfer' = isOnlineCompanyBank
      ? 'online'
      : isCashRide
      ? 'cash'
      : (b.payment?.method as any) || 'online';

    const paymentDestination: 'company_account' | 'driver_pocket' | 'driver_account' =
      paymentMethod === 'cash' ? 'driver_pocket' : 'company_account';

    const paymentMethodLabel =
      paymentMethod === 'cash'
        ? 'Cash (Collected by Driver)'
        : 'Bank Transfer (Company Account)';

    grossEarnings += rideGross;
    totalDeductions += deduction;

    if (paymentMethod === 'cash') {
      cashCollection += rideGross;
    }

    return {
      id: b.id,
      type: 'ride',
      reference: b.booking_reference || `AHT-${b.id.slice(0, 8)}`,
      date: b.updated_at || b.created_at || new Date().toISOString(),
      route: `${b.pickup_address} → ${b.destination_address}`,
      passenger_name: b.passenger_name || 'VIP Guest',
      vehicle_type: (b.vehicle_category || b.vehicle_type || 'Vehicle').toUpperCase(),
      payment_method: paymentMethod,
      payment_destination: paymentDestination,
      payment_method_label: paymentMethodLabel,
      gross_amount: rideGross,
      deduction_amount: deduction,
      net_amount: rideNet,
      status: b.status,
      payment_status: b.payment_status || (isOnlineCompanyBank ? 'paid' : 'pending'),
      notes: b.notes || null,
      booking_id: b.id,
      additional_charges: extraCharges,
    };
  });

  // 4. Process driver settlements (money disbursed by company to driver)
  // Deduplicate settlements by unique settlement reference or ID
  const uniqueSettlementsMap = new Map<string, DriverSettlement>();
  settlements.forEach((s) => {
    if (s.driver_id === driverId) {
      if (!uniqueSettlementsMap.has(s.id)) {
        uniqueSettlementsMap.set(s.id, s);
      }
    }
  });

  const driverSettlements = Array.from(uniqueSettlementsMap.values());

  let paidViaBank = 0;
  let paidViaCashSettlement = 0;

  const settlementTransactions: DriverTransaction[] = driverSettlements.map((s) => {
    const amt = Number(s.amount || 0);

    if (s.status === 'completed') {
      if (s.payment_method === 'bank_transfer') {
        paidViaBank += amt;
      } else {
        paidViaCashSettlement += amt;
      }
    }

    const methodLabel =
      s.payment_method === 'bank_transfer'
        ? `Driver Bank Settlement (${s.bank_name || 'Bank Transfer'})`
        : 'Driver Cash Settlement';

    return {
      id: s.id,
      type: 'settlement',
      reference: s.settlement_reference || `SETTLE-${s.id.slice(0, 8)}`,
      date: s.created_at || new Date().toISOString(),
      route: s.bank_name
        ? `Direct Bank Transfer → ${s.bank_name}`
        : 'Company Payout Settlement',
      passenger_name: 'Al Harmain Central Treasury',
      vehicle_type: 'SETTLEMENT',
      payment_method: s.payment_method === 'bank_transfer' ? 'bank_transfer' : 'cash',
      payment_destination: 'driver_account',
      payment_method_label: methodLabel,
      gross_amount: amt,
      deduction_amount: 0,
      net_amount: amt,
      status: s.status,
      payment_status: s.status === 'completed' ? 'paid' : s.status,
      notes: s.notes || (s.transaction_number ? `Ref: ${s.transaction_number}` : null),
    };
  });

  // 5. Final Net and Balance Calculations
  const netEarnings = Math.max(0, grossEarnings - totalDeductions);

  // Financial Position:
  // Driver is entitled to Net Earnings.
  // Driver already received: physical cash kept in pocket (Cash Collection) + Bank settlements already received + Cash settlements.
  const totalReceivedByDriver = cashCollection + paidViaBank + paidViaCashSettlement;
  const netBalance = netEarnings - totalReceivedByDriver;

  const remainingPayable = netBalance > 0 ? Math.round(netBalance * 100) / 100 : 0;
  const cashDueToCompany = netBalance < 0 ? Math.round(Math.abs(netBalance) * 100) / 100 : 0;

  // Combine and sort transactions chronologically (newest first)
  const allTransactions = [...rideTransactions, ...settlementTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    summary: {
      driver_id: driverId,
      currency,
      gross_earnings: Math.round(grossEarnings * 100) / 100,
      cash_collection: Math.round(cashCollection * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      net_earnings: Math.round(netEarnings * 100) / 100,
      paid_via_bank: Math.round(paidViaBank * 100) / 100,
      paid_via_cash_settlement: Math.round(paidViaCashSettlement * 100) / 100,
      remaining_payable: remainingPayable,
      cash_due_to_company: cashDueToCompany,
      completed_rides_count: eligibleBookings.length,
      commission_rate: commissionRate,
      settlements_count: driverSettlements.length,
    },
    transactions: allTransactions,
  };
}

/**
 * Filter transactions by search query and date preset/range.
 */
export function filterDriverTransactions(
  transactions: DriverTransaction[],
  {
    searchQuery = '',
    dateFilter = 'all', // 'all' | 'today' | 'week' | 'month' | 'custom'
    customStartDate,
    customEndDate,
    methodFilter = 'all', // 'all' | 'cash' | 'online' | 'settlement'
  }: {
    searchQuery?: string;
    dateFilter?: string;
    customStartDate?: string;
    customEndDate?: string;
    methodFilter?: string;
  }
): DriverTransaction[] {
  const query = searchQuery.trim().toLowerCase();
  const now = new Date();

  return transactions.filter((t) => {
    // 1. Text Search Filter
    if (query) {
      const matchRef = t.reference.toLowerCase().includes(query);
      const matchRoute = t.route.toLowerCase().includes(query);
      const matchPax = t.passenger_name.toLowerCase().includes(query);
      const matchMethod = t.payment_method_label.toLowerCase().includes(query);
      const matchNotes = (t.notes || '').toLowerCase().includes(query);

      if (!matchRef && !matchRoute && !matchPax && !matchMethod && !matchNotes) {
        return false;
      }
    }

    // 2. Payment Method Filter
    if (methodFilter && methodFilter !== 'all') {
      if (methodFilter === 'cash' && t.payment_method !== 'cash') return false;
      if (methodFilter === 'online' && t.payment_method !== 'online' && t.payment_method !== 'card') return false;
      if (methodFilter === 'settlement' && t.type !== 'settlement') return false;
    }

    // 3. Date Filter
    if (dateFilter && dateFilter !== 'all') {
      const txDate = new Date(t.date);

      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (txDate < startOfToday) return false;
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        if (txDate < startOfWeek) return false;
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (txDate < startOfMonth) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }
    }

    return true;
  });
}
