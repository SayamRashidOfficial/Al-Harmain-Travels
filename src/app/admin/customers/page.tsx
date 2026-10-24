'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Profile } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Users,
  Search,
  X,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Star,
  BookOpen,
  CreditCard,
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

interface CustomerRecord {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  booking_count: number;
  total_spent: number;
  last_booking_date: string | null;
}

function CustomerDetailModal({
  customer,
  bookings,
  onClose,
  onToggleStatus,
  settings,
}: {
  customer: CustomerRecord;
  bookings: Array<{id: string; booking_reference: string; status: string; created_at: string; pickup_address: string; destination_address: string; final_fare?: number | null; estimated_fare?: number | null; vehicle_type: string}>;
  onClose: () => void;
  onToggleStatus: (id: string) => Promise<void>;
  settings: { currency: string };
}) {
  const [isToggling, setIsToggling] = useState(false);

  const customerBookings = bookings
    .filter((b) => b.booking_reference)
    .slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 border-2 border-sky-200 flex items-center justify-center text-xl font-bold text-sky-700 overflow-hidden">
              {customer.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (customer.full_name || 'C').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{customer.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <AdminStatusBadge status={customer.status} size="sm" />
                <span className="text-xs text-slate-400">{customer.booking_count} bookings</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
              <div className="text-lg font-bold text-emerald-700">{customer.booking_count}</div>
              <div className="text-[10px] text-slate-500">Total Bookings</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
              <div className="text-lg font-bold text-amber-700">
                {formatCurrency(customer.total_spent, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Total Spent</div>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 text-center">
              <div className="text-xs font-bold text-sky-700">
                {customer.last_booking_date
                  ? new Date(customer.last_booking_date).toLocaleDateString()
                  : '—'}
              </div>
              <div className="text-[10px] text-slate-500">Last Booking</div>
            </div>
          </div>

          {/* Contact Info */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Email</span>
                <p className="text-sm font-semibold text-slate-900">{customer.email || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Phone</span>
                <p className="text-sm font-semibold text-slate-900">{customer.phone || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Member Since</span>
                <p className="text-xs text-slate-600">{formatDateTime(customer.created_at)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Account Status</span>
                <AdminStatusBadge status={customer.status} size="sm" />
              </div>
            </div>
          </section>

          {/* Booking History */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Recent Booking History
            </h3>
            {customerBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No bookings found for this customer.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {customerBookings.map((b) => (
                  <div key={b.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-700">{b.booking_reference}</span>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                        {b.pickup_address?.split(',')[0]} → {b.destination_address?.split(',')[0]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AdminStatusBadge status={b.status} size="sm" />
                      <span className="text-xs font-bold text-slate-900">
                        {formatCurrency(b.final_fare || b.estimated_fare, settings.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Account Control */}
          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={async () => {
                setIsToggling(true);
                try {
                  await onToggleStatus(customer.id);
                } finally {
                  setIsToggling(false);
                }
              }}
              disabled={isToggling}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                customer.status === 'active'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isToggling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {customer.status === 'active' ? 'Suspend Account' : 'Activate Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const { usersList, bookings, settings, refreshData, toggleUserStatus } = useApp();

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Build customer records from usersList (customer role)
  useEffect(() => {
    const customerProfiles = usersList.filter((u) => u.role === 'customer');
    const records: CustomerRecord[] = customerProfiles.map((u) => {
      const customerBookings = bookings.filter(
        (b) => b.customer_id === u.id || b.passenger_phone === u.phone
      );
      const completedBookings = customerBookings.filter(
        (b) => b.status === 'trip_completed' || b.status === 'ride_completed' || b.status === 'payment_completed'
      );
      const totalSpent = completedBookings.reduce(
        (sum, b) => sum + (b.final_fare || b.estimated_fare || 0),
        0
      );
      const lastBooking = customerBookings.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        id: u.id,
        full_name: u.full_name || 'Unknown Customer',
        email: u.email || null,
        phone: u.phone || null,
        avatar_url: u.avatar_url || null,
        status: u.status || 'active',
        created_at: u.created_at,
        booking_count: customerBookings.length,
        total_spent: totalSpent,
        last_booking_date: lastBooking?.created_at || null,
      };
    });
    setCustomers(records);
  }, [usersList, bookings]);

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.full_name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    return true;
  });

  const paginated = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const withBookings = customers.filter((c) => c.booking_count > 0).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Customer data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleUserStatus(id);
      await refreshData();
      toast.success('Account status updated.');
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const getCustomerBookings = (customerId: string) => {
    return bookings
      .filter((b) => b.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Customer Management"
        badge="Pilgrim Profiles"
        title="Customers"
        description="Browse and manage pilgrim accounts, booking history, spending records, and account status. Activate or suspend accounts as needed."
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
        <AdminStatCard title="Total Customers" value={totalCustomers} subtitle="All accounts" icon={<Users className="w-4.5 h-4.5" />} tone="neutral" />
        <AdminStatCard title="Active Accounts" value={activeCustomers} subtitle="Enabled profiles" icon={<CheckCircle2 className="w-4.5 h-4.5" />} tone="green" />
        <AdminStatCard title="With Bookings" value={withBookings} subtitle="Have placed a booking" icon={<BookOpen className="w-4.5 h-4.5" />} tone="blue" />
        <AdminStatCard title="Total Revenue" value={formatCurrency(totalRevenue, settings.currency)} subtitle="From completed trips" icon={<CreditCard className="w-4.5 h-4.5" />} tone="amber" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
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
          {['all', 'active', 'suspended', 'deactivated'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                statusFilter === s
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <AdminTableCard
        title="Customer Registry"
        subtitle="All customer profiles with booking counts and spending summary."
        totalCount={filteredCustomers.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredCustomers.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="customers"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Customer</th>
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Contact</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden md:table-cell">Bookings</th>
              <th className="py-3.5 px-4 font-semibold text-right hidden md:table-cell">Total Spent</th>
              <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Last Booking</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Joined</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16">
                  <EmptyStateView
                    icon={Users}
                    title="No Customers Found"
                    description="No customer accounts match your search or filter."
                    actionLabel={searchQuery || statusFilter !== 'all' ? 'Clear Filters' : undefined}
                    onAction={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sm font-bold text-sky-700 overflow-hidden shrink-0">
                        {c.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 truncate max-w-[120px]">{c.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="text-[11px] text-slate-600">{c.phone || '—'}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.email || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <AdminStatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    <span className="font-bold text-sky-700">{c.booking_count}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">
                    <span className="font-bold tabular-nums text-emerald-700">
                      {formatCurrency(c.total_spent, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400 hidden lg:table-cell">
                    {c.last_booking_date ? new Date(c.last_booking_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400 hidden md:table-cell">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View customer profile"
                      onClick={() => setSelectedCustomer(c)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          bookings={getCustomerBookings(selectedCustomer.id)}
          onClose={() => setSelectedCustomer(null)}
          onToggleStatus={handleToggleStatus}
          settings={settings}
        />
      )}
    </div>
  );
}
