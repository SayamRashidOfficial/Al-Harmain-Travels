'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Coins,
  Wallet,
  Landmark,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Info,
  X,
  PlusCircle,
  Building2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateDriverEarnings,
  filterDriverTransactions,
} from '@/lib/driver-earnings';
import { DriverTransaction } from '@/types';
import { StatCardSkeleton, TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';

type DateFilterPreset = 'all' | 'today' | 'week' | 'month' | 'custom';
type MethodFilterOption = 'all' | 'cash' | 'online' | 'settlement';

export default function DriverEarningsPage() {
  const {
    currentUser,
    userRole,
    drivers,
    bookings,
    driverSettlements,
    createDriverSettlement,
    settings,
    isDataLoading,
  } = useApp();

  // Selected driver (for driver themselves or admin reviewing chauffeur ledger)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  const currentDriver = useMemo(() => {
    if (selectedDriverId) {
      return drivers.find((d) => d.id === selectedDriverId);
    }
    return (
      drivers.find((d) => d.id === currentUser.id || d.profile?.id === currentUser.id) ||
      (userRole === 'admin' ? drivers[0] : undefined)
    );
  }, [drivers, currentUser, userRole, selectedDriverId]);

  // Set default selected driver if not set
  useEffect(() => {
    if (!selectedDriverId && currentDriver?.id) {
      setSelectedDriverId(currentDriver.id);
    }
  }, [currentDriver?.id, selectedDriverId]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilterOption>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected transaction for detailed breakdown modal
  const [selectedTx, setSelectedTx] = useState<DriverTransaction | null>(null);

  // Modal for recording a driver payout/settlement (available to Admin/Dispatcher or for reconciliation)
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<string>('');
  const [settlementMethod, setSettlementMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [settlementBank, setSettlementBank] = useState('Al Rajhi Bank');
  const [settlementTxnNumber, setSettlementTxnNumber] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // Authoritative Calculation of Earnings and Unified Ledger
  const { summary, transactions } = useMemo(() => {
    if (!currentDriver?.id) {
      return {
        summary: {
          driver_id: '',
          currency: settings.currency || 'SAR',
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

    const commissionRate = Number((currentDriver as any)?.commission_rate || 0);

    return calculateDriverEarnings({
      driverId: currentDriver.id,
      bookings,
      settlements: driverSettlements,
      commissionRate,
      currency: settings.currency || 'SAR',
    });
  }, [currentDriver?.id, bookings, driverSettlements, currentDriver, settings.currency]);

  // Filtered transactions for the ledger table
  const filteredTransactions = useMemo(() => {
    return filterDriverTransactions(transactions, {
      searchQuery,
      dateFilter,
      customStartDate,
      customEndDate,
      methodFilter,
    });
  }, [transactions, searchQuery, dateFilter, customStartDate, customEndDate, methodFilter]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (currentDriver?.id) {
        const res = await fetch(`/api/driver/earnings?driverId=${currentDriver.id}`);
        const data = await res.json();
        if (data.success) {
          toast.success('Financial ledger synchronized with Supabase database.');
        }
      }
    } catch {
      toast.error('Could not refresh from server endpoint.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions available to export.');
      return;
    }

    const headers = [
      'Reference',
      'Date',
      'Type',
      'Mission / Details',
      'Passenger / Counterparty',
      'Payment Channel',
      'Destination Account',
      'Gross Amount (SAR)',
      'Deductions (SAR)',
      'Net Take-home (SAR)',
      'Status',
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.reference,
      tx.date,
      tx.type.toUpperCase(),
      `"${tx.route.replace(/"/g, '""')}"`,
      `"${tx.passenger_name.replace(/"/g, '""')}"`,
      `"${tx.payment_method_label.replace(/"/g, '""')}"`,
      tx.payment_destination,
      tx.gross_amount.toFixed(2),
      tx.deduction_amount.toFixed(2),
      tx.net_amount.toFixed(2),
      tx.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Driver_Ledger_${currentDriver?.license_number || 'Captain'}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial statement exported successfully.');
  };

  const handleRecordSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDriver?.id) return;

    const amt = parseFloat(settlementAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payout amount greater than 0 SAR.');
      return;
    }

    setIsSubmittingSettlement(true);
    try {
      const res = await createDriverSettlement({
        driver_id: currentDriver.id,
        amount: amt,
        payment_method: settlementMethod,
        bank_name: settlementMethod === 'bank_transfer' ? settlementBank : undefined,
        transaction_number: settlementTxnNumber || undefined,
        notes: settlementNotes || undefined,
      });

      if (res.success) {
        setSettlementModalOpen(false);
        setSettlementAmount('');
        setSettlementTxnNumber('');
        setSettlementNotes('');
      }
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    dateFilter !== 'all' ||
    methodFilter !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setMethodFilter('all');
  };

  if (isDataLoading) {
    return (
      <div className="page-shell space-y-6">
        <div className="bg-card border border-base p-6 rounded-3xl shadow-xl animate-pulse h-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <StatCardSkeleton key={idx} />
          ))}
        </div>
        <div className="bg-card border border-base rounded-3xl p-6 shadow-xl animate-pulse h-80" />
      </div>
    );
  }

  if (!currentDriver) {
    return (
      <div className="page-shell py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg">
          <Car className="w-8 h-8" />
        </div>
        <h2 className="type-page-title">No Chauffeur Profile Assigned</h2>
        <p className="text-sm text-secondary max-w-md mx-auto">
          Your account is currently awaiting chauffeur provisioning from Al Harmain dispatch operations to display financial records.
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      {/* ── 1. Page Header & Chauffeur Bar ───────────────────────────────── */}
      <div className="bg-card border border-base p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-eyebrow">Al Harmain Chauffeur Treasury</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Supabase Ledger
            </span>
          </div>
          <h1 className="type-page-title text-2xl font-bold text-primary">
            Earnings &amp; Financial Settlement
          </h1>
          <p className="text-xs text-secondary">
            Verified financial breakdown for{' '}
            <span className="font-semibold text-primary">{currentDriver.full_name || 'Captain'}</span>
            {currentDriver.license_number ? ` • License: ${currentDriver.license_number}` : ''}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Driver Switcher for Admin or Multi-Driver Dispatchers */}
          {userRole === 'admin' && drivers.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="driver-select" className="text-xs text-muted font-medium">
                Driver:
              </label>
              <select
                id="driver-select"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:border-emerald-500"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name || d.id.slice(0, 8)} ({d.license_number || 'No license'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Record Settlement Payout (Admin or Chauffeur Reconciliation) */}
          {(userRole === 'admin' || userRole === 'dispatcher') && (
            <button
              onClick={() => setSettlementModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-stone-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Settlement</span>
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. Five Summary Cards (Gross, Cash, Net, Paid via Bank, Remaining Payable) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Gross Earnings */}
        <div className="bg-card border border-base p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Gross Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="type-stat text-2xl font-bold text-primary">
              {formatCurrency(summary.gross_earnings, summary.currency)}
            </div>
            <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
              <span>{summary.completed_rides_count} eligible completed trips</span>
            </p>
          </div>
        </div>

        {/* Card 2: Cash Collection */}
        <div className="bg-card border border-base p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Cash Collection</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Banknote className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="type-stat text-2xl font-bold text-amber-500">
              {formatCurrency(summary.cash_collection, summary.currency)}
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Physical cash collected from riders
            </p>
          </div>
        </div>

        {/* Card 3: Net Earnings */}
        <div className="bg-card border border-base p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-gold-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Net Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
              <Coins className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="type-stat text-2xl font-bold text-gold-500">
              {formatCurrency(summary.net_earnings, summary.currency)}
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              {summary.total_deductions > 0
                ? `Commission: -${formatCurrency(summary.total_deductions, summary.currency)} (${summary.commission_rate}%)`
                : 'Full entitlement (0% deduction)'}
            </p>
          </div>
        </div>

        {/* Card 4: Paid via Bank */}
        <div className="bg-card border border-base p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Paid via Bank</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Landmark className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="type-stat text-2xl font-bold text-blue-500">
              {formatCurrency(summary.paid_via_bank, summary.currency)}
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Settlements transferred to driver
            </p>
          </div>
        </div>

        {/* Card 5: Remaining Payable */}
        <div className="bg-gradient-to-br from-emerald-950/25 via-card to-card border border-emerald-500/40 p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Remaining Payable
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="type-stat text-2xl font-bold text-emerald-500">
              {formatCurrency(summary.remaining_payable, summary.currency)}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
              {summary.remaining_payable > 0
                ? 'Ready for treasury payout'
                : 'Fully reconciled balance'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Cash Due to Company Alert (When Applicable) ────────────────── */}
      {summary.cash_due_to_company > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-amber-950">
                  Cash Due to Al Harmain Company Office (FR-61)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                You have collected physical cash ({formatCurrency(summary.cash_collection, summary.currency)}) exceeding your net earnings entitlement.
                Please deposit the balance of{' '}
                <span className="font-extrabold text-amber-950">
                  {formatCurrency(summary.cash_due_to_company, summary.currency)}
                </span>{' '}
                at the Al Harmain central dispatch office in Makkah or Madinah.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right sm:border-l sm:border-amber-300 sm:pl-5">
            <span className="text-[10px] font-bold uppercase text-slate-700 block">Remittance Due</span>
            <span className="text-xl font-black text-amber-950">
              {formatCurrency(summary.cash_due_to_company, summary.currency)}
            </span>
          </div>
        </div>
      )}

      {/* ── 4. Payment Workflow & Distinction Legend ─────────────────────── */}
      <div className="bg-card/70 border border-base/80 p-4 rounded-2xl text-xs text-secondary grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-primary block">Customer Bank Transfer</span>
            <span className="text-[11px] text-muted">
              Transferred directly to company account at booking. Chauffeur earns net share via settlement.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
            <Banknote className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-primary block">Cash Collection</span>
            <span className="text-[11px] text-muted">
              Physical cash collected directly by chauffeur. Offset against payable balance.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-primary block">Driver Bank Settlement</span>
            <span className="text-[11px] text-muted">
              Official company treasury transfers disbursed to your personal bank account.
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. Filter & Search Controls ──────────────────────────────────── */}
      <div className="bg-card border border-base rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ref (AHT-...), passenger, route, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-base rounded-xl pl-9 pr-8 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1 rounded-2xl border border-base">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Channel:
            </span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as MethodFilterOption)}
              className="bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Channels</option>
              <option value="cash">Cash (Chauffeur Collected)</option>
              <option value="online">Bank Transfer (Company)</option>
              <option value="settlement">Driver Bank Settlements</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Selectors */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-base text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-surface border border-base rounded-xl px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-surface border border-base rounded-xl px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-500 hover:text-rose-400 font-semibold ml-auto cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-base/50">
          <span>
            Showing <strong className="text-primary">{filteredTransactions.length}</strong> of{' '}
            <strong className="text-primary">{transactions.length}</strong> total records
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-emerald-500 hover:underline font-semibold cursor-pointer"
            >
              Reset active filters
            </button>
          )}
        </div>
      </div>

      {/* ── 6. Transaction History Table ─────────────────────────────────── */}
      <div className="bg-card border border-base rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-primary">Transaction History &amp; Mission Records</h2>
            <p className="text-xs text-muted">
              Audit log of completed passenger missions, payment methods, commission deductions, and company bank settlements.
            </p>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-surface border border-base flex items-center justify-center text-muted">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-primary">No transactions found</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No financial records match your active search or date filters.'
                : 'No completed rides or settlements recorded yet for this chauffeur profile.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-xl bg-surface border border-base text-xs font-semibold text-primary hover:bg-elevated cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-secondary">
              <thead className="bg-surface text-secondary uppercase font-bold text-[10px] border-b border-base">
                <tr>
                  <th className="p-3.5">Ref / Type</th>
                  <th className="p-3.5">Date &amp; Time</th>
                  <th className="p-3.5">Details &amp; Route</th>
                  <th className="p-3.5">Payment Channel</th>
                  <th className="p-3.5 text-right">Gross (SAR)</th>
                  <th className="p-3.5 text-right">Deductions</th>
                  <th className="p-3.5 text-right">Net (SAR)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={`${tx.type}-${tx.id}`}
                    className="hover:bg-surface/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTx(tx)}
                  >
                    {/* Reference & Type */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-950">
                          {tx.reference}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            tx.type === 'settlement'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {tx.type === 'settlement' ? 'Settlement' : 'Ride'}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-3.5 text-slate-700 whitespace-nowrap">
                      {formatDateTime(tx.date)}
                    </td>

                    {/* Mission / Route */}
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-primary truncate" title={tx.route}>
                        {tx.route}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <span>Passenger: {tx.passenger_name}</span>
                        {tx.vehicle_type !== 'SETTLEMENT' && (
                          <span className="text-emerald-800 font-semibold uppercase text-[10px]">
                            • {tx.vehicle_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payment Channel */}
                    <td className="p-3.5 whitespace-nowrap">
                      {tx.type === 'settlement' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <Landmark className="w-3.5 h-3.5 text-blue-700" />
                          <span>Direct Bank Settlement</span>
                        </span>
                      ) : tx.payment_destination === 'driver_pocket' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                          <Banknote className="w-3.5 h-3.5 text-amber-700" />
                          <span>Cash (Collected by Driver)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Bank Transfer (Company Account)</span>
                        </span>
                      )}
                    </td>

                    {/* Gross */}
                    <td className="p-3.5 text-right font-medium text-primary whitespace-nowrap">
                      {formatCurrency(tx.gross_amount, settings.currency)}
                    </td>

                    {/* Deductions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {tx.deduction_amount > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          -{formatCurrency(tx.deduction_amount, settings.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-500">0.00</span>
                      )}
                    </td>

                    {/* Net */}
                    <td className="p-3.5 text-right font-extrabold text-emerald-800 whitespace-nowrap">
                      {formatCurrency(tx.net_amount, settings.currency)}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {tx.type === 'settlement' ? 'Settled' : 'Completed'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-elevated text-[11px] font-semibold text-primary border border-base transition-all cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 7. Transaction Breakdown & Receipt Modal ──────────────────────── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-base">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedTx.type === 'settlement'
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}
                >
                  {selectedTx.type === 'settlement' ? (
                    <Landmark className="w-5 h-5" />
                  ) : (
                    <Car className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    {selectedTx.type === 'settlement' ? 'Settlement Voucher' : 'Journey Fare Breakdown'}
                  </h3>
                  <span className="font-mono text-xs text-amber-950 font-black">
                    {selectedTx.reference}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 rounded-xl bg-surface hover:bg-elevated text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-surface p-3.5 rounded-2xl border border-base space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Date &amp; Time:</span>
                  <span className="font-semibold text-primary">{formatDateTime(selectedTx.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Payment Channel:</span>
                  <span className="font-semibold text-primary">{selectedTx.payment_method_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Counterparty:</span>
                  <span className="font-semibold text-primary">{selectedTx.passenger_name}</span>
                </div>
                {selectedTx.vehicle_type !== 'SETTLEMENT' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Vehicle Class:</span>
                    <span className="font-bold uppercase text-emerald-800">{selectedTx.vehicle_type}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 bg-card border border-base p-4 rounded-2xl">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Accounting Line Items
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Gross Ride Fare:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(selectedTx.gross_amount, settings.currency)}
                  </span>
                </div>
                {selectedTx.additional_charges ? (
                  <div className="flex justify-between text-secondary">
                    <span>Auxiliary Charges (Toll/Parking):</span>
                    <span className="font-semibold text-primary">
                      +{formatCurrency(selectedTx.additional_charges, settings.currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-secondary">
                  <span>Company Commission Deduction:</span>
                  <span className={selectedTx.deduction_amount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                    -{formatCurrency(selectedTx.deduction_amount, settings.currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-base flex justify-between text-sm font-bold text-primary">
                  <span>Net Chauffeur Share:</span>
                  <span className="text-emerald-800 font-extrabold">
                    {formatCurrency(selectedTx.net_amount, settings.currency)}
                  </span>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="p-3 rounded-xl bg-surface border border-base text-muted text-[11px]">
                  <strong>Notes:</strong> {selectedTx.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-elevated text-xs font-semibold text-primary border border-base transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Record Settlement Modal (Admin/Dispatcher Payout Action) ────── */}
      {settlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordSettlementSubmit}
            className="bg-card border border-base rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-base">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Record Chauffeur Settlement</h3>
                  <p className="text-[11px] text-muted">Disburse earnings to {currentDriver.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlementModalOpen(false)}
                className="p-2 rounded-xl bg-surface hover:bg-elevated text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-secondary font-medium mb-1">
                  Settlement Amount (SAR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder={`e.g. ${summary.remaining_payable > 0 ? summary.remaining_payable : '500.00'}`}
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 font-bold"
                />
                {summary.remaining_payable > 0 && (
                  <button
                    type="button"
                    onClick={() => setSettlementAmount(summary.remaining_payable.toString())}
                    className="text-[10px] text-emerald-500 hover:underline mt-1 font-semibold cursor-pointer"
                  >
                    Set to current remaining payable ({formatCurrency(summary.remaining_payable, settings.currency)})
                  </button>
                )}
              </div>

              <div>
                <label className="block text-secondary font-medium mb-1">Disbursement Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementMethod('bank_transfer')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      settlementMethod === 'bank_transfer'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-surface text-muted border-base hover:text-primary'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementMethod('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      settlementMethod === 'cash'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-surface text-muted border-base hover:text-primary'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Office Cash</span>
                  </button>
                </div>
              </div>

              {settlementMethod === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-secondary font-medium mb-1">Destination Bank</label>
                    <select
                      value={settlementBank}
                      onChange={(e) => setSettlementBank(e.target.value)}
                      className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="Al Rajhi Bank">Al Rajhi Bank (مصرف الراجحي)</option>
                      <option value="SNB AlAhli">SNB AlAhli (البنك الأهلي السعودي)</option>
                      <option value="Riyad Bank">Riyad Bank (بنك الرياض)</option>
                      <option value="Alinma Bank">Alinma Bank (مصرف الإنماء)</option>
                      <option value="Arab National Bank">Arab National Bank (البنك العربي)</option>
                      <option value="Banque Saudi Fransi">Banque Saudi Fransi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-secondary font-medium mb-1">
                      Bank Transfer Reference / IBAN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SA0380000000608010167519 or TXN-998822"
                      value={settlementTxnNumber}
                      onChange={(e) => setSettlementTxnNumber(e.target.value)}
                      className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-secondary font-medium mb-1">Treasury Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly settlement payout for Umrah missions"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
              <button
                type="button"
                onClick={() => setSettlementModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-elevated text-xs font-semibold text-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSettlement}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSettlement ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Settlement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
