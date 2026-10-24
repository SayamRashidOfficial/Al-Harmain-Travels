'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Driver, Vehicle, Profile } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  UserCheck,
  Search,
  X,
  RefreshCw,
  Plus,
  Star,
  Car,
  Phone,
  Mail,
  Edit3,
  Eye,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  Shield,
  TrendingUp,
  Award,
  Wallet,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
  AdminTableCard,
  AdminPagination,
} from '@/components/admin/AdminUIComponents';
import { TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

function DriverDetailModal({
  driver,
  vehicles,
  onClose,
  onUpdate,
  onAssignVehicle,
  onToggleStatus,
  settings,
}: {
  driver: Driver;
  vehicles: Vehicle[];
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
  onAssignVehicle: (driverId: string, vehicleId: string | null) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
  settings: { currency: string };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(driver.profile?.full_name || driver.full_name || '');
  const [phone, setPhone] = useState(driver.profile?.phone || driver.phone || '');
  const [licenseNumber, setLicenseNumber] = useState(driver.license_number || '');
  const [nationalId, setNationalId] = useState(driver.national_id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState(driver.assigned_vehicle_id || '');
  const [isSaving, setIsSaving] = useState(false);

  const isActive = driver.profile?.status === 'active';
  const availableVehicles = vehicles.filter(
    (v) => v.status === 'available' || v.id === driver.assigned_vehicle_id
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(driver.id, {
        full_name: fullName,
        phone,
        license_number: licenseNumber,
        national_id: nationalId,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVehicleAssign = async () => {
    await onAssignVehicle(driver.id, selectedVehicleId || null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-xl font-bold text-emerald-700 overflow-hidden">
              {driver.profile?.avatar_url || driver.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driver.profile?.avatar_url || driver.avatar_url || ''}
                  alt="Driver"
                  className="w-full h-full object-cover"
                />
              ) : (
                (driver.profile?.full_name || driver.full_name || 'D').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {driver.profile?.full_name || driver.full_name || 'Driver Profile'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <AdminStatusBadge status={driver.profile?.status || 'active'} size="sm" />
                <AdminStatusBadge status={driver.status} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
              title="Edit driver"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Performance Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {driver.rating !== null && driver.rating !== undefined ? Number(driver.rating).toFixed(1) : '—'}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Star className="w-2.5 h-2.5 text-amber-500" />
                Rating
              </div>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 text-center">
              <div className="text-lg font-bold text-sky-700">{driver.total_rides || 0}</div>
              <div className="text-[10px] text-slate-500">Total Trips</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
              <div className="text-lg font-bold text-amber-700">
                {formatCurrency(driver.cash_collected || 0, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Cash Held</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 text-center">
              <div className="text-lg font-bold text-purple-700">
                {formatCurrency(driver.total_earnings || 0, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-500">Earnings</div>
            </div>
          </div>

          {/* Profile Info */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Information</h3>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500">License Number</label>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500">National ID</label>
                  <input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Full Name</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {driver.profile?.full_name || driver.full_name || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Phone</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {driver.profile?.phone || driver.phone || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">License Number</span>
                  <p className="text-sm font-semibold text-slate-900">{driver.license_number || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">National ID</span>
                  <p className="text-sm font-semibold text-slate-900">{driver.national_id || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Email</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {driver.profile?.email || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Member Since</span>
                  <p className="text-xs text-slate-600">{formatDateTime(driver.created_at)}</p>
                </div>
              </div>
            )}
            {isEditing && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* Vehicle Assignment */}
          <section className="bg-sky-50 rounded-xl p-4 border border-sky-200 space-y-3">
            <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Vehicle Assignment
            </h3>
            {driver.assigned_vehicle || driver.vehicle ? (
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-sky-100">
                <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center">
                  <Car className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {(driver.assigned_vehicle || driver.vehicle)?.make}{' '}
                    {(driver.assigned_vehicle || driver.vehicle)?.model}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(driver.assigned_vehicle || driver.vehicle)?.plate_number} •{' '}
                    {(driver.assigned_vehicle || driver.vehicle)?.vehicle_type?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No vehicle currently assigned.</p>
            )}
            <div className="flex items-center gap-3">
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">— Unassign Vehicle —</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} — {v.plate_number} ({v.vehicle_type?.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              <button
                onClick={handleVehicleAssign}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Update
              </button>
            </div>
          </section>

          {/* Account Control */}
          <div className="border-t border-slate-200 pt-4 flex items-center gap-3">
            <button
              onClick={() => onToggleStatus(driver.id)}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                isActive
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isActive ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Deactivate Account
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Activate Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDriversPage() {
  const { drivers, vehicles, settings, refreshData, adminUpdateUser, adminAssignVehicle, toggleUserStatus } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered and paginated drivers
  const filteredDrivers = drivers.filter((d) => {
    const name = (d.profile?.full_name || d.full_name || '').toLowerCase();
    const phone = (d.profile?.phone || d.phone || '').toLowerCase();
    const license = (d.license_number || '').toLowerCase();

    if (statusFilter !== 'all' && d.status !== statusFilter && d.profile?.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return name.includes(q) || phone.includes(q) || license.includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDrivers.length / pageSize);
  const paginated = filteredDrivers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI stats
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter((d) => d.status === 'available').length;
  const activeDrivers = drivers.filter((d) => d.profile?.status === 'active').length;
  const onTripDrivers = drivers.filter((d) => d.status === 'on_trip' || d.status === 'assigned').length;
  const avgRating =
    drivers.filter((d) => d.rating !== null).length > 0
      ? drivers
          .filter((d) => d.rating !== null)
          .reduce((sum, d) => sum + (Number(d.rating) || 0), 0) /
        drivers.filter((d) => d.rating !== null).length
      : 0;
  const totalCashHeld = drivers.reduce((sum, d) => sum + (d.cash_collected || 0), 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Driver data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateDriver = async (id: string, data: Record<string, unknown>) => {
    try {
      const result = await adminUpdateUser(id, data as Parameters<typeof adminUpdateUser>[1]);
      if (result.success) {
        toast.success('Driver profile updated.');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to update driver.');
      }
    } catch {
      toast.error('Failed to update driver.');
    }
  };

  const handleAssignVehicle = async (driverId: string, vehicleId: string | null) => {
    try {
      const result = await adminAssignVehicle(driverId, vehicleId);
      if (result.success) {
        toast.success(vehicleId ? 'Vehicle assigned to driver.' : 'Vehicle unassigned.');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to assign vehicle.');
      }
    } catch {
      toast.error('Failed to assign vehicle.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleUserStatus(id);
      toast.success('Driver status updated.');
      await refreshData();
    } catch {
      toast.error('Failed to update driver status.');
    }
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Fleet Management"
        badge="Chauffeur Registry"
        title="Driver Management"
        description="Manage chauffeur profiles, vehicle assignments, ratings, trip history, and account status. Activate or deactivate driver accounts as needed."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard
          title="Total Drivers"
          value={totalDrivers}
          subtitle="All chauffeurs"
          icon={<UserCheck className="w-4.5 h-4.5" />}
          tone="neutral"
        />
        <AdminStatCard
          title="Active Accounts"
          value={activeDrivers}
          subtitle="Enabled profiles"
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          tone="green"
        />
        <AdminStatCard
          title="Available Now"
          value={availableDrivers}
          subtitle="Ready for dispatch"
          icon={<Shield className="w-4.5 h-4.5" />}
          tone="blue"
        />
        <AdminStatCard
          title="On Trip"
          value={onTripDrivers}
          subtitle="Currently driving"
          icon={<Car className="w-4.5 h-4.5" />}
          tone="purple"
        />
        <AdminStatCard
          title="Avg Rating"
          value={avgRating > 0 ? `${avgRating.toFixed(1)}★` : '—'}
          subtitle="Fleet average"
          icon={<Star className="w-4.5 h-4.5" />}
          tone="amber"
        />
        <AdminStatCard
          title="Cash Held"
          value={formatCurrency(totalCashHeld, settings.currency)}
          subtitle="Driver wallets"
          icon={<Wallet className="w-4.5 h-4.5" />}
          tone="amber"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, license..."
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
        <div className="flex flex-wrap gap-2">
          {['all', 'available', 'assigned', 'on_trip', 'offline'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                statusFilter === s
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {s === 'all' ? 'All Drivers' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers Table */}
      <AdminTableCard
        title="Chauffeur Registry"
        subtitle="All driver profiles with status, ratings, and vehicle assignments."
        totalCount={filteredDrivers.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredDrivers.length}
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
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Contact</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Vehicle</th>
              <th className="py-3.5 px-4 font-semibold text-center">Rating</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden md:table-cell">Trips</th>
              <th className="py-3.5 px-4 font-semibold text-right hidden lg:table-cell">Cash Held</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16">
                  <EmptyStateView
                    icon={UserCheck}
                    title="No Drivers Found"
                    description={
                      searchQuery || statusFilter !== 'all'
                        ? 'No drivers match your search or filter.'
                        : 'No drivers registered yet. Add drivers from the Users & Access section.'
                    }
                    actionLabel={searchQuery || statusFilter !== 'all' ? 'Clear Filters' : undefined}
                    onAction={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700 overflow-hidden shrink-0">
                        {d.profile?.avatar_url || d.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.profile?.avatar_url || d.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (d.profile?.full_name || d.full_name || 'D').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 truncate max-w-[120px]">
                          {d.profile?.full_name || d.full_name || 'Unknown Driver'}
                        </div>
                        <div className="text-[10px] text-slate-400">{d.license_number || 'No license'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="text-[11px] text-slate-600">{d.profile?.phone || d.phone || '—'}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{d.profile?.email || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <AdminStatusBadge status={d.profile?.status || 'active'} size="sm" />
                      <AdminStatusBadge status={d.status} size="sm" />
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    {d.assigned_vehicle || d.vehicle ? (
                      <div className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {(d.assigned_vehicle || d.vehicle)?.make} {(d.assigned_vehicle || d.vehicle)?.model}
                        <div className="text-[10px] text-slate-400">
                          {(d.assigned_vehicle || d.vehicle)?.plate_number}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="font-bold text-slate-900">
                        {d.rating !== null && d.rating !== undefined ? Number(d.rating).toFixed(1) : '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{d.rating_count || 0} reviews</div>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    <span className="font-bold text-sky-700">{d.total_rides || 0}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell">
                    <span className="font-bold tabular-nums text-amber-700">
                      {formatCurrency(d.cash_collected || 0, settings.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View driver profile"
                      onClick={() => setSelectedDriver(d)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          vehicles={vehicles}
          onClose={() => setSelectedDriver(null)}
          onUpdate={handleUpdateDriver}
          onAssignVehicle={handleAssignVehicle}
          onToggleStatus={handleToggleStatus}
          settings={settings}
        />
      )}
    </div>
  );
}
