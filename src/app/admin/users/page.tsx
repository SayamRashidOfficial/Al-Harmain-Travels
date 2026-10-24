'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Profile, Driver, Vehicle, UserRole, UserStatus } from '@/types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Car,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  Search,
  X,
  Plus,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Key,
  Filter,
  Calendar,
  Lock,
  ArrowUpDown,
  CarFront,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Info,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeletonRows, StatCardSkeleton } from '@/components/ui/DataStateSkeletons';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
} from '@/components/admin/AdminUIComponents';

// Helper: Normalize phone numbers for duplicate checking
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

// Helper: RFC-compliant email validator
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

// Helper: Format registration date
function formatRegistrationDate(dateStr?: string | null): { date: string; time: string; relative: string } {
  if (!dateStr) return { date: 'N/A', time: '', relative: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: 'N/A', time: '', relative: '' };

    const dateFormatted = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Simple relative calculation
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let relative = '';
    if (diffDays === 0) {
      relative = 'Today';
    } else if (diffDays === 1) {
      relative = 'Yesterday';
    } else if (diffDays < 30) {
      relative = `${diffDays}d ago`;
    } else {
      const diffMonths = Math.floor(diffDays / 30);
      relative = `${diffMonths}mo ago`;
    }

    return { date: dateFormatted, time: timeFormatted, relative };
  } catch {
    return { date: 'N/A', time: '', relative: '' };
  }
}

export default function AdminUsersPage() {
  const {
    usersList,
    drivers,
    vehicles,
    rateVehicles,
    ratings,
    bookings,
    adminCreateUser,
    adminUpdateUser,
    adminAssignVehicle,
    toggleUserStatus,
    deleteUser,
    isDataLoading,
    refreshData,
    currentUser,
  } = useApp();

  // Filters & State
  const [activeRoleTab, setActiveRoleTab] = useState<'all' | 'customer' | 'dispatcher' | 'driver' | 'admin'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'deactivated'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'role'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active user selections for modals
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Add User Form State
  const [addRole, setAddRole] = useState<UserRole>('dispatcher');
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('AlHarmain@2026');
  const [addEmailVerified, setAddEmailVerified] = useState(true);
  const [addStatus, setAddStatus] = useState<UserStatus>('active');
  const [addLicenseNumber, setAddLicenseNumber] = useState('');
  const [addNationalId, setAddNationalId] = useState('');
  const [addAssignedVehicleId, setAddAssignedVehicleId] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; name: string; role: string } | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editEmailVerified, setEditEmailVerified] = useState(true);
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editAssignedVehicleId, setEditAssignedVehicleId] = useState<string>('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Vehicle Assign Modal State
  const [vehicleModalDriver, setVehicleModalDriver] = useState<Driver | null>(null);
  const [vehicleModalSelectedId, setVehicleModalSelectedId] = useState<string>('');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);

  // Delete modal state
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy state
  const [hasCopiedCredentials, setHasCopiedCredentials] = useState(false);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('User and driver records refreshed');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Dynamically load active vehicles from Rates module ONLY (deduplicated & active)
  const activeRateVehicles = useMemo(() => {
    if (!rateVehicles || !Array.isArray(rateVehicles)) return [];
    const seen = new Set<string>();
    return rateVehicles
      .filter((v) => {
        if (!v || !v.id || !v.name || !v.is_active) return false;
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      })
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [rateVehicles]);

  // Helper to map driver and assigned vehicle for any user
  const getUserDriver = (userId: string): Driver | undefined => {
    return drivers.find((d) => d.id === userId || d.profile?.id === userId);
  };

  const getDriverVehicle = (driver?: Driver): {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    vehicle_type?: string;
    seating_capacity?: number;
    luggage_capacity?: number;
    is_rate_vehicle?: boolean;
    is_active?: boolean;
  } | null => {
    if (!driver || !driver.assigned_vehicle_id) return null;

    // 1. Resolve from Rates module vehicles
    const rateVeh = rateVehicles.find(
      (rv) => rv.id === driver.assigned_vehicle_id || rv.category === driver.assigned_vehicle_id
    );
    if (rateVeh) {
      return {
        id: rateVeh.id,
        plate_number: rateVeh.category.toUpperCase(),
        make: rateVeh.name,
        model: `(${rateVeh.seating_capacity} Seats)`,
        vehicle_type: rateVeh.category,
        seating_capacity: rateVeh.seating_capacity,
        luggage_capacity: rateVeh.luggage_capacity,
        is_rate_vehicle: true,
        is_active: rateVeh.is_active,
      };
    }

    // 2. Fallback to legacy vehicles if previously assigned
    const legacyVeh = vehicles.find((v) => v.id === driver.assigned_vehicle_id) || driver.assigned_vehicle;
    if (legacyVeh) {
      return {
        id: legacyVeh.id,
        plate_number: legacyVeh.plate_number || 'LEGACY',
        make: legacyVeh.make || 'Vehicle',
        model: legacyVeh.model || '',
        vehicle_type: legacyVeh.vehicle_type,
        seating_capacity: legacyVeh.seating_capacity,
        is_rate_vehicle: false,
        is_active: legacyVeh.status === 'available' || legacyVeh.status === 'assigned',
      };
    }

    return null;
  };

  // Find vehicle currently assigned to a driver
  const getVehicleAssignedDriver = (vehicleId: string): Driver | undefined => {
    return drivers.find((d) => d.assigned_vehicle_id === vehicleId);
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = usersList.length;
    const customers = usersList.filter((u) => u.role === 'customer').length;
    const dispatchers = usersList.filter((u) => u.role === 'dispatcher').length;
    const driverProfiles = usersList.filter((u) => u.role === 'driver').length;
    const admins = usersList.filter((u) => u.role === 'admin').length;
    const active = usersList.filter((u) => u.status === 'active').length;
    const verified = usersList.filter((u) => u.email_verified).length;
    const driversWithCars = drivers.filter((d) => Boolean(d.assigned_vehicle_id)).length;
    // Available active vehicles strictly from Rates module
    const availableVehiclesCount = activeRateVehicles.filter(
      (v) => !drivers.some((d) => d.assigned_vehicle_id === v.id)
    ).length;

    return {
      total,
      customers,
      dispatchers,
      driverProfiles,
      admins,
      active,
      verified,
      driversWithCars,
      availableVehiclesCount,
    };
  }, [usersList, drivers, activeRateVehicles]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList
      .filter((u) => {
        // Role tab filter
        if (activeRoleTab !== 'all' && u.role !== activeRoleTab) return false;

        // Status filter
        if (statusFilter !== 'all' && u.status !== statusFilter) return false;

        // Email Verification filter
        if (verificationFilter === 'verified' && !u.email_verified) return false;
        if (verificationFilter === 'unverified' && u.email_verified) return false;

        // Vehicle assignment filter (for drivers or all)
        if (vehicleFilter !== 'all') {
          const d = getUserDriver(u.id);
          const hasVehicle = Boolean(d?.assigned_vehicle_id);
          if (vehicleFilter === 'assigned' && (!d || !hasVehicle)) return false;
          if (vehicleFilter === 'unassigned' && d && hasVehicle) return false;
        }

        // Live Search query
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const d = getUserDriver(u.id);
          const veh = getDriverVehicle(d);

          const matchesName = u.full_name?.toLowerCase().includes(q);
          const matchesEmail = u.email?.toLowerCase().includes(q);
          const matchesPhone = u.phone?.includes(q);
          const matchesId = u.id?.toLowerCase().includes(q);
          const matchesLicense = d?.license_number?.toLowerCase().includes(q);
          const matchesPlate = veh?.plate_number?.toLowerCase().includes(q);
          const matchesModel = `${veh?.make} ${veh?.model}`.toLowerCase().includes(q);

          return (
            matchesName ||
            matchesEmail ||
            matchesPhone ||
            matchesId ||
            matchesLicense ||
            matchesPlate ||
            matchesModel
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
        if (sortBy === 'role') return a.role.localeCompare(b.role);
        if (sortBy === 'oldest') {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        // Default newest
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [usersList, activeRoleTab, statusFilter, verificationFilter, vehicleFilter, search, sortBy, drivers, vehicles, rateVehicles]);

  // Duplicate checks in real time for Add User
  const addEmailDuplicateWarning = useMemo(() => {
    if (!addEmail.trim()) return null;
    const match = usersList.find((u) => u.email?.toLowerCase() === addEmail.trim().toLowerCase());
    return match ? `Email is already assigned to "${match.full_name}" (${match.role}). Duplicate emails are prohibited.` : null;
  }, [addEmail, usersList]);

  const addPhoneDuplicateWarning = useMemo(() => {
    if (!addPhone.trim()) return null;
    const clean = normalizePhone(addPhone);
    const match = usersList.find((u) => u.phone && normalizePhone(u.phone) === clean);
    return match ? `Phone number is already assigned to "${match.full_name}". Duplicate phones are prohibited.` : null;
  }, [addPhone, usersList]);

  const addLicenseDuplicateWarning = useMemo(() => {
    if (addRole !== 'driver' || !addLicenseNumber.trim()) return null;
    const clean = addLicenseNumber.trim().toLowerCase();
    const match = drivers.find((d) => d.license_number?.toLowerCase() === clean);
    return match ? `Commercial license "${addLicenseNumber}" is already registered in the fleet.` : null;
  }, [addRole, addLicenseNumber, drivers]);

  // Duplicate checks in real time for Edit User
  const editEmailDuplicateWarning = useMemo(() => {
    if (!selectedUser || !editEmail.trim()) return null;
    const match = usersList.find(
      (u) => u.id !== selectedUser.id && u.email?.toLowerCase() === editEmail.trim().toLowerCase()
    );
    return match ? `Email is already assigned to "${match.full_name}". Duplicate emails are prohibited.` : null;
  }, [selectedUser, editEmail, usersList]);

  const editPhoneDuplicateWarning = useMemo(() => {
    if (!selectedUser || !editPhone.trim()) return null;
    const clean = normalizePhone(editPhone);
    const match = usersList.find((u) => u.id !== selectedUser.id && u.phone && normalizePhone(u.phone) === clean);
    return match ? `Phone number is already assigned to "${match.full_name}". Duplicate phones are prohibited.` : null;
  }, [selectedUser, editPhone, usersList]);

  const editLicenseDuplicateWarning = useMemo(() => {
    if (!selectedUser || editRole !== 'driver' || !editLicenseNumber.trim()) return null;
    const clean = editLicenseNumber.trim().toLowerCase();
    const match = drivers.find(
      (d) => d.id !== selectedUser.id && d.profile?.id !== selectedUser.id && d.license_number?.toLowerCase() === clean
    );
    return match ? `Commercial license "${editLicenseNumber}" is already assigned to another driver.` : null;
  }, [selectedUser, editRole, editLicenseNumber, drivers]);

  // Open Edit Modal
  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    const driver = getUserDriver(user.id);
    setSelectedDriver(driver || null);

    setEditFullName(user.full_name);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditEmailVerified(Boolean(user.email_verified));
    setEditLicenseNumber(driver?.license_number || '');
    setEditNationalId(driver?.national_id || '');
    setEditAssignedVehicleId(driver?.assigned_vehicle_id || '');
    setEditNewPassword('');

    setIsEditModalOpen(true);
  };

  // Open Vehicle Assignment Modal
  const openVehicleModal = (user: Profile) => {
    const driver = getUserDriver(user.id);
    if (!driver) {
      toast.error('Driver record not found for this user.');
      return;
    }
    setVehicleModalDriver(driver);
    setVehicleModalSelectedId(driver.assigned_vehicle_id || '');
    setIsVehicleModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (user: Profile) => {
    setSelectedUser(user);
    const driver = getUserDriver(user.id);
    setSelectedDriver(driver || null);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (user: Profile) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Handle Create User Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addFullName.trim() || addFullName.trim().length < 2) {
      toast.error('Full legal name is required (minimum 2 characters).');
      return;
    }

    if (!addEmail.trim() || !isValidEmail(addEmail)) {
      toast.error('Please enter a valid RFC-compliant email address.');
      return;
    }

    if (!addPhone.trim() || addPhone.trim().length < 7) {
      toast.error('Valid contact phone number is required (minimum 7 digits).');
      return;
    }

    if (addEmailDuplicateWarning) {
      toast.error(addEmailDuplicateWarning);
      return;
    }

    if (addPhoneDuplicateWarning) {
      toast.error(addPhoneDuplicateWarning);
      return;
    }

    if (addRole === 'driver') {
      if (!addLicenseNumber.trim()) {
        toast.error('Commercial driving license number is required for fleet drivers.');
        return;
      }
      if (addLicenseDuplicateWarning) {
        toast.error(addLicenseDuplicateWarning);
        return;
      }
    }

    setIsSubmittingAdd(true);

    try {
      const res = await adminCreateUser({
        role: addRole,
        full_name: addFullName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
        password: addPassword.trim() || undefined,
        email_verified: addEmailVerified,
        status: addStatus,
        license_number: addRole === 'driver' ? addLicenseNumber.trim() : undefined,
        national_id: addRole === 'driver' ? addNationalId.trim() || undefined : undefined,
        assigned_vehicle_id: addRole === 'driver' && addAssignedVehicleId ? addAssignedVehicleId : undefined,
      });

      if (res.success && res.user) {
        setCreatedCredentials({
          email: addEmail.trim(),
          pass: res.generatedPassword || addPassword.trim(),
          name: addFullName.trim(),
          role: addRole,
        });

        // Reset inputs
        setAddFullName('');
        setAddEmail('');
        setAddPhone('');
        setAddLicenseNumber('');
        setAddNationalId('');
        setAddAssignedVehicleId('');
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Edit User Submit
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!editFullName.trim() || editFullName.trim().length < 2) {
      toast.error('Full legal name is required.');
      return;
    }

    if (!editEmail.trim() || !isValidEmail(editEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!editPhone.trim() || editPhone.trim().length < 7) {
      toast.error('Valid phone number is required.');
      return;
    }

    if (editEmailDuplicateWarning) {
      toast.error(editEmailDuplicateWarning);
      return;
    }

    if (editPhoneDuplicateWarning) {
      toast.error(editPhoneDuplicateWarning);
      return;
    }

    if (editRole === 'driver') {
      if (!editLicenseNumber.trim()) {
        toast.error('Driver license number cannot be blank.');
        return;
      }
      if (editLicenseDuplicateWarning) {
        toast.error(editLicenseDuplicateWarning);
        return;
      }
    }

    setIsSubmittingEdit(true);

    try {
      const res = await adminUpdateUser(selectedUser.id, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        status: editStatus,
        email_verified: editEmailVerified,
        license_number: editRole === 'driver' ? editLicenseNumber.trim() : undefined,
        national_id: editRole === 'driver' ? editNationalId.trim() : undefined,
        assigned_vehicle_id: editRole === 'driver' ? (editAssignedVehicleId || null) : undefined,
        password: editNewPassword.trim() ? editNewPassword.trim() : undefined,
      });

      if (res.success) {
        setIsEditModalOpen(false);
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Vehicle Assignment Submit
  const handleSaveVehicleAssignment = async () => {
    if (!vehicleModalDriver) return;
    setIsSubmittingVehicle(true);

    try {
      const targetVehicleId = vehicleModalSelectedId || null;
      const res = await adminAssignVehicle(vehicleModalDriver.id, targetVehicleId);
      if (res.success) {
        setIsVehicleModalOpen(false);
      }
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  // Handle Delete User Submit
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (currentUser?.id === selectedUser.id) {
      toast.error('You cannot delete your own active administrator account.');
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await deleteUser(selectedUser.id);
      if (ok) {
        setIsDeleteModalOpen(false);
        setIsDetailsModalOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Verification 1-click
  const handleToggleVerification = async (user: Profile) => {
    const newVerifiedState = !user.email_verified;
    await adminUpdateUser(user.id, { email_verified: newVerifiedState });
  };

  // Role Badge Component
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" />
            Admin
          </span>
        );
      case 'dispatcher':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300">
            <ShieldCheck className="w-3 h-3 text-sky-700" />
            Dispatcher
          </span>
        );
      case 'driver':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300">
            <Car className="w-3 h-3 text-amber-700" />
            Captain / Driver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Users className="w-3 h-3 text-emerald-700" />
            Customer / Pilgrim
          </span>
        );
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-950 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-950 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Deactivated
          </span>
        );
    }
  };

  return (
    <div className="page-shell space-y-6">
      {/* ── Top Executive Banner ────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Administration & Access Control"
        badge="v2.8 Enterprise"
        title="User & Chauffeur Directory"
        description="Manage authenticated pilgrims, onboarding staff dispatchers, and licensed VIP captains. Configure vehicle assignments, enforce identity verification, and safeguard account statuses."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh database records"
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-surface border border-base text-secondary hover:text-primary hover:bg-elevated transition-all flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Sync Data</span>
        </button>

        <button
          onClick={() => {
            setAddRole('dispatcher');
            setCreatedCredentials(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>+ Add Staff</span>
        </button>

        <button
          onClick={() => {
            setAddRole('driver');
            setCreatedCredentials(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Car className="w-4 h-4" />
          <span>+ Add Driver</span>
        </button>

        <button
          onClick={() => {
            setAddRole('customer');
            setCreatedCredentials(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add User</span>
        </button>
      </AdminPageHeader>

      {/* ── Summary KPI Metric Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <AdminStatCard
          title="Total Directory"
          value={metrics.total}
          subtitle={`${metrics.active} active accounts`}
          icon={<Users className="w-4.5 h-4.5" />}
          tone="neutral"
        />

        <AdminStatCard
          title="Pilgrims / Customers"
          value={metrics.customers}
          subtitle="Registered bookers"
          icon={<Users className="w-4.5 h-4.5" />}
          tone="green"
        />

        <AdminStatCard
          title="Dispatch Officers"
          value={metrics.dispatchers}
          subtitle="Active control desk"
          icon={<ShieldCheck className="w-4.5 h-4.5" />}
          tone="blue"
        />

        <AdminStatCard
          title="Fleet Chauffeurs"
          value={metrics.driverProfiles}
          subtitle={`${metrics.driversWithCars} allocated cars`}
          icon={<Car className="w-4.5 h-4.5" />}
          tone="amber"
        />

        <AdminStatCard
          title="Email Verified"
          value={metrics.verified}
          subtitle={`${metrics.total > 0 ? Math.round((metrics.verified / metrics.total) * 100) : 0}% verification`}
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          tone="green"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────────────── */}
      <div className="bg-card border border-base p-4 rounded-3xl shadow-lg space-y-4">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-base pb-3">
          <button
            onClick={() => setActiveRoleTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            All Accounts ({usersList.length})
          </button>
          <button
            onClick={() => setActiveRoleTab('customer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'customer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            Customers ({metrics.customers})
          </button>
          <button
            onClick={() => setActiveRoleTab('dispatcher')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'dispatcher'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            Staff / Dispatchers ({metrics.dispatchers})
          </button>
          <button
            onClick={() => setActiveRoleTab('driver')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'driver'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            Fleet Drivers ({metrics.driverProfiles})
          </button>
          <button
            onClick={() => setActiveRoleTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'admin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            Administrators ({metrics.admins})
          </button>
        </div>

        {/* Search & Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Live Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, plate, license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input border border-base rounded-xl pl-10 pr-8 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>

          {/* Verification Filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as any)}
              className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Email Verifications</option>
              <option value="verified">Verified Only (✓)</option>
              <option value="unverified">Unverified Only (⚠️)</option>
            </select>
          </div>

          {/* Vehicle Assignment Filter (or Sort) */}
          {activeRoleTab === 'driver' || activeRoleTab === 'all' ? (
            <div>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value as any)}
                className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Vehicle States</option>
                <option value="assigned">Vehicle Assigned</option>
                <option value="unassigned">No Car Assigned</option>
              </select>
            </div>
          ) : (
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="name">Sort: Name (A - Z)</option>
                <option value="role">Sort: Role</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Users Data Table ────────────────────────────────────────────── */}
      <div className="bg-card border border-base rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-secondary">
            <thead className="bg-surface/80 text-muted uppercase font-bold text-[10px] tracking-wider border-b border-base">
              <tr>
                <th className="p-4">User Identity</th>
                <th className="p-4">Email &amp; Verification</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Vehicle</th>
                <th className="p-4">Status</th>
                <th className="p-4">Registration</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {isDataLoading ? (
                <TableSkeletonRows rows={6} cols={8} />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-muted/50" />
                      <p className="text-sm font-semibold text-primary">No matching users found</p>
                      <p className="text-xs text-muted max-w-sm">
                        Adjust your search filters or click "+ Add User" to register a new account.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const driver = getUserDriver(u.id);
                  const assignedVehicle = getDriverVehicle(driver);
                  const regDetails = formatRegistrationDate(u.created_at);
                  const isCurrentAccount = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-surface/50 transition-colors group">
                      {/* 1. User Identity */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-surface border border-base flex items-center justify-center text-sm font-black text-amber-950 shadow-sm shrink-0">
                            {u.full_name?.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-primary truncate">{u.full_name}</span>
                              {isCurrentAccount && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 font-extrabold border border-amber-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted font-mono truncate max-w-[140px]" title={u.id}>
                              ID: {u.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email Address & Verification */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-primary font-medium flex items-center gap-1.5">
                            <span className="truncate max-w-[190px]" title={u.email || ''}>
                              {u.email || <span className="text-muted italic">No email</span>}
                            </span>
                          </div>
                          <div>
                            {u.email_verified ? (
                              <button
                                onClick={() => handleToggleVerification(u)}
                                title="Click to toggle email verification"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleVerification(u)}
                                title="Click to mark email as verified"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition-colors"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Unverified</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Phone Number */}
                      <td className="p-4">
                        <div className="font-mono text-amber-950 font-bold text-xs flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted shrink-0" />
                          <span>{u.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* 4. Role */}
                      <td className="p-4">{renderRoleBadge(u.role)}</td>

                      {/* 5. Assigned Vehicle (Specially for drivers) */}
                      <td className="p-4">
                        {u.role === 'driver' ? (
                          assignedVehicle ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-[10px] text-primary px-1.5 py-0.5 rounded bg-surface border border-base">
                                  {assignedVehicle.plate_number}
                                </span>
                                <span className="text-xs font-semibold text-primary truncate max-w-[150px]" title={assignedVehicle.make}>
                                  {assignedVehicle.make}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                <span>{assignedVehicle.seating_capacity || 4} Seats</span>
                                {assignedVehicle.is_rate_vehicle && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[9px]">
                                    Rates Master
                                  </span>
                                )}
                                {assignedVehicle.is_active === false && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[9px]">
                                    Inactive in Rates
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => openVehicleModal(u)}
                                className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <CarFront className="w-3 h-3" />
                                <span>Change Vehicle</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                Unassigned
                              </span>
                              <div>
                                <button
                                  onClick={() => openVehicleModal(u)}
                                  className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Assign Vehicle</span>
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {renderStatusBadge(u.status)}
                          <div>
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className="text-[10px] font-semibold text-muted hover:text-primary underline"
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 7. Registration Details */}
                      <td className="p-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-primary font-medium">{regDetails.date}</div>
                          <div className="text-muted flex items-center gap-1 text-[10px]">
                            <Calendar className="w-3 h-3 text-muted shrink-0" />
                            <span>{regDetails.relative || regDetails.time}</span>
                          </div>
                        </div>
                      </td>

                      {/* 8. Actions: View → Edit → Delete → More */}
                      <td className="p-4 text-center">
                        <AdminActionGroup>
                          <AdminActionButton
                            variant="view"
                            tooltip="Inspect complete user dossier"
                            onClick={() => openDetailsModal(u)}
                          />
                          <AdminActionButton
                            variant="edit"
                            tooltip="Edit user profile & permissions"
                            onClick={() => openEditModal(u)}
                          />
                          <AdminActionButton
                            variant="delete"
                            disabled={isCurrentAccount}
                            tooltip={isCurrentAccount ? 'Cannot delete active session account' : 'Delete user profile'}
                            onClick={() => openDeleteModal(u)}
                          />
                          {u.role === 'driver' && (
                            <AdminActionButton
                              variant="more"
                              icon={<Car className="w-4 h-4" />}
                              tooltip="Assign or change fleet vehicle"
                              onClick={() => openVehicleModal(u)}
                            />
                          )}
                        </AdminActionGroup>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-base bg-surface/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <div>
            Showing <span className="font-bold text-primary">{filteredUsers.length}</span> of{' '}
            <span className="font-bold text-primary">{usersList.length}</span> total registered accounts
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active ({metrics.active})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Drivers ({metrics.driverProfiles})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Staff ({metrics.dispatchers})
            </span>
          </div>
        </div>
      </div>

      {/* ── Modal: Add New User ────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">Onboard New Account</h3>
                  <p className="text-xs text-muted">Register verified drivers, staff dispatchers, or customers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Created Credentials Success Callout */}
            {createdCredentials ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Account Successfully Created in Supabase!</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  The account for <strong>{createdCredentials.name}</strong> ({createdCredentials.role.toUpperCase()}) is active and email verified. Provide these login credentials to the user:
                </p>

                <div className="bg-surface/90 border border-base p-3 rounded-xl font-mono text-xs space-y-1.5 select-all">
                  <div>
                    <span className="text-muted">Email:</span>{' '}
                    <span className="text-primary font-bold">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-muted">Password:</span>{' '}
                    <span className="text-amber-500 font-bold">{createdCredentials.pass}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Al Harmain Portal Login:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`
                      );
                      setHasCopiedCredentials(true);
                      setTimeout(() => setHasCopiedCredentials(false), 2000);
                      toast.success('Credentials copied to clipboard');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface border border-base text-secondary hover:text-primary flex items-center gap-1.5"
                  >
                    {hasCopiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCredentials ? 'Copied!' : 'Copy Credentials'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsAddModalOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Role Selector Tabs */}
                <div>
                  <label className="type-label block mb-1.5">Select Account Role *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['driver', 'dispatcher', 'customer', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAddRole(r)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center capitalize ${
                          addRole === r
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-input text-secondary border-base hover:text-primary'
                        }`}
                      >
                        {r === 'dispatcher' ? 'Staff' : r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Legal Name */}
                <div>
                  <label className="type-label block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Captain Tariq Al-Mansoor"
                    value={addFullName}
                    onChange={(e) => setAddFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                {/* Email Address & Duplicate Warning */}
                <div>
                  <label className="type-label block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@alharmaintravel.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-input border text-primary placeholder:text-muted focus:outline-none text-xs ${
                      addEmailDuplicateWarning ? 'border-rose-500 focus:border-rose-500' : 'border-base focus:border-emerald-500'
                    }`}
                  />
                  {addEmailDuplicateWarning && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {addEmailDuplicateWarning}
                    </p>
                  )}
                </div>

                {/* Phone Number & Duplicate Warning */}
                <div>
                  <label className="type-label block mb-1">Phone Number (with Country Code) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+966 5X XXX XXXX"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-input border text-primary placeholder:text-muted focus:outline-none text-xs font-mono ${
                      addPhoneDuplicateWarning ? 'border-rose-500 focus:border-rose-500' : 'border-base focus:border-emerald-500'
                    }`}
                  />
                  {addPhoneDuplicateWarning && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {addPhoneDuplicateWarning}
                    </p>
                  )}
                </div>

                {/* Driver Specific Fields */}
                {addRole === 'driver' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <Car className="w-4 h-4" />
                      <span>Chauffeur &amp; Vehicle Allocation</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="type-label block mb-1">Driving License Number *</label>
                        <input
                          type="text"
                          required={addRole === 'driver'}
                          placeholder="SA-DL-XXXXXX"
                          value={addLicenseNumber}
                          onChange={(e) => setAddLicenseNumber(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl bg-input border text-primary placeholder:text-muted focus:outline-none text-xs font-mono ${
                            addLicenseDuplicateWarning ? 'border-rose-500' : 'border-base focus:border-emerald-500'
                          }`}
                        />
                        {addLicenseDuplicateWarning && (
                          <p className="mt-1 text-[10px] text-rose-500">{addLicenseDuplicateWarning}</p>
                        )}
                      </div>

                      <div>
                        <label className="type-label block mb-1">National ID / Iqama (Optional)</label>
                        <input
                          type="text"
                          placeholder="10XXXXXXXX"
                          value={addNationalId}
                          onChange={(e) => setAddNationalId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Initial Vehicle Assignment from Rates Module */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="type-label">Assign Vehicle from Rates</label>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {activeRateVehicles.length} active in Rates
                        </span>
                      </div>
                      <select
                        value={addAssignedVehicleId}
                        onChange={(e) => setAddAssignedVehicleId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        <option value="">No vehicle assigned yet</option>
                        {activeRateVehicles.map((v) => {
                          const assignedDrv = getVehicleAssignedDriver(v.id);
                          const isAssigned = Boolean(assignedDrv);
                          return (
                            <option
                              key={v.id}
                              value={v.id}
                              disabled={isAssigned}
                            >
                              {v.name} ({v.category.toUpperCase()}) — {v.seating_capacity} Seats
                              {isAssigned
                                ? ` [Assigned to: ${assignedDrv?.profile?.full_name || 'Captain'}]`
                                : ' [Available in Rates]'}
                            </option>
                          );
                        })}
                      </select>
                      <p className="mt-1 text-[10px] text-muted flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Loaded dynamically from Rates. Only active rates vehicles appear here.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Password and Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="type-label block mb-1">Initial Password</label>
                    <input
                      type="text"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="Enter or leave default"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end space-y-2">
                    <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addEmailVerified}
                        onChange={(e) => setAddEmailVerified(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-base"
                      />
                      <span>Mark email as pre-verified</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addStatus === 'active'}
                        onChange={(e) => setAddStatus(e.target.checked ? 'active' : 'suspended')}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-base"
                      />
                      <span>Account active immediately</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-base">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd || Boolean(addEmailDuplicateWarning) || Boolean(addPhoneDuplicateWarning) || Boolean(addLicenseDuplicateWarning)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSubmittingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Account</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Edit User ──────────────────────────────────────────── */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">Edit User Profile</h3>
                  <p className="text-xs text-muted font-mono">{selectedUser.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="type-label block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-input border text-primary focus:outline-none text-xs ${
                      editEmailDuplicateWarning ? 'border-rose-500' : 'border-base focus:border-emerald-500'
                    }`}
                  />
                  {editEmailDuplicateWarning && (
                    <p className="mt-1 text-[10px] text-rose-500">{editEmailDuplicateWarning}</p>
                  )}
                </div>

                <div>
                  <label className="type-label block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-input border text-primary font-mono focus:outline-none text-xs ${
                      editPhoneDuplicateWarning ? 'border-rose-500' : 'border-base focus:border-emerald-500'
                    }`}
                  />
                  {editPhoneDuplicateWarning && (
                    <p className="mt-1 text-[10px] text-rose-500">{editPhoneDuplicateWarning}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1">System Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs capitalize"
                  >
                    <option value="customer">Customer / Pilgrim</option>
                    <option value="dispatcher">Dispatcher / Staff</option>
                    <option value="driver">Fleet Driver</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="type-label block mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              {/* Driver Details if role === driver */}
              {editRole === 'driver' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    <span>Captain License &amp; Vehicle Allocation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="type-label block mb-1">Commercial License #</label>
                      <input
                        type="text"
                        value={editLicenseNumber}
                        onChange={(e) => setEditLicenseNumber(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-input border text-primary font-mono text-xs focus:outline-none ${
                          editLicenseDuplicateWarning ? 'border-rose-500' : 'border-base focus:border-emerald-500'
                        }`}
                      />
                      {editLicenseDuplicateWarning && (
                        <p className="mt-1 text-[10px] text-rose-500">{editLicenseDuplicateWarning}</p>
                      )}
                    </div>

                    <div>
                      <label className="type-label block mb-1">National ID / Iqama</label>
                      <input
                        type="text"
                        value={editNationalId}
                        onChange={(e) => setEditNationalId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="type-label">Assigned Vehicle from Rates</label>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {activeRateVehicles.length} active in Rates
                      </span>
                    </div>
                    <select
                      value={editAssignedVehicleId}
                      onChange={(e) => setEditAssignedVehicleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="">None / Unassigned (Release Vehicle)</option>
                      {activeRateVehicles.map((v) => {
                        const isCurrentlyAssignedToThisDriver =
                          selectedDriver?.assigned_vehicle_id === v.id || editAssignedVehicleId === v.id;
                        const otherDriver = getVehicleAssignedDriver(v.id);
                        const isAssignedToOther =
                          Boolean(otherDriver) &&
                          otherDriver?.id !== selectedUser?.id &&
                          otherDriver?.profile?.id !== selectedUser?.id;

                        return (
                          <option
                            key={v.id}
                            value={v.id}
                            disabled={isAssignedToOther}
                          >
                            {v.name} ({v.category.toUpperCase()}) — {v.seating_capacity} Seats
                            {isCurrentlyAssignedToThisDriver
                              ? ' [CURRENTLY ASSIGNED]'
                              : isAssignedToOther
                              ? ` [Assigned to: ${otherDriver?.profile?.full_name || 'Another Captain'}]`
                              : ' [Available in Rates]'}
                          </option>
                        );
                      })}
                    </select>
                    <p className="mt-1 text-[10px] text-muted flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Loaded dynamically from Rates Master. Deactivated or removed rate vehicles cannot be assigned.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Password update (optional) */}
              <div>
                <label className="type-label block mb-1">Reset Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-input border border-base text-primary font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Email Verified Toggle */}
              <div>
                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEmailVerified}
                    onChange={(e) => setEditEmailVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-base"
                  />
                  <span>Email address verified</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || Boolean(editEmailDuplicateWarning) || Boolean(editPhoneDuplicateWarning) || Boolean(editLicenseDuplicateWarning)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Quick Vehicle Assignment ────────────────────────────── */}
      {isVehicleModalOpen && vehicleModalDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">Assign Fleet Vehicle</h3>
                  <p className="text-xs text-muted">
                    Captain: <strong>{vehicleModalDriver.profile?.full_name || 'Driver'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-secondary leading-relaxed">
                Select an available vehicle from the fleet to assign to this captain. Only 1 driver can be assigned to an active vehicle at any time.
              </p>

              {/* Option to Unassign */}
              <div
                onClick={() => setVehicleModalSelectedId('')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  vehicleModalSelectedId === ''
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                    : 'bg-input border-base text-secondary hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <XCircle className="w-4 h-4" />
                  <span>No Vehicle / Release Current Assignment</span>
                </div>
                {vehicleModalSelectedId === '' && <Check className="w-4 h-4 text-rose-500" />}
              </div>

              {/* Rates Module Vehicles List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeRateVehicles.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-surface/50 border border-dashed border-base text-center space-y-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                    <p className="text-xs font-semibold text-primary">No active vehicles found in Rates module</p>
                    <p className="text-[11px] text-muted">
                      Please add or activate vehicles in Rates Management to assign them to captains.
                    </p>
                    <a
                      href="/admin/rates"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline mt-2"
                    >
                      <span>Open Rates Management</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  activeRateVehicles.map((v) => {
                    const assignedToThis = vehicleModalDriver.assigned_vehicle_id === v.id;
                    const otherDriver = getVehicleAssignedDriver(v.id);
                    const isAssignedToOther = Boolean(otherDriver) && otherDriver?.id !== vehicleModalDriver.id;
                    const isSelectable = !isAssignedToOther;
                    const isSelected = vehicleModalSelectedId === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (isSelectable) setVehicleModalSelectedId(v.id);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                            : isSelectable
                            ? 'bg-input border-base hover:border-emerald-500/40 cursor-pointer'
                            : 'bg-surface/40 border-base/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-primary px-1.5 py-0.5 rounded bg-surface border border-base">
                              {v.category.toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {v.name}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Rates Master
                            </span>
                          </div>
                          <div className="text-[11px] text-muted flex items-center gap-2 flex-wrap">
                            <span>Capacity: {v.seating_capacity} seats</span>
                            <span>•</span>
                            <span>Luggage: {v.luggage_capacity || 0} bags</span>
                            {v.description && (
                              <>
                                <span>•</span>
                                <span className="italic truncate max-w-[180px]">{v.description}</span>
                              </>
                            )}
                            {isAssignedToOther && (
                              <span className="text-amber-500 font-semibold ml-1">
                                (Assigned to: {otherDriver?.profile?.full_name || 'Another Captain'})
                              </span>
                            )}
                            {assignedToThis && (
                              <span className="text-emerald-500 font-bold ml-1">
                                (Currently Assigned to this Captain)
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : isSelectable ? (
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface border border-base text-secondary hover:text-primary"
                            >
                              Select
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted font-mono uppercase">Assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-base">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingVehicle}
                onClick={handleSaveVehicleAssignment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmittingVehicle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: User Profile Inspection ────────────────────────────── */}
      {isDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/30">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">User Dossier</h3>
                  <p className="text-xs text-muted">Complete identity and access metadata</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-surface/60 border border-base flex items-center gap-4">
                {selectedUser.avatar_url || selectedDriver?.avatar_url || selectedDriver?.profile?.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url || selectedDriver?.avatar_url || selectedDriver?.profile?.avatar_url || ''}
                    alt={selectedUser.full_name}
                    className="w-14 h-14 rounded-2xl object-cover border border-base shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-surface border border-base flex items-center justify-center text-xl font-black text-amber-500 shadow-sm shrink-0">
                    {selectedUser.full_name?.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-primary truncate">{selectedUser.full_name}</h4>
                    {renderRoleBadge(selectedUser.role)}
                    {renderStatusBadge(selectedUser.status)}
                  </div>
                  <p className="text-xs text-muted font-mono truncate" title={selectedUser.id}>
                    UUID: {selectedUser.id}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-input border border-base">
                  <span className="text-muted flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">{selectedUser.email || 'None'}</span>
                    {selectedUser.email_verified ? (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 mx-auto" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-input border border-base">
                  <span className="text-muted flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number:
                  </span>
                  <span className="text-primary font-mono font-bold">{selectedUser.phone || 'None'}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-input border border-base">
                  <span className="text-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date Registered:
                  </span>
                  <span className="text-primary font-medium">
                    {formatRegistrationDate(selectedUser.created_at).date} ({formatRegistrationDate(selectedUser.created_at).time})
                  </span>
                </div>
              </div>

              {/* Driver Specific Dossier */}
              {selectedUser.role === 'driver' && selectedDriver && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    <span>Captain Credentials &amp; Vehicle</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-surface border border-base">
                      <div className="text-[10px] text-muted">License Number</div>
                      <div className="font-mono font-bold text-primary mt-0.5">
                        {selectedDriver.license_number || 'DL-PENDING'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface border border-base">
                      <div className="text-[10px] text-muted">National / Iqama ID</div>
                      <div className="font-mono font-bold text-primary mt-0.5">
                        {selectedDriver.national_id || 'N/A'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface border border-base">
                      <div className="text-[10px] text-muted">Rating / Completed</div>
                      <div className="font-mono font-bold text-amber-500 mt-0.5">
                        ★ {selectedDriver.rating !== null && selectedDriver.rating !== undefined ? Number(selectedDriver.rating).toFixed(1) : 'New'} ({ratings.filter((r) => r.driver_id === selectedDriver.id).length} reviews • {selectedDriver.total_rides || 0} rides)
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface border border-base">
                      <div className="text-[10px] text-muted">Assigned Vehicle</div>
                      <div className="font-bold text-xs text-primary mt-0.5 truncate" title={getDriverVehicle(selectedDriver)?.make}>
                        {getDriverVehicle(selectedDriver)?.make || 'None / Unassigned'}
                      </div>
                      {getDriverVehicle(selectedDriver) && (
                        <div className="text-[9px] text-muted mt-0.5 font-mono">
                          Code: {getDriverVehicle(selectedDriver)?.plate_number} • {getDriverVehicle(selectedDriver)?.seating_capacity} Seats
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Passenger Ratings & Reviews Breakdown */}
                  {(() => {
                    const driverReviews = ratings.filter((r) => r.driver_id === selectedDriver.id);
                    return (
                      <div className="pt-2 border-t border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                          <span className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>Passenger Reviews &amp; Ratings</span>
                          </span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-mono">
                            {driverReviews.length} {driverReviews.length === 1 ? 'review' : 'reviews'}
                          </span>
                        </div>

                        {driverReviews.length === 0 ? (
                          <div className="p-3 rounded-xl bg-surface/60 border border-base text-center text-xs text-muted">
                            No passenger reviews recorded for this driver yet.
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {driverReviews.map((rev) => {
                              const b = bookings.find((bk) => bk.id === rev.booking_id);
                              const passengerName =
                                rev.booking?.passenger_name ||
                                b?.passenger_name ||
                                rev.customer?.full_name ||
                                'Verified Passenger';

                              return (
                                <div
                                  key={rev.id}
                                  className="p-2.5 rounded-xl bg-surface border border-base space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-primary">{passengerName}</span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3 h-3 ${
                                            s <= rev.rating
                                              ? 'text-amber-500 fill-amber-500'
                                              : 'text-slate-300'
                                          }`}
                                        />
                                      ))}
                                      <span className="font-bold text-amber-500 text-[11px] ml-0.5">
                                        {rev.rating}.0
                                      </span>
                                    </div>
                                  </div>

                                  {(b || rev.booking) && (
                                    <div className="text-[10px] text-muted flex items-center justify-between">
                                      <span className="font-mono text-amber-700">
                                        {b?.booking_reference || (rev.booking as any)?.booking_reference}
                                      </span>
                                      <span>
                                        {new Date(rev.created_at).toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  )}

                                  {rev.feedback && (
                                    <p className="text-[11px] text-primary italic bg-input/40 p-1.5 rounded-lg border border-base">
                                      &ldquo;{rev.feedback}&rdquo;
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-base">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openDeleteModal(selectedUser);
                }}
                disabled={currentUser?.id === selectedUser.id}
                className="text-xs font-semibold text-rose-500 hover:text-rose-400 disabled:opacity-30"
              >
                Delete Account
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    openEditModal(selectedUser);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-base text-primary hover:bg-elevated transition-colors"
                >
                  Edit User
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ─────────────────────────────────── */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="type-card-title text-base font-bold text-rose-500">Permanently Delete User?</h3>
              <p className="text-xs text-secondary leading-relaxed">
                You are about to delete the account for <strong>{selectedUser.full_name}</strong> (
                {selectedUser.email || selectedUser.phone}).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-base text-xs space-y-1.5 text-muted">
              <p>• Auth credentials and profile will be permanently wiped.</p>
              <p>• Any assigned vehicle will automatically be freed back to available status.</p>
              <p>• Historical trip logs and invoices will be safely decoupled with NULL references.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteUser}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all flex items-center gap-2"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
