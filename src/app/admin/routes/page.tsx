'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RateRoute } from '@/types';
import {
  Route,
  Plus,
  RefreshCw,
  CheckCircle2,
  X,
  Map,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminActionButton,
  AdminActionGroup,
  AdminTableCard,
  AdminPagination,
} from '@/components/admin/AdminUIComponents';
import { EmptyStateView } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

type RouteFormData = {
  id?: string;
  route_name: string;
  origin_name: string;
  destination_name: string;
  is_airport: boolean;
  is_active: boolean;
};

function RouteModal({
  route,
  onClose,
  onSave,
  isNew,
}: {
  route?: Partial<RouteFormData>;
  onClose: () => void;
  onSave: (data: RouteFormData) => Promise<void>;
  isNew: boolean;
}) {
  const [form, setForm] = useState<RouteFormData>({
    route_name: route?.route_name || '',
    origin_name: route?.origin_name || '',
    destination_name: route?.destination_name || '',
    is_airport: route?.is_airport ?? false,
    is_active: route?.is_active ?? true,
    id: route?.id,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.origin_name || !form.destination_name) {
      toast.error('Origin and destination are required.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">
            {isNew ? 'Add Service Route' : 'Edit Service Route'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Route Name</label>
            <input
              value={form.route_name}
              onChange={(e) => setForm({ ...form, route_name: e.target.value })}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Makkah ↔ Madinah"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Origin *</label>
            <input
              value={form.origin_name}
              onChange={(e) => setForm({ ...form, origin_name: e.target.value })}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Makkah, Madinah, Jeddah Airport..."
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Destination *</label>
            <input
              value={form.destination_name}
              onChange={(e) => setForm({ ...form, destination_name: e.target.value })}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Makkah, Madinah, Jeddah Airport..."
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Airport Route</label>
              <button type="button" onClick={() => setForm({ ...form, is_airport: !form.is_airport })} className="cursor-pointer">
                {form.is_airport ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Active</label>
              <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className="cursor-pointer">
                {form.is_active ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isNew ? 'Add Route' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRoutesPage() {
  const { rateRoutes, addRateRoute, updateRateRoute, deleteRateRoute, fixedFareRates, refreshData } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RateRoute | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const activeRoutes = rateRoutes.filter((r) => r.is_active);
  const inactiveRoutes = rateRoutes.filter((r) => !r.is_active);
  const airportRoutes = rateRoutes.filter((r) => r.is_airport);

  const paginated = rateRoutes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Routes data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRoute = async (data: RouteFormData) => {
    try {
      const routeName = data.route_name || `${data.origin_name} → ${data.destination_name}`;
      const routeId = routeName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const result = await addRateRoute({
        id: routeId,
        route_name: routeName,
        origin_name: data.origin_name,
        destination_name: data.destination_name,
        is_airport: data.is_airport,
        is_active: data.is_active,
      });
      if (result.success) {
        toast.success('Route added successfully.');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to add route.');
      }
    } catch {
      toast.error('Failed to add route.');
    }
  };

  const handleUpdateRoute = async (data: RouteFormData) => {
    if (!data.id) return;
    try {
      const result = await updateRateRoute(data.id, {
        route_name: data.route_name,
        origin_name: data.origin_name,
        destination_name: data.destination_name,
        is_airport: data.is_airport,
        is_active: data.is_active,
      });
      if (result.success) {
        toast.success('Route updated.');
        setEditingRoute(null);
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to update route.');
      }
    } catch {
      toast.error('Failed to update route.');
    }
  };

  const handleToggleRoute = async (route: RateRoute) => {
    try {
      const result = await updateRateRoute(route.id, { is_active: !route.is_active });
      if (result.success) {
        toast.success(route.is_active ? 'Route deactivated.' : 'Route activated.');
        await refreshData();
      } else {
        toast.error('Failed to toggle route status.');
      }
    } catch {
      toast.error('Failed to toggle route status.');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      const result = await deleteRateRoute(routeId);
      if (result.success) {
        toast.success('Route deleted.');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to delete route.');
      }
    } catch {
      toast.error('Failed to delete route.');
    }
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Tariff & Configuration"
        badge="Service Zones"
        title="Routes & Service Areas"
        description="Define and manage all origin-destination route pairs, service area boundaries, airport routes, and route activation status."
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
            Add Route
          </button>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard title="Total Routes" value={rateRoutes.length} subtitle="All route pairs" icon={<Route className="w-4.5 h-4.5" />} tone="neutral" />
        <AdminStatCard title="Active Routes" value={activeRoutes.length} subtitle="Available for booking" icon={<CheckCircle2 className="w-4.5 h-4.5" />} tone="green" />
        <AdminStatCard title="Inactive" value={inactiveRoutes.length} subtitle="Disabled routes" icon={<X className="w-4.5 h-4.5" />} tone="amber" />
        <AdminStatCard title="Fare Matrices" value={fixedFareRates.length} subtitle="Rate entries" icon={<Map className="w-4.5 h-4.5" />} tone="blue" />
      </div>

      <AdminTableCard
        title="Service Route Directory"
        subtitle="All origin-destination routes with airport flag and status."
        totalCount={rateRoutes.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={rateRoutes.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="routes"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Route Name</th>
              <th className="py-3.5 px-4 font-semibold">Origin</th>
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Destination</th>
              <th className="py-3.5 px-4 font-semibold text-center hidden md:table-cell">Airport</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16">
                  <EmptyStateView
                    icon={Route}
                    title="No Routes Configured"
                    description="Add service routes to define origin-destination pairs for your fixed fare system."
                    actionLabel="Add First Route"
                    onAction={() => setShowModal(true)}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {r.route_name || `${r.origin_name} → ${r.destination_name}`}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-700">{r.origin_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-slate-700">{r.destination_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    {r.is_airport ? (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                        Airport
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => handleToggleRoute(r)} className="cursor-pointer" title={r.is_active ? 'Deactivate route' : 'Activate route'}>
                      {r.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionGroup>
                      <AdminActionButton variant="edit" tooltip="Edit route" onClick={() => setEditingRoute(r)} />
                      <AdminActionButton variant="delete" tooltip="Delete route" onClick={() => handleDeleteRoute(r.id)} />
                    </AdminActionGroup>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {showModal && (
        <RouteModal onClose={() => setShowModal(false)} onSave={handleAddRoute} isNew />
      )}
      {editingRoute && (
        <RouteModal
          route={{ ...editingRoute, id: editingRoute.id }}
          onClose={() => setEditingRoute(null)}
          onSave={handleUpdateRoute}
          isNew={false}
        />
      )}
    </div>
  );
}
