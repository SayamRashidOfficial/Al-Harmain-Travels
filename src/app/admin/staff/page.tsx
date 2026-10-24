'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Profile, UserStatus } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import {
  UserCog,
  Search,
  X,
  RefreshCw,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Eye,
  Edit3,
  UserCheck,
  Activity,
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

function StaffDetailModal({
  staff,
  onClose,
  onToggleStatus,
}: {
  staff: Profile;
  onClose: () => void;
  onToggleStatus: (id: string) => Promise<void>;
}) {
  const [isToggling, setIsToggling] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 border-2 border-purple-200 flex items-center justify-center text-lg font-bold text-purple-700 overflow-hidden">
              {staff.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (staff.full_name || 'S').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{staff.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <AdminStatusBadge status={staff.role} size="sm" />
                <AdminStatusBadge status={staff.status} size="sm" />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Email</span>
                <p className="text-sm font-semibold text-slate-900">{staff.email || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Phone</span>
                <p className="text-sm font-semibold text-slate-900">{staff.phone || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Role</span>
                <p className="text-sm font-semibold text-slate-900 capitalize">{staff.role}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Joined</span>
                <p className="text-xs text-slate-600">{formatDateTime(staff.created_at)}</p>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={async () => {
                setIsToggling(true);
                try {
                  await onToggleStatus(staff.id);
                } finally {
                  setIsToggling(false);
                }
              }}
              disabled={isToggling}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                staff.status === 'active'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isToggling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {staff.status === 'active' ? 'Suspend Account' : 'Activate Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminStaffPage() {
  const { usersList, refreshData, toggleUserStatus, adminCreateUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'dispatcher' as 'dispatcher' | 'admin',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Staff = dispatchers and admins (exclude customers and drivers)
  const staffList = usersList.filter(
    (u) => u.role === 'dispatcher' || u.role === 'admin'
  );

  const filteredStaff = staffList.filter((s) => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return true;
  });

  const paginated = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalStaff = staffList.length;
  const totalDispatchers = staffList.filter((s) => s.role === 'dispatcher').length;
  const totalAdmins = staffList.filter((s) => s.role === 'admin').length;
  const activeStaff = staffList.filter((s) => s.status === 'active').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Staff data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaffForm.full_name || !newStaffForm.email) {
      toast.error('Full name and email are required.');
      return;
    }
    setIsCreating(true);
    try {
      const result = await adminCreateUser({
        role: newStaffForm.role,
        full_name: newStaffForm.full_name,
        email: newStaffForm.email,
        phone: newStaffForm.phone,
        password: newStaffForm.password || undefined,
        email_verified: true,
        status: 'active',
      });
      if (result.success) {
        toast.success(`${newStaffForm.role} account created.`);
        setShowCreateModal(false);
        setNewStaffForm({ full_name: '', email: '', phone: '', password: '', role: 'dispatcher' });
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to create account.');
      }
    } finally {
      setIsCreating(false);
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

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Access Control"
        badge="Staff Management"
        title="Dispatchers & Staff"
        description="Manage dispatcher and admin accounts. Create new staff, assign roles, activate or suspend access, and track administrative activity."
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
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Staff
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard title="Total Staff" value={totalStaff} subtitle="All staff accounts" icon={<UserCog className="w-4.5 h-4.5" />} tone="neutral" />
        <AdminStatCard title="Dispatchers" value={totalDispatchers} subtitle="Operations staff" icon={<Activity className="w-4.5 h-4.5" />} tone="blue" />
        <AdminStatCard title="Administrators" value={totalAdmins} subtitle="Admin accounts" icon={<Shield className="w-4.5 h-4.5" />} tone="purple" />
        <AdminStatCard title="Active Accounts" value={activeStaff} subtitle="Currently active" icon={<CheckCircle2 className="w-4.5 h-4.5" />} tone="green" />
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
          {['all', 'admin', 'dispatcher'].map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                roleFilter === r
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {r === 'all' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <AdminTableCard
        title="Staff Directory"
        subtitle="All dispatcher and admin accounts with role and status information."
        totalCount={filteredStaff.length}
        footer={
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredStaff.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="staff"
            pageSizeOptions={[10]}
          />
        }
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Staff Member</th>
              <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Contact</th>
              <th className="py-3.5 px-4 font-semibold">Role</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Joined</th>
              <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16">
                  <EmptyStateView
                    icon={UserCog}
                    title="No Staff Found"
                    description="No staff accounts match your filters."
                  />
                </td>
              </tr>
            ) : (
              paginated.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-sm font-bold text-purple-700 overflow-hidden shrink-0">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (s.full_name || 'S').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 truncate max-w-[120px]">
                        {s.full_name || 'Staff Member'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="text-[11px] text-slate-600">{s.phone || '—'}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{s.email || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <AdminStatusBadge
                      status={s.role}
                      tone={s.role === 'admin' ? 'purple' : 'blue'}
                      size="sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <AdminStatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400 hidden md:table-cell">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <AdminActionButton
                      variant="view"
                      tooltip="View staff profile"
                      onClick={() => setSelectedStaff(s)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableCard>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">Create Staff Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                <select
                  value={newStaffForm.role}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as 'dispatcher' | 'admin' })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Full Name *</label>
                <input
                  value={newStaffForm.full_name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, full_name: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email *</label>
                <input
                  type="email"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
                <input
                  value={newStaffForm.phone}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="+966..."
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Password (optional)</label>
                <input
                  type="password"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStaff}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStaff && (
        <StaffDetailModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}
