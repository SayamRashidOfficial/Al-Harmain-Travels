'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Driver } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Wallet,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Banknote,
  ChevronDown,
  Eye,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminTableCard,
  AdminPagination,
} from '@/components/admin/AdminUIComponents';
import { TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

interface DriverEarning {
  driverId: string;
  driverName: string;
  driverPhone: string;
  avatar_url: string | null;
  totalTrips: number;
  totalEarnings: number;
  cashCollected: number;
  pendingSettlement: number;
  lastSettlementDate: string | null;
  status: string;
}

interface Settlement {
  id: string;
  driver_id: string;
  amount: number;
  type: string;
  status: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
}

function EarningsDetailModal({
  earning,
  settlements,
  onClose,
  onSettle,
  settings,
}: {
  earning: DriverEarning;
  settlements: Settlement[];
  onClose: () => void;
  onSettle: (driverId: string, amount: number, notes: string) => Promise<void>;
  settings: { currency: string };
}) {
  const [settleAmount, setSettleAmount] = useState(earning.pendingSettlement);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);

  const driverSettlements = settlements.filter((s) => s.driver_id === earning.driverId);

  const handleSettle = async () => {
    if (settleAmount <= 0) {
      toast.error('Settlement amount must be greater than 0.');
      return;
    }
    setIsSettling(true);
    try {
      await onSettle(earning.driverId, settleAmount, settleNotes);
      onClose();
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-lg font-bold text-emerald-700 overflow-hidden">
              {earning.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={earning.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                earning.driverName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{earning.driverName}</h2>
              <p className="text-xs text-slate-400">{earning.driverPhone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Earnings Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {formatCurrency(earning.totalEarnings, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Total Earnings</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
              <div className="text-lg font-bold text-amber-700">
                {formatCurrency(earning.cashCollected, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Cash Held</div>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 text-center">
              <div className="text-lg font-bold text-rose-700">
                {formatCurrency(earning.pendingSettlement, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Pending Settlement</div>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 text-center">
              <div className="text-lg font-bold text-sky-700">{earning.totalTrips}</div>
              <div className="text-[10px] text-slate-500">Total Trips</div>
            </div>
          </div>

          {/* Settlement History */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settlement History</h3>
            {driverSettlements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No settlements recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {driverSettlements.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {s.type === 'cash_handover' ? 'Cash Handover' : s.type === 'deduction' ? 'Deduction' : 'Settlement'}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDateTime(s.created_at)}</div>
                      {s.notes && <div className="text-[10px] text-slate-500 mt-0.5">{s.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${s.type === 'deduction' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {s.type === 'deduction' ? '-' : ''}{formatCurrency(s.amount, settings.currency)}
                      </div>
                      <AdminStatusBadge status={s.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Settle Cash */}
          {earning.pendingSettlement > 0 && (
            <section className="border-t border-slate-200 pt-4 space-y-3">
              {!showSettleForm ? (
                <button
                  onClick={() => setShowSettleForm(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Record Cash Settlement
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-emerald-700">Record Cash Handover</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500">Amount (SAR)</label>
                      <input
                        type="number"
                        min={0}
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(Number(e.target.value))}
                        className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500">Notes</label>
                    <textarea
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      rows={2}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                      placeholder="Cash handed over at office..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSettle}
                      disabled={isSettling}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSettling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirm Settlement
                    </button>
                    <button onClick={() => setShowSettleForm(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminEarningsPage() {
  const { drivers, bookings, settings, refreshData } = useApp();

  const [driverEarnings, setDriverEarnings] = useState<DriverEarning[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEarning, setSelectedEarning] = useState<DriverEarning | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const buildEarnings = useCallback(() => {
    const earnings: DriverEarning[] = drivers.map((d) => {
      const driverBookings = bookings.filter(
        (b) =>
          b.assigned_driver_id === d.id &&
          (b.status === 'trip_completed' ||
            b.status === 'ride_completed' ||
            b.status === 'payment_completed')
      );
      const totalEarnings = driverBookings.reduce(
        (sum, b) => sum + (b.final_fare || b.estimated_fare || 0),
        0
      );

      return {
        driverId: d.id,
        driverName: d.profile?.full_name || d.full_name || 'Unknown Driver',
        driverPhone: d.profile?.phone || d.phone || '—',
        avatar_url: d.profile?.avatar_url || d.avatar_url || null,
        totalTrips: d.total_rides || driverBookings.length,
        totalEarnings: d.total_earnings || totalEarnings,
        cashCollected: d.cash_collected || 0,
        pendingSettlement: d.cash_collected || 0,
        lastSettlementDate: null,
        status: d.profile?.status || 'active',
      };
    });
    setDriverEarnings(earnings);
  }, [drivers, bookings]);

  const fetchSettlements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('driver_settlements')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setSettlements(data as Settlement[]);
      }
    } catch {
      // Settlements table might not exist - use empty
    }
  }, []);

  useEffect(() => {
    buildEarnings();
    fetchSettlements();
  }, [buildEarnings, fetchSettlements]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      buildEarnings();
      await fetchSettlements();
      toast.success('Earnings data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSettle = async (driverId: string, amount: number, notes: string) => {
    try {
      const now = new Date().toISOString();
      await supabase.from('driver_settlements').insert({
        driver_id: driverId,
        amount,
        type: 'cash_handover',
        status: 'completed',
        period_start: now,
        period_end: now,
        notes: notes || 'Manual cash settlement',
        created_at: now,
        settled_at: now,
      });

      // Reduce cash_collected in drivers table
      await supabase
        .from('drivers')
        .update({
          cash_collected: Math.max(0, (drivers.find((d) => d.id === driverId)?.cash_collected || 0) - amount),
          updated_at: now,
        })
        .eq('id', driverId);

      toast.success(`Settlement of ${formatCurrency(amount, settings.currency)} recorded.`);
      await refreshData();
      buildEarnings();
      await fetchSettlements();
    } catch {
      toast.error('Failed to record settlement.');
    }
  };

  const filteredEarnings = driverEarnings.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return e.driverName.toLowerCase().includes(q) || e.driverPhone.includes(q);
  });

  const paginated = filteredEarnings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCashHeld = driverEarnings.reduce((s, e) => s + e.cashCollected, 0);
  const totalEarnings = driverEarnings.reduce((s, e) => s + e.totalEarnings, 0);
  const totalTrips = driverEarnings.reduce((s, e) => s + e.totalTrips, 0);
  const pendingSettlements = driverEarnings.filter((e) => e.pendingSettlement > 0).length;

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Financial Operations"
        badge="Payroll & Settlements"
        title="Driver Earnings"
        description="Track driver earnings, cash collected, pending settlements, and record cash handover transactions. Maintain accurate driver financial records."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard title="Total Earnings" value={formatCurrency(totalEarnings, settings.currency)} subtitle="All drivers combined" icon={<TrendingUp className="w-4.5 h-4.5" />} tone="green" />
        <AdminStatCard title="Cash Held by Drivers" value={formatCurrency(totalCashHeld, settings.currency)} subtitle="Pending collection" icon={<Banknote className="w-4.5 h-4.5" />} tone="amber" />
        <AdminStatCard title="Total Trips" value={totalTrips} subtitle="Completed rides" icon={<CheckCircle2 className="w-4.5 h-4.5" />} tone="blue" />
        <AdminStatCard title="Pending Settlements" value={pendingSettlements} subtitle="Drivers with cash owed" icon={<AlertTriangle className="w-4.5 h-4.5" />} tone="red" />
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver name or phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Earnings Table */}
      <AdminTableCard
        title="Driver Earnings Summary"
        subtitle="Individual driver earnings, cash collected, and settlement status."
        totalCount={filteredEarnings.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredEarnings.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="drivers"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Driver</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden md:table-cell">Trips</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Earnings</th>
              <th className="py-3.5 px-4 font-semibold text-right">Cash Held</th>
              <th className="py-3.5 px-4 font-semibold text-right hidden lg:table-cell">Pending Settlement</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Account Status</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16">
                  <EmptyStateView
                    icon={Wallet}
                    title="No Driver Earnings Data"
                    description="No completed trips to calculate earnings from."
                  />
                </td>
              </tr>
            ) : (
              paginated.map((e) => (
                <tr key={e.driverId} className={`hover:bg-slate-50 transition-colors ${e.pendingSettlement > 0 ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700 overflow-hidden shrink-0">
                        {e.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          e.driverName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{e.driverName}</div>
                        <div className="text-[10px] text-slate-400">{e.driverPhone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    <span className="font-bold text-sky-700">{e.totalTrips}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-emerald-700">{formatCurrency(e.totalEarnings, settings.currency)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-bold ${e.cashCollected > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {formatCurrency(e.cashCollected, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell">
                    <span className={`font-bold ${e.pendingSettlement > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                      {formatCurrency(e.pendingSettlement, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <AdminStatusBadge status={e.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View earnings details"
                      onClick={() => setSelectedEarning(e)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {selectedEarning && (
        <EarningsDetailModal
          earning={selectedEarning}
          settlements={settlements}
          onClose={() => setSelectedEarning(null)}
          onSettle={handleSettle}
          settings={settings}
        />
      )}
    </div>
  );
}
