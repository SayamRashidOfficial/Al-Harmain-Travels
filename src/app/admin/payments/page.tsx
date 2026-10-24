'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Booking } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CreditCard,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  AlertTriangle,
  DollarSign,
  Banknote,
  Camera,
  Filter,
  ChevronDown,
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

interface PaymentRecord {
  id: string;
  booking_id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_phone: string;
  amount: number;
  method: string;
  status: string;
  screenshot_url: string | null;
  transaction_reference: string | null;
  created_at: string;
  booking_status: string;
}

function PaymentDetailModal({
  payment,
  onClose,
  onVerify,
  onReject,
  settings,
}: {
  payment: PaymentRecord;
  onClose: () => void;
  onVerify: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string, reason: string) => Promise<void>;
  settings: { currency: string };
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canVerify =
    payment.status === 'pending' &&
    payment.method !== 'cash';
  const canReject = payment.status === 'pending' && payment.method !== 'cash';

  const handleVerify = async () => {
    setIsProcessing(true);
    try {
      await onVerify(payment.booking_id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setIsProcessing(true);
    try {
      await onReject(payment.booking_id, rejectReason);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-mono">
                {payment.booking_reference}
              </span>
              <AdminStatusBadge status={payment.status} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Payment Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Passenger</span>
              <p className="text-sm font-semibold text-slate-900">{payment.passenger_name}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Phone</span>
              <p className="text-sm font-semibold text-slate-900">{payment.passenger_phone}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Amount</span>
              <p className="text-lg font-bold text-emerald-700">
                {formatCurrency(payment.amount, settings.currency)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Method</span>
              <p className="text-sm font-semibold text-slate-900 capitalize">{payment.method}</p>
            </div>
            {payment.transaction_reference && (
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 font-medium">Transaction Reference</span>
                <p className="text-xs font-mono font-semibold text-sky-700">{payment.transaction_reference}</p>
              </div>
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Booking Status</span>
              <AdminStatusBadge status={payment.booking_status} size="sm" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Submitted</span>
              <p className="text-xs text-slate-600">{formatDateTime(payment.created_at)}</p>
            </div>
          </div>

          {/* Payment Screenshot */}
          {payment.screenshot_url ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Payment Screenshot
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.screenshot_url}
                alt="Payment proof"
                className="w-full max-h-80 rounded-xl border border-slate-200 object-contain bg-slate-50"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              No payment screenshot uploaded by customer.
            </div>
          )}

          {/* Actions */}
          {canVerify && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              {!showRejectForm ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVerify}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Verify Payment
                  </button>
                  {canReject && (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject Payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-rose-700">Rejection Reason</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this payment is being rejected..."
                    rows={3}
                    className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {payment.status === 'confirmed' && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Payment has been verified and confirmed.
            </div>
          )}

          {payment.status === 'failed' && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              Payment was rejected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { bookings, settings, refreshData } = useApp();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchPayments = useCallback(async () => {
    try {
      // Try fetching from payments table with booking join
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            booking_reference,
            passenger_name,
            passenger_phone,
            status,
            payment_screenshot_url,
            payment_method,
            payment_status
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const records: PaymentRecord[] = data.map((p) => ({
          id: p.id,
          booking_id: p.booking_id,
          booking_reference: p.booking?.booking_reference || '—',
          passenger_name: p.booking?.passenger_name || 'Unknown',
          passenger_phone: p.booking?.passenger_phone || '—',
          amount: p.amount,
          method: p.method || p.booking?.payment_method || 'cash',
          status: p.status || 'pending',
          screenshot_url: p.booking?.payment_screenshot_url || null,
          transaction_reference: p.transaction_reference || null,
          created_at: p.created_at,
          booking_status: p.booking?.status || 'pending',
        }));
        setPayments(records);
      } else {
        // Fallback: derive from bookings
        const derived: PaymentRecord[] = bookings
          .filter((b) => b.payment_method || b.payment_status || b.estimated_fare)
          .map((b) => ({
            id: `pay-${b.id}`,
            booking_id: b.id,
            booking_reference: b.booking_reference,
            passenger_name: b.passenger_name,
            passenger_phone: b.passenger_phone,
            amount: b.final_fare || b.estimated_fare || 0,
            method: b.payment_method || 'cash',
            status: b.payment_status || 'pending',
            screenshot_url: b.payment_screenshot_url || null,
            transaction_reference: null,
            created_at: b.created_at,
            booking_status: b.status,
          }));
        setPayments(derived);
      }
    } catch {
      // Fallback from bookings
      const derived: PaymentRecord[] = bookings
        .filter((b) => b.estimated_fare || b.final_fare)
        .map((b) => ({
          id: `pay-${b.id}`,
          booking_id: b.id,
          booking_reference: b.booking_reference,
          passenger_name: b.passenger_name,
          passenger_phone: b.passenger_phone,
          amount: b.final_fare || b.estimated_fare || 0,
          method: b.payment_method || 'cash',
          status: b.payment_status || 'pending',
          screenshot_url: b.payment_screenshot_url || null,
          transaction_reference: null,
          created_at: b.created_at,
          booking_status: b.status,
        }));
      setPayments(derived);
    } finally {
      setIsLoading(false);
    }
  }, [bookings]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchPayments()]);
      toast.success('Payments synchronized.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVerifyPayment = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'confirmed',
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) throw error;

      await supabase
        .from('payments')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('booking_id', bookingId);

      toast.success('Payment verified and booking confirmed.');
      await fetchPayments();
    } catch (err) {
      toast.error('Failed to verify payment.');
      console.error(err);
    }
  };

  const handleRejectPayment = async (bookingId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'failed',
          payment_rejected_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) throw error;

      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('booking_id', bookingId);

      toast.success('Payment rejected.');
      await fetchPayments();
    } catch (err) {
      toast.error('Failed to reject payment.');
      console.error(err);
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    if (methodFilter !== 'all' && p.method !== methodFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.booking_reference.toLowerCase().includes(q) ||
        p.passenger_name.toLowerCase().includes(q) ||
        p.passenger_phone.includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginated = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI stats
  const totalPayments = payments.length;
  const pendingVerification = payments.filter(
    (p) => p.status === 'pending' && p.method !== 'cash' && p.screenshot_url
  ).length;
  const confirmedPayments = payments.filter((p) => p.status === 'confirmed' || p.status === 'paid').length;
  const cashPayments = payments.filter((p) => p.method === 'cash').length;
  const totalRevenue = payments
    .filter((p) => p.status === 'confirmed' || p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Financial Operations"
        badge="Payment Center"
        title="Payments & Verification"
        description="Review customer payment screenshots, verify online payments, manage cash reconciliation, and track all transaction history."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard
          title="Total Payments"
          value={totalPayments}
          subtitle="All records"
          icon={<CreditCard className="w-4.5 h-4.5" />}
          tone="neutral"
        />
        <AdminStatCard
          title="Pending Verification"
          value={pendingVerification}
          subtitle="Awaiting review"
          icon={<Clock className="w-4.5 h-4.5" />}
          tone="amber"
        />
        <AdminStatCard
          title="Confirmed"
          value={confirmedPayments}
          subtitle="Verified payments"
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          tone="green"
        />
        <AdminStatCard
          title="Cash Payments"
          value={cashPayments}
          subtitle="Collected on pickup"
          icon={<Banknote className="w-4.5 h-4.5" />}
          tone="blue"
        />
        <AdminStatCard
          title="Confirmed Revenue"
          value={formatCurrency(totalRevenue, settings.currency)}
          subtitle="Verified payments"
          icon={<DollarSign className="w-4.5 h-4.5" />}
          tone="green"
        />
        <AdminStatCard
          title="Pending Amount"
          value={formatCurrency(pendingAmount, settings.currency)}
          subtitle="Awaiting confirmation"
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          tone="amber"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, name, phone..."
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

          <div className="flex gap-2">
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="card">Card</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed/Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {pendingVerification > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800 font-medium">
              <strong>{pendingVerification}</strong> payment{pendingVerification !== 1 ? 's' : ''} with uploaded screenshots are awaiting your verification.
            </span>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <AdminTableCard
        title="Payment Transaction History"
        subtitle="All payment records with verification status and method breakdown."
        totalCount={filteredPayments.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredPayments.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            isLoading={isLoading}
            itemLabel="payments"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Reference</th>
              <th className="py-3.5 px-4 font-semibold">Passenger</th>
              <th className="py-3.5 px-4 font-semibold">Method</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Screenshot</th>
              <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Submitted</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableSkeletonRows rows={10} cols={8} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16">
                  <EmptyStateView
                    icon={CreditCard}
                    title="No Payment Records Found"
                    description="No payment records match your current filters."
                    actionLabel={searchQuery || methodFilter !== 'all' || statusFilter !== 'all' ? 'Clear Filters' : undefined}
                    onAction={() => {
                      setSearchQuery('');
                      setMethodFilter('all');
                      setStatusFilter('all');
                    }}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {p.booking_reference}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{p.passenger_name}</div>
                    <div className="text-[10px] text-slate-400">{p.passenger_phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      p.method === 'cash'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : p.method === 'online'
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {p.method === 'cash' ? <Banknote className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                      {p.method}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <AdminStatusBadge
                      status={p.status}
                      label={p.status === 'confirmed' ? 'Verified' : p.status === 'failed' ? 'Rejected' : p.status}
                      size="sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    {p.screenshot_url ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Camera className="w-2.5 h-2.5" />
                        Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatCurrency(p.amount, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400 whitespace-nowrap hidden md:table-cell">
                    {formatDateTime(p.created_at)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View payment details"
                      onClick={() => setSelectedPayment(p)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onVerify={handleVerifyPayment}
          onReject={handleRejectPayment}
          settings={settings}
        />
      )}
    </div>
  );
}
