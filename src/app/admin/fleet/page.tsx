'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Vehicle, VehicleType, VehicleStatus } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import {
  Truck,
  Search,
  X,
  RefreshCw,
  Plus,
  Car,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
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

const VEHICLE_TYPES: VehicleType[] = ['sedan', 'suv', 'van', 'vip_gmc', 'bus'];
const STATUS_OPTIONS: VehicleStatus[] = ['available', 'assigned', 'maintenance', 'inactive'];

function VehicleModal({
  vehicle,
  drivers,
  onClose,
  onSave,
  isNew,
}: {
  vehicle?: Partial<Vehicle>;
  drivers: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: Partial<Vehicle>) => Promise<void>;
  isNew: boolean;
}) {
  const [form, setForm] = useState<Partial<Vehicle>>({
    plate_number: vehicle?.plate_number || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    vehicle_type: vehicle?.vehicle_type || 'sedan',
    color: vehicle?.color || '',
    seating_capacity: vehicle?.seating_capacity || 4,
    status: vehicle?.status || 'available',
    insurance_expiry: vehicle?.insurance_expiry || '',
    inspection_expiry: vehicle?.inspection_expiry || '',
    ...vehicle,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.plate_number || !form.make || !form.model) {
      toast.error('Plate number, make, and model are required.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">
            {isNew ? 'Add New Vehicle' : 'Edit Vehicle'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Plate Number *</label>
              <input
                value={form.plate_number || ''}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vehicle Type</label>
              <select
                value={form.vehicle_type || 'sedan'}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as VehicleType })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Make *</label>
              <input
                value={form.make || ''}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Toyota"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Model *</label>
              <input
                value={form.model || ''}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Camry"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Year</label>
              <input
                type="number"
                value={form.year || ''}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Color</label>
              <input
                value={form.color || ''}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                placeholder="White"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Seating Capacity</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.seating_capacity || 4}
                onChange={(e) => setForm({ ...form, seating_capacity: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={form.status || 'available'}
                onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Insurance Expiry</label>
              <input
                type="date"
                value={form.insurance_expiry?.split('T')[0] || ''}
                onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Inspection Expiry</label>
              <input
                type="date"
                value={form.inspection_expiry?.split('T')[0] || ''}
                onChange={(e) => setForm({ ...form, inspection_expiry: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isNew ? 'Add Vehicle' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFleetPage() {
  const { vehicles, drivers, refreshData, addVehicle, updateVehicle } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const driverOptions = drivers.map((d) => ({
    id: d.id,
    name: d.profile?.full_name || d.full_name || 'Driver',
  }));

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (typeFilter !== 'all' && v.vehicle_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.plate_number.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paginated = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
  const assignedVehicles = vehicles.filter((v) => v.status === 'assigned').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Fleet data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddVehicle = async (data: Partial<Vehicle>) => {
    try {
      await addVehicle(data as Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>);
      toast.success('Vehicle added to fleet.');
      await refreshData();
    } catch {
      toast.error('Failed to add vehicle.');
    }
  };

  const handleEditVehicle = async (data: Partial<Vehicle>) => {
    if (!editingVehicle) return;
    try {
      await updateVehicle(editingVehicle.id, data);
      toast.success('Vehicle updated.');
      await refreshData();
      setEditingVehicle(null);
    } catch {
      toast.error('Failed to update vehicle.');
    }
  };

  const handleStatusChange = async (vehicleId: string, newStatus: VehicleStatus) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);
      if (error) throw error;
      toast.success(`Vehicle status updated to ${newStatus}.`);
      await refreshData();
    } catch {
      toast.error('Failed to update vehicle status.');
    }
  };

  const isExpiringSoon = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Fleet Management"
        badge="Vehicle Registry"
        title="Fleet & Vehicles"
        description="Manage vehicle registration, seating capacity, insurance, inspection expiry, driver assignments, and vehicle status across the entire fleet."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vehicle
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard title="Total Fleet" value={totalVehicles} subtitle="All vehicles" icon={<Truck className="w-4.5 h-4.5" />} tone="neutral" />
        <AdminStatCard title="Available" value={availableVehicles} subtitle="Ready for dispatch" icon={<CheckCircle2 className="w-4.5 h-4.5" />} tone="green" />
        <AdminStatCard title="Assigned" value={assignedVehicles} subtitle="With a driver" icon={<Car className="w-4.5 h-4.5" />} tone="blue" />
        <AdminStatCard title="Maintenance" value={maintenanceVehicles} subtitle="Under repair" icon={<AlertTriangle className="w-4.5 h-4.5" />} tone="amber" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search plate, make, model..."
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
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
          >
            <option value="all">All Types</option>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* Vehicle Table */}
      <AdminTableCard
        title="Vehicle Registry"
        subtitle="Complete fleet inventory with status, driver assignment, and compliance tracking."
        totalCount={filteredVehicles.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredVehicles.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="vehicles"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Vehicle</th>
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Type</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden md:table-cell">Seats</th>
              <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Insurance</th>
              <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Inspection</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Assigned Driver</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16">
                  <EmptyStateView
                    icon={Truck}
                    title="No Vehicles Found"
                    description="No vehicles match your filters. Add vehicles using the button above."
                  />
                </td>
              </tr>
            ) : (
              paginated.map((v) => {
                const assignedDriver = drivers.find(
                  (d) => d.assigned_vehicle_id === v.id
                );
                const insuranceExpiring = isExpiringSoon(v.insurance_expiry);
                const inspectionExpiring = isExpiringSoon(v.inspection_expiry);

                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.make} {v.model}</div>
                      <div className="text-[11px] text-amber-700 font-mono font-semibold">{v.plate_number}</div>
                      {v.year && <div className="text-[10px] text-slate-400">{v.year} • {v.color || 'N/A'}</div>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[11px] font-semibold text-emerald-700 capitalize">
                        {v.vehicle_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={v.status}
                        onChange={(e) => handleStatusChange(v.id, e.target.value as VehicleStatus)}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                          v.status === 'available'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : v.status === 'assigned'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : v.status === 'maintenance'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center hidden md:table-cell">
                      <span className="font-bold text-slate-700">{v.seating_capacity}</span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {v.insurance_expiry ? (
                        <span className={`text-[10px] font-semibold ${insuranceExpiring ? 'text-rose-600' : 'text-slate-600'}`}>
                          {insuranceExpiring && <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5 text-rose-500" />}
                          {v.insurance_expiry.split('T')[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {v.inspection_expiry ? (
                        <span className={`text-[10px] font-semibold ${inspectionExpiring ? 'text-rose-600' : 'text-slate-600'}`}>
                          {inspectionExpiring && <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5 text-rose-500" />}
                          {v.inspection_expiry.split('T')[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {assignedDriver ? (
                        <span className="text-[11px] font-semibold text-slate-700">
                          {assignedDriver.profile?.full_name || assignedDriver.full_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <AdminActionGroup>
                        <AdminActionButton
                          variant="edit"
                          tooltip="Edit vehicle"
                          onClick={() => setEditingVehicle(v)}
                        />
                      </AdminActionGroup>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {/* Add Vehicle Modal */}
      {showModal && (
        <VehicleModal
          drivers={driverOptions}
          onClose={() => setShowModal(false)}
          onSave={handleAddVehicle}
          isNew
        />
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <VehicleModal
          vehicle={editingVehicle}
          drivers={driverOptions}
          onClose={() => setEditingVehicle(null)}
          onSave={handleEditVehicle}
          isNew={false}
        />
      )}
    </div>
  );
}
