'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Driver, Vehicle, DriverStatus, UserStatus, Booking, RatingFeedback } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { calculateDriverRating, calculateDriverCompletedRides } from '@/lib/driver-stats';
import {
  Car,
  Phone,
  Mail,
  Star,
  MapPin,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  X,
  Sparkles,
  Plus,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Upload,
  Camera,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  PhoneCall,
  Lock,
  Calendar,
  AlertCircle,
  Hash,
  Power,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardGridSkeleton, TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';

// Helper: RFC 5322 Email Validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

// Helper: Normalize phone for duplicate checking
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

// Helper: Chauffeur Avatar with resilient size enforcement and load error fallback
function ChauffeurAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = (name || 'Captain').trim().slice(0, 1).toUpperCase();

  const sizeClass = {
    sm: 'w-10 h-10 rounded-xl text-xs',
    md: 'w-14 h-14 rounded-2xl text-lg',
    lg: 'w-16 h-16 rounded-2xl text-xl',
  }[size];

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClass} bg-gradient-to-br from-emerald-600 to-teal-900 text-amber-300 font-bold flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0 select-none ${className}`}
        aria-label={name}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`${sizeClass} object-cover border-2 border-emerald-500/40 shadow-sm shrink-0 ${className}`}
    />
  );
}

export default function DispatcherDriversPage() {
  const {
    drivers,
    vehicles,
    rateVehicles,
    bookings,
    ratings,
    isDataLoading,
    refreshData,
    adminCreateUser,
    adminUpdateUser,
    adminAssignVehicle,
    toggleUserStatus,
    deleteUser,
    uploadDriverAvatar,
  } = useApp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [dutyFilter, setDutyFilter] = useState<'all' | 'available' | 'on_trip' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active modal targets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Add Form state
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('+966 5');
  const [addPassword, setAddPassword] = useState('AlHarmain@2026');
  const [addAutoPassword, setAddAutoPassword] = useState(true);
  const [addLicenseNumber, setAddLicenseNumber] = useState('');
  const [addNationalId, setAddNationalId] = useState('');
  const [addAssignedVehicleId, setAddAssignedVehicleId] = useState('');
  const [addStatus, setAddStatus] = useState<UserStatus>('active');
  const [addAvatarFile, setAddAvatarFile] = useState<File | null>(null);
  const [addAvatarPreview, setAddAvatarPreview] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
    phone: string;
  } | null>(null);
  const [hasCopiedCredentials, setHasCopiedCredentials] = useState(false);

  // Edit Form state
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editAssignedVehicleId, setEditAssignedVehicleId] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarRemoved, setEditAvatarRemoved] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Vehicle Assign Modal state
  const [vehicleModalSelectedId, setVehicleModalSelectedId] = useState('');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);

  // Delete Modal state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // File input refs
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Sync data on manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Fleet chauffeurs synchronized with Supabase.');
    } catch {
      toast.error('Failed to sync driver records.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extract clean active vehicles from Admin Rates module (rate_vehicle_types)
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

  // Helper to resolve vehicle details from vehicle ID
  const getVehicleDetails = (vehicleId?: string | null) => {
    if (!vehicleId) return null;

    // 1. Check in Admin Rates vehicles
    const rateVeh = rateVehicles.find(
      (rv) => rv.id === vehicleId || rv.category === vehicleId
    );
    if (rateVeh) {
      return {
        id: rateVeh.id,
        name: rateVeh.name,
        category: rateVeh.category,
        plate_number: rateVeh.category.toUpperCase(),
        seating_capacity: rateVeh.seating_capacity,
        luggage_capacity: rateVeh.luggage_capacity,
        is_active: rateVeh.is_active,
        is_rate_vehicle: true,
      };
    }

    // 2. Fallback to physical vehicles table
    const phys = vehicles.find((v) => v.id === vehicleId);
    if (phys) {
      return {
        id: phys.id,
        name: `${phys.make} ${phys.model}`,
        category: phys.vehicle_type,
        plate_number: phys.plate_number,
        seating_capacity: phys.seating_capacity,
        luggage_capacity: 4,
        is_active: phys.status !== 'inactive',
        is_rate_vehicle: false,
      };
    }

    return null;
  };

  // Find if a vehicle is already assigned to another driver
  const getVehicleCurrentDriver = (vehicleId: string, currentDriverId?: string) => {
    return drivers.find(
      (d) =>
        (d.assigned_vehicle_id === vehicleId ||
          d.assigned_vehicle?.id === vehicleId ||
          d.vehicle?.id === vehicleId) &&
        d.id !== currentDriverId &&
        d.profile?.status !== 'deactivated'
    );
  };

  // Helper to get driver's ratings from database
  const getDriverRatings = (driverId: string): RatingFeedback[] => {
    return ratings.filter((r) => r.driver_id === driverId);
  };

  // Helper to get driver's completed trips from bookings
  const getDriverCompletedTrips = (driverId: string): Booking[] => {
    return bookings.filter(
      (b) =>
        b.assigned_driver_id === driverId &&
        (b.status === 'trip_completed' || b.status === 'completed' || b.status === 'payment_completed' || b.status === 'ride_completed')
    );
  };

  // Helper to get driver's active in-progress trips
  const getDriverActiveTrips = (driverId: string): Booking[] => {
    return bookings.filter(
      (b) =>
        b.assigned_driver_id === driverId &&
        (b.status === 'driver_assigned' ||
          b.status === 'driver_accepted' ||
          b.status === 'accepted' ||
          b.status === 'driver_arriving' ||
          b.status === 'on_the_way' ||
          b.status === 'driver_arrived' ||
          b.status === 'arrived' ||
          b.status === 'trip_started' ||
          b.status === 'started' ||
          b.status === 'ride_started')
    );
  };

  // KPI calculations
  const totalFleetCount = drivers.length;
  const activeAccountsCount = useMemo(() => {
    return drivers.filter((d) => d.profile?.status !== 'deactivated' && d.profile?.status !== 'suspended').length;
  }, [drivers]);
  const inactiveAccountsCount = totalFleetCount - activeAccountsCount;
  const assignedVehiclesCount = useMemo(() => {
    return drivers.filter((d) => Boolean(d.assigned_vehicle_id)).length;
  }, [drivers]);

  const fleetAverageRating = useMemo(() => {
    const validRatings = ratings.filter((r) => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)));
    if (validRatings.length === 0) return 5.0;
    const sum = validRatings.reduce((acc, curr) => acc + Number(curr.rating), 0);
    return Number((sum / validRatings.length).toFixed(1));
  }, [ratings]);

  // Filtered & Searched Drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const isAccountActive = d.profile?.status !== 'deactivated' && d.profile?.status !== 'suspended';

      // 1. Account status filter
      if (accountStatusFilter === 'active' && !isAccountActive) return false;
      if (accountStatusFilter === 'inactive' && isAccountActive) return false;

      // 2. Vehicle assignment filter
      const isAssigned = Boolean(d.assigned_vehicle_id);
      if (assignmentFilter === 'assigned' && !isAssigned) return false;
      if (assignmentFilter === 'unassigned' && isAssigned) return false;

      // 3. Operational duty status filter
      if (dutyFilter === 'available' && d.status !== 'available') return false;
      if (dutyFilter === 'on_trip' && d.status !== 'on_trip' && d.status !== 'busy') return false;
      if (dutyFilter === 'offline' && d.status !== 'offline') return false;

      // 4. Text Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = (d.profile?.full_name || d.full_name || '').toLowerCase();
        const email = (d.profile?.email || '').toLowerCase();
        const phone = (d.profile?.phone || d.phone || '').toLowerCase();
        const license = (d.license_number || '').toLowerCase();
        const nationalId = (d.national_id || '').toLowerCase();

        const veh = getVehicleDetails(d.assigned_vehicle_id);
        const vehName = (veh?.name || '').toLowerCase();
        const vehPlate = (veh?.plate_number || '').toLowerCase();

        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          license.includes(q) ||
          nationalId.includes(q) ||
          vehName.includes(q) ||
          vehPlate.includes(q)
        );
      }

      return true;
    });
  }, [drivers, accountStatusFilter, assignmentFilter, dutyFilter, search, rateVehicles, vehicles]);

  // Reset Add Form
  const resetAddForm = () => {
    setAddFullName('');
    setAddEmail('');
    setAddPhone('+966 5');
    setAddPassword('AlHarmain@2026');
    setAddAutoPassword(true);
    setAddLicenseNumber('');
    setAddNationalId('');
    setAddAssignedVehicleId('');
    setAddStatus('active');
    setAddAvatarFile(null);
    setAddAvatarPreview(null);
    setCreatedCredentials(null);
    setHasCopiedCredentials(false);
  };

  // Open Edit Modal with driver data prefilled
  const openEditModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditFullName(driver.profile?.full_name || driver.full_name || '');
    setEditEmail(driver.profile?.email || '');
    setEditPhone(driver.profile?.phone || driver.phone || '');
    setEditLicenseNumber(driver.license_number || '');
    setEditNationalId(driver.national_id || '');
    setEditAssignedVehicleId(driver.assigned_vehicle_id || '');
    setEditStatus(driver.profile?.status || 'active');
    setEditPassword('');
    setEditAvatarFile(null);
    setEditAvatarPreview(driver.avatar_url || driver.profile?.avatar_url || null);
    setEditAvatarRemoved(false);
    setIsEditModalOpen(true);
  };

  // Open Vehicle Modal
  const openVehicleModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setVehicleModalSelectedId(driver.assigned_vehicle_id || '');
    setIsVehicleModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  // Open Reviews Modal
  const openReviewsModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsReviewsModalOpen(true);
  };

  // Avatar file change handler for Add
  const handleAddAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setAddAvatarFile(file);
    setAddAvatarPreview(URL.createObjectURL(file));
  };

  // Avatar file change handler for Edit
  const handleEditAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
    setEditAvatarRemoved(false);
  };

  // Submit Add Driver Form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addFullName.trim() || addFullName.trim().length < 2) {
      toast.error('Please enter the captain\'s full legal name (minimum 2 characters).');
      return;
    }
    if (!addEmail.trim() || !isValidEmail(addEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (!addPhone.trim() || addPhone.trim().length < 9) {
      toast.error('Please provide a valid phone number (minimum 9 digits).');
      return;
    }
    if (!addLicenseNumber.trim() || addLicenseNumber.trim().length < 3) {
      toast.error('Please enter a valid commercial driving license number.');
      return;
    }

    // Check vehicle conflict
    if (addAssignedVehicleId) {
      const conflictDriver = getVehicleCurrentDriver(addAssignedVehicleId);
      if (conflictDriver) {
        toast.error(
          `Vehicle is already assigned to ${conflictDriver.profile?.full_name || 'another captain'}. Please choose an unassigned vehicle.`
        );
        return;
      }
    }

    setIsSubmittingAdd(true);

    try {
      let finalAvatarUrl: string | undefined = undefined;

      // 1. Upload avatar to Supabase Storage if file selected
      if (addAvatarFile) {
        toast.loading('Uploading captain profile photo...');
        const uploaded = await uploadDriverAvatar(addAvatarFile);
        toast.dismiss();
        if (uploaded) {
          finalAvatarUrl = uploaded;
        }
      }

      // 2. Generate or use password
      const passwordToUse = addAutoPassword
        ? 'AHT@' + Math.floor(100000 + Math.random() * 900000)
        : addPassword.trim();

      // 3. Create driver user via server endpoint
      const result = await adminCreateUser({
        role: 'driver',
        full_name: addFullName.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim(),
        password: passwordToUse,
        license_number: addLicenseNumber.trim(),
        national_id: addNationalId.trim() || undefined,
        assigned_vehicle_id: addAssignedVehicleId || undefined,
        status: addStatus,
        email_verified: true,
        avatar_url: finalAvatarUrl,
      });

      if (result.success && result.user) {
        setCreatedCredentials({
          name: addFullName.trim(),
          email: addEmail.trim().toLowerCase(),
          pass: result.generatedPassword || passwordToUse,
          phone: addPhone.trim(),
        });
        toast.success(`Captain ${addFullName.trim()} successfully registered!`);
      }
    } catch (err: unknown) {
      console.error('Add driver error:', err);
      toast.error('Failed to create driver account.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Submit Edit Driver Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    if (!editFullName.trim() || editFullName.trim().length < 2) {
      toast.error('Please enter the full legal name.');
      return;
    }
    if (!editEmail.trim() || !isValidEmail(editEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 9) {
      toast.error('Please provide a valid phone number.');
      return;
    }
    if (!editLicenseNumber.trim()) {
      toast.error('Driving license number is required.');
      return;
    }

    // Check vehicle conflict
    if (editAssignedVehicleId && editAssignedVehicleId !== selectedDriver.assigned_vehicle_id) {
      const conflictDriver = getVehicleCurrentDriver(editAssignedVehicleId, selectedDriver.id);
      if (conflictDriver) {
        toast.error(
          `Vehicle is already assigned to ${conflictDriver.profile?.full_name || 'another captain'}.`
        );
        return;
      }
    }

    setIsSubmittingEdit(true);

    try {
      let finalAvatarUrl: string | null | undefined = undefined;

      if (editAvatarFile) {
        toast.loading('Uploading new profile photo...');
        const uploaded = await uploadDriverAvatar(editAvatarFile, selectedDriver.id);
        toast.dismiss();
        if (uploaded) finalAvatarUrl = uploaded;
      } else if (editAvatarRemoved) {
        finalAvatarUrl = null;
      }

      const updates: any = {
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim(),
        license_number: editLicenseNumber.trim(),
        national_id: editNationalId.trim() || null,
        assigned_vehicle_id: editAssignedVehicleId || null,
        status: editStatus,
      };

      if (finalAvatarUrl !== undefined) {
        updates.avatar_url = finalAvatarUrl;
      }

      if (editPassword && editPassword.trim().length >= 6) {
        updates.password = editPassword.trim();
      }

      const res = await adminUpdateUser(selectedDriver.id, updates);
      if (res.success) {
        toast.success(`Captain ${editFullName.trim()} profile updated!`);
        setIsEditModalOpen(false);
        setSelectedDriver(null);
      }
    } catch (err) {
      console.error('Update driver error:', err);
      toast.error('Failed to update driver profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Vehicle Assignment Modal
  const handleAssignVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    const targetVehicleId = vehicleModalSelectedId ? vehicleModalSelectedId.trim() : null;

    if (targetVehicleId) {
      const conflictDriver = getVehicleCurrentDriver(targetVehicleId, selectedDriver.id);
      if (conflictDriver) {
        toast.error(
          `Vehicle is already assigned to ${conflictDriver.profile?.full_name || 'another captain'}. Please select an available vehicle or unassign them first.`
        );
        return;
      }
    }

    setIsSubmittingVehicle(true);
    try {
      const res = await adminAssignVehicle(selectedDriver.id, targetVehicleId);
      if (res.success) {
        setIsVehicleModalOpen(false);
        setSelectedDriver(null);
      }
    } catch (err) {
      console.error('Vehicle assignment error:', err);
      toast.error('Failed to update vehicle allocation.');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  // Handle Quick Toggle Status
  const handleQuickStatusToggle = async (driver: Driver) => {
    await toggleUserStatus(driver.id);
  };

  // Handle Permanent Delete
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    const activeTrips = getDriverActiveTrips(selectedDriver.id);
    if (activeTrips.length > 0) {
      toast.error(
        `Cannot delete ${selectedDriver.profile?.full_name || 'Driver'}: ${activeTrips.length} active trip(s) in progress. Please reassign these trips in the Ride Queue first.`
      );
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm permanent deletion.');
      return;
    }

    setIsSubmittingDelete(true);
    try {
      const success = await deleteUser(selectedDriver.id, true);
      if (success) {
        setIsDeleteModalOpen(false);
        setIsDetailsModalOpen(false);
        setSelectedDriver(null);
      }
    } catch (err) {
      console.error('Permanent delete error:', err);
      toast.error('An error occurred during account deletion.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Copy credentials helper
  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Al Harmain Travels Chauffeur Portal Credentials:\nPortal: https://alharmaintravel.com/driver\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nPassword: ${createdCredentials.pass}`;
    navigator.clipboard.writeText(text);
    setHasCopiedCredentials(true);
    toast.success('Captain credentials copied to clipboard!');
    setTimeout(() => setHasCopiedCredentials(false), 3000);
  };

  return (
    <div className="page-shell space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TOP CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-base p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="type-eyebrow text-emerald-600 dark:text-emerald-400">Operations Command</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Fleet Live
            </span>
          </div>
          <h1 className="type-page-title mt-1">Driver Management &amp; Fleet Roster</h1>
          <p className="text-xs text-secondary mt-0.5">
            Onboard new chauffeurs, manage account credentials, allocate vehicles, and audit performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-2xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sync with Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Chauffeur</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI STAT CARDS (5 Cards)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Drivers */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Total Fleet</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-primary font-mono">{totalFleetCount}</p>
          <span className="text-[10px] text-secondary block">Registered captains</span>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Active Accounts</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {activeAccountsCount}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">
            Eligible for ride dispatch
          </span>
        </div>

        {/* Inactive Accounts */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Inactive / Off-Duty</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {inactiveAccountsCount}
          </p>
          <span className="text-[10px] text-muted block">Blocked from assignment</span>
        </div>

        {/* Vehicles Assigned */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Vehicles Assigned</span>
            <Car className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {assignedVehiclesCount} <span className="text-xs font-normal text-muted">/ {totalFleetCount}</span>
          </p>
          <span className="text-[10px] text-secondary block">
            {totalFleetCount > 0 ? Math.round((assignedVehiclesCount / totalFleetCount) * 100) : 0}% fleet allocated
          </span>
        </div>

        {/* Fleet Rating */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Fleet Satisfaction</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black text-amber-500 font-mono">{fleetAverageRating.toFixed(1)}</p>
            <span className="text-xs text-muted">/ 5.0</span>
          </div>
          <span className="text-[10px] text-secondary block">
            {ratings.length} verified review{ratings.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH, FILTERS & VIEW CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by chauffeur name, email, phone, license, or vehicle plate..."
              className="w-full bg-input border border-base rounded-2xl pl-10 pr-9 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account Status Filter */}
            <div className="flex items-center gap-1.5 bg-input border border-base rounded-2xl px-3 py-1.5 text-xs">
              <Shield className="w-3.5 h-3.5 text-muted" />
              <select
                value={accountStatusFilter}
                onChange={(e) => setAccountStatusFilter(e.target.value as any)}
                className="bg-transparent text-primary text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Account: All</option>
                <option value="active">Active Accounts Only</option>
                <option value="inactive">Inactive / Deactivated Only</option>
              </select>
            </div>

            {/* Vehicle Assignment Filter */}
            <div className="flex items-center gap-1.5 bg-input border border-base rounded-2xl px-3 py-1.5 text-xs">
              <Car className="w-3.5 h-3.5 text-muted" />
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as any)}
                className="bg-transparent text-primary text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Vehicle: All</option>
                <option value="assigned">Assigned Vehicle</option>
                <option value="unassigned">Unassigned Vehicle</option>
              </select>
            </div>

            {/* Operational Duty Status */}
            <div className="flex items-center gap-1.5 bg-input border border-base rounded-2xl px-3 py-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <select
                value={dutyFilter}
                onChange={(e) => setDutyFilter(e.target.value as any)}
                className="bg-transparent text-primary text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Duty: All</option>
                <option value="available">Available</option>
                <option value="on_trip">On Trip / Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-input border border-base rounded-2xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                    : 'text-muted hover:text-primary'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                    : 'text-muted hover:text-primary'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results summary & clear */}
        <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-base">
          <span>
            Showing <strong className="text-primary">{filteredDrivers.length}</strong> of{' '}
            <strong className="text-primary">{totalFleetCount}</strong> fleet chauffeurs
          </span>

          {(search || accountStatusFilter !== 'all' || assignmentFilter !== 'all' || dutyFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setAccountStatusFilter('all');
                setAssignmentFilter('all');
                setDutyFilter('all');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN ROSTER (GRID OR TABLE)
      ───────────────────────────────────────────────────────────── */}
      {isDataLoading ? (
        <CardGridSkeleton count={6} heightClass="h-72" />
      ) : filteredDrivers.length === 0 ? (
        <EmptyStateView
          icon={Car}
          title="No Matching Chauffeurs Found"
          description={
            search || accountStatusFilter !== 'all' || assignmentFilter !== 'all' || dutyFilter !== 'all'
              ? 'No drivers matched your active search filters. Try broadening your criteria or reset the filters.'
              : 'No drivers have been registered in the fleet yet. Tap "Add New Chauffeur" above to onboard your first captain.'
          }
        />
      ) : viewMode === 'grid' ? (
        /* ──── GRID VIEW ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrivers.map((driver) => {
            const isAccountActive = driver.profile?.status !== 'deactivated' && driver.profile?.status !== 'suspended';
            const vehicle = getVehicleDetails(driver.assigned_vehicle_id);
            const driverReviews = getDriverRatings(driver.id);
            const completedRides = getDriverCompletedTrips(driver.id).length || driver.total_rides || 0;
            const activeRides = getDriverActiveTrips(driver.id).length;
            const driverName = driver.profile?.full_name || driver.full_name || 'Captain';

            return (
              <div
                key={driver.id}
                className={`p-5 rounded-3xl bg-card border transition-all duration-200 shadow-md flex flex-col justify-between space-y-4 hover:shadow-xl ${
                  !isAccountActive
                    ? 'border-rose-500/30 bg-rose-500/[0.02]'
                    : 'border-base hover:border-emerald-500/50'
                }`}
              >
                {/* Top: Avatar, Name & Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 h-14 shrink-0">
                        <ChauffeurAvatar
                          src={driver.avatar_url || driver.profile?.avatar_url || (driver as any).photo}
                          name={driverName}
                          size="md"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                            !isAccountActive
                              ? 'bg-rose-500'
                              : driver.status === 'available'
                              ? 'bg-emerald-500 animate-pulse'
                              : driver.status === 'on_trip'
                              ? 'bg-purple-500'
                              : 'bg-slate-400'
                          }`}
                          title={!isAccountActive ? 'Account Inactive' : `Duty: ${driver.status}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-primary truncate">{driverName}</h3>
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted truncate">
                          Lic: <strong className="font-mono text-secondary">{driver.license_number || 'SA-DL-XXXX'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Status Badges Stack */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Account Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isAccountActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {isAccountActive ? 'Active' : 'Inactive'}
                      </span>

                      {/* Duty Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          driver.status === 'available' && isAccountActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : driver.status === 'on_trip' || driver.status === 'busy'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : driver.status === 'assigned'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                            : 'bg-surface text-muted border-base'
                        }`}
                      >
                        {driver.status}
                      </span>
                    </div>
                  </div>

                  {/* Contact pills */}
                  <div className="flex items-center gap-2 pt-1">
                    {driver.profile?.phone || driver.phone ? (
                      <a
                        href={`tel:${driver.profile?.phone || driver.phone}`}
                        className="px-2.5 py-1 rounded-xl bg-surface hover:bg-elevated border border-base text-[11px] text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span className="font-mono">{driver.profile?.phone || driver.phone}</span>
                      </a>
                    ) : null}

                    {driver.profile?.email ? (
                      <a
                        href={`mailto:${driver.profile.email}`}
                        className="p-1 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-colors"
                        title={driver.profile.email}
                      >
                        <Mail className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>

                  {/* Vehicle Assignment Box */}
                  <div className="p-3 rounded-2xl bg-surface border border-base space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-sky-500" />
                        <span>Allocated Vehicle:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openVehicleModal(driver)}
                        className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {vehicle ? 'Change' : '+ Assign'}
                      </button>
                    </div>

                    {vehicle ? (
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate">{vehicle.name}</p>
                          <span className="text-[10px] text-muted font-mono">{vehicle.plate_number}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                          {vehicle.seating_capacity} Seats
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 flex items-center justify-between">
                        <span>No vehicle allocated</span>
                        <button
                          type="button"
                          onClick={() => openVehicleModal(driver)}
                          className="font-bold underline text-[10px]"
                        >
                          Assign Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Performance Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Rating */}
                    <div className="p-2.5 rounded-2xl bg-surface border border-base space-y-0.5">
                      <span className="text-[10px] text-muted block">Rating</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>
                          {driver.rating !== null && driver.rating !== undefined
                            ? Number(driver.rating).toFixed(1)
                            : '5.0'}
                        </span>
                        <span className="text-[10px] text-muted font-normal ml-0.5">
                          ({driverReviews.length})
                        </span>
                      </div>
                    </div>

                    {/* Completed Trips */}
                    <div className="p-2.5 rounded-2xl bg-surface border border-base space-y-0.5">
                      <span className="text-[10px] text-muted block">Completed Trips</span>
                      <p className="font-bold text-primary font-mono">{completedRides}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom: Action Toolbar */}
                <div className="pt-2 border-t border-base flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {/* View Dossier Button */}
                    <button
                      type="button"
                      onClick={() => openDetailsModal(driver)}
                      className="p-2 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-colors cursor-pointer"
                      title="View Complete Dossier & Ride History"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Driver Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(driver)}
                      className="p-2 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-colors cursor-pointer"
                      title="Edit Captain Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Assign Vehicle Button */}
                    <button
                      type="button"
                      onClick={() => openVehicleModal(driver)}
                      className="p-2 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                      title="Assign or Change Vehicle"
                    >
                      <Car className="w-3.5 h-3.5" />
                    </button>

                    {/* Passenger Reviews Button */}
                    <button
                      type="button"
                      onClick={() => openReviewsModal(driver)}
                      className="p-2 rounded-xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-amber-500 transition-colors cursor-pointer relative"
                      title="View Passenger Reviews"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {driverReviews.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[8px] flex items-center justify-center">
                          {driverReviews.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Activate / Deactivate Toggle */}
                    <button
                      type="button"
                      onClick={() => handleQuickStatusToggle(driver)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                        isAccountActive
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                      title={isAccountActive ? 'Temporarily deactivate captain' : 'Reactivate captain'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isAccountActive ? 'Deactivate' : 'Reactivate'}</span>
                    </button>

                    {/* Permanent Delete */}
                    <button
                      type="button"
                      onClick={() => openDeleteModal(driver)}
                      className="p-1.5 rounded-xl text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Chauffeur Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ──── TABLE VIEW ──── */
        <div className="rounded-3xl bg-card border border-base shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/80 border-b border-base text-muted text-[10.5px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Chauffeur</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">License / ID</th>
                  <th className="py-3 px-4">Allocated Vehicle</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Duty Status</th>
                  <th className="py-3 px-4">Trips / Rating</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {filteredDrivers.map((driver) => {
                  const isAccountActive = driver.profile?.status !== 'deactivated' && driver.profile?.status !== 'suspended';
                  const vehicle = getVehicleDetails(driver.assigned_vehicle_id);
                  const driverReviews = getDriverRatings(driver.id);
                  const completedRides = getDriverCompletedTrips(driver.id).length || driver.total_rides || 0;
                  const driverName = driver.profile?.full_name || driver.full_name || 'Captain';

                  return (
                    <tr
                      key={driver.id}
                      className={`hover:bg-elevated/40 transition-colors ${
                        !isAccountActive ? 'bg-rose-500/[0.02]' : ''
                      }`}
                    >
                      {/* Chauffeur column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <ChauffeurAvatar
                            src={driver.avatar_url || driver.profile?.avatar_url || (driver as any).photo}
                            name={driverName}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-primary block truncate">{driverName}</span>
                            <span className="text-[10px] text-muted truncate block">{driver.profile?.email || 'No email'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <a
                          href={`tel:${driver.profile?.phone || driver.phone}`}
                          className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{driver.profile?.phone || driver.phone || '—'}</span>
                        </a>
                      </td>

                      {/* License / ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div>{driver.license_number || '—'}</div>
                        {driver.national_id && (
                          <div className="text-[10px] text-muted">ID: {driver.national_id}</div>
                        )}
                      </td>

                      {/* Allocated Vehicle */}
                      <td className="py-3.5 px-4">
                        {vehicle ? (
                          <div>
                            <span className="font-semibold text-primary block">{vehicle.name}</span>
                            <span className="text-[10px] text-muted font-mono">
                              {vehicle.plate_number} &bull; {vehicle.seating_capacity} Seats
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-500 text-[11px] font-semibold">Unassigned</span>
                        )}
                      </td>

                      {/* Account Status with Quick Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(driver)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${
                            isAccountActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}
                          title="Click to toggle active/inactive status"
                        >
                          {isAccountActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Duty Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            driver.status === 'available' && isAccountActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : driver.status === 'on_trip'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : 'bg-surface text-muted border-base'
                          }`}
                        >
                          {driver.status}
                        </span>
                      </td>

                      {/* Rating / Completed */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-500" />
                          <span>
                            {driver.rating !== null && driver.rating !== undefined
                              ? Number(driver.rating).toFixed(1)
                              : '5.0'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted">{completedRides} rides completed</span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetailsModal(driver)}
                            className="p-1.5 rounded-xl hover:bg-surface text-muted hover:text-primary transition-colors cursor-pointer"
                            title="View Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(driver)}
                            className="p-1.5 rounded-xl hover:bg-surface text-muted hover:text-primary transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openVehicleModal(driver)}
                            className="p-1.5 rounded-xl hover:bg-surface text-muted hover:text-sky-500 transition-colors cursor-pointer"
                            title="Assign Vehicle"
                          >
                            <Car className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(driver)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/10 text-muted hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Chauffeur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: ADD NEW CHAUFFEUR
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-xl w-full my-8 space-y-5 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title">Provision New Chauffeur Account</h3>
                  <p className="text-xs text-muted">Register a certified driver in the fleet and create Supabase Auth.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAddForm();
                }}
                className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Created Credentials Success Card (if registered) */}
            {createdCredentials ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Account Provisioned Successfully!</span>
                </div>
                <p className="text-xs text-secondary">
                  Share these login credentials with Captain <strong>{createdCredentials.name}</strong> to access the driver cockpit:
                </p>

                <div className="p-3.5 rounded-xl bg-card border border-base font-mono text-xs space-y-1.5 select-all">
                  <div><strong>Portal:</strong> https://alharmaintravel.com/driver</div>
                  <div><strong>Email:</strong> {createdCredentials.email}</div>
                  <div><strong>Phone:</strong> {createdCredentials.phone}</div>
                  <div><strong>Temporary Password:</strong> <span className="text-amber-500 font-bold">{createdCredentials.pass}</span></div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-elevated border border-base text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {hasCopiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCredentials ? 'Copied!' : 'Copy Credentials'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetAddForm();
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Profile Photo Uploader */}
                <div className="p-4 rounded-2xl bg-surface border border-base space-y-3">
                  <span className="text-xs font-bold text-primary block">Chauffeur Profile Photo (Supabase Storage)</span>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {addAvatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={addAvatarPreview}
                          alt="Preview"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-input border border-dashed border-base flex flex-col items-center justify-center text-muted">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        ref={addFileInputRef}
                        onChange={handleAddAvatarSelect}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-card hover:bg-elevated border border-base text-xs font-semibold text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{addAvatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                        {addAvatarPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddAvatarFile(null);
                              setAddAvatarPreview(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-xs text-rose-500 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted">Supports JPEG, PNG, WebP up to 5MB. Uploaded to avatars bucket.</p>
                    </div>
                  </div>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={addFullName}
                      onChange={(e) => setAddFullName(e.target.value)}
                      placeholder="e.g. Captain Tariq Al-Ghamdi"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      placeholder="+966 5X XXX XXXX"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Email & Account Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">Email Address (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="driver@alharmaintravel.com"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">Initial Account Status</label>
                    <select
                      value={addStatus}
                      onChange={(e) => setAddStatus(e.target.value as UserStatus)}
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="active">Active (Ready for service)</option>
                      <option value="deactivated">Inactive / Deactivated</option>
                    </select>
                  </div>
                </div>

                {/* License Number & National ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">Driving License Number *</label>
                    <input
                      type="text"
                      required
                      value={addLicenseNumber}
                      onChange={(e) => setAddLicenseNumber(e.target.value)}
                      placeholder="e.g. SA-DL-984210"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary font-semibold">National ID / Iqama (Optional)</label>
                    <input
                      type="text"
                      value={addNationalId}
                      onChange={(e) => setAddNationalId(e.target.value)}
                      placeholder="e.g. 1098234156"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Allocate Vehicle (Only from Admin Rates Module) */}
                <div className="space-y-1 text-xs">
                  <label className="text-secondary font-semibold flex items-center justify-between">
                    <span>Allocate Vehicle from Admin Rates Configuration</span>
                    <span className="text-[10px] text-muted">Prevents conflicting assignments</span>
                  </label>
                  <select
                    value={addAssignedVehicleId}
                    onChange={(e) => setAddAssignedVehicleId(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Assign Later / Unassigned --</option>
                    {activeRateVehicles.map((rv) => {
                      const conflict = getVehicleCurrentDriver(rv.id);
                      return (
                        <option
                          key={rv.id}
                          value={rv.id}
                          disabled={Boolean(conflict)}
                        >
                          {rv.name} &bull; {rv.category.toUpperCase()} ({rv.seating_capacity} Seats)
                          {conflict ? ` — [Assigned to ${conflict.profile?.full_name || 'Captain'}]` : ' — [Available]'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Password Configuration */}
                <div className="p-3.5 rounded-2xl bg-surface border border-base space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Security &amp; Login Password</span>
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addAutoPassword}
                        onChange={(e) => setAddAutoPassword(e.target.checked)}
                        className="rounded accent-emerald-600"
                      />
                      <span>Auto-generate secure key</span>
                    </label>
                  </div>

                  {!addAutoPassword && (
                    <input
                      type="text"
                      required
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetAddForm();
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingAdd ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning Account...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Create Chauffeur</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: EDIT CHAUFFEUR
      ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-xl w-full my-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center border border-sky-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title">Update Chauffeur Profile</h3>
                  <p className="text-xs text-muted">Edit contact details, credentials, and vehicle assignment.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedDriver(null);
                }}
                className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Photo Upload / Change / Remove */}
              <div className="p-4 rounded-2xl bg-surface border border-base space-y-3">
                <span className="text-xs font-bold text-primary block">Profile Image (Supabase Storage)</span>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {editAvatarPreview && !editAvatarRemoved ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editAvatarPreview}
                        alt="Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-input border border-dashed border-base flex flex-col items-center justify-center text-muted">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditAvatarSelect}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-card hover:bg-elevated border border-base text-xs font-semibold text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Upload New Photo</span>
                      </button>
                      {(editAvatarPreview || editAvatarFile) && !editAvatarRemoved && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditAvatarFile(null);
                            setEditAvatarPreview(null);
                            setEditAvatarRemoved(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-xs text-rose-500 transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted">Directly synced to avatars bucket and driver dossier.</p>
                  </div>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-secondary font-semibold">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-secondary font-semibold">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email & Account Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-secondary font-semibold">Email Address (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-secondary font-semibold">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="active">Active (Eligible for dispatch)</option>
                    <option value="deactivated">Inactive / Deactivated (Blocked from dispatch)</option>
                  </select>
                </div>
              </div>

              {/* License Number & National ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-secondary font-semibold">Driving License Number *</label>
                  <input
                    type="text"
                    required
                    value={editLicenseNumber}
                    onChange={(e) => setEditLicenseNumber(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-secondary font-semibold">National ID / Iqama</label>
                  <input
                    type="text"
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Vehicle Assignment */}
              <div className="space-y-1 text-xs">
                <label className="text-secondary font-semibold">Vehicle Allocation (Admin Rates Master)</label>
                <select
                  value={editAssignedVehicleId}
                  onChange={(e) => setEditAssignedVehicleId(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- No Vehicle Allocated (Unassigned) --</option>
                  {activeRateVehicles.map((rv) => {
                    const conflict = getVehicleCurrentDriver(rv.id, selectedDriver.id);
                    return (
                      <option
                        key={rv.id}
                        value={rv.id}
                        disabled={Boolean(conflict)}
                      >
                        {rv.name} &bull; {rv.category.toUpperCase()} ({rv.seating_capacity} Seats)
                        {conflict ? ` — [Assigned to ${conflict.profile?.full_name || 'Captain'}]` : ' — [Available]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Optional Password Reset */}
              <div className="p-3.5 rounded-2xl bg-surface border border-base space-y-1.5 text-xs">
                <label className="font-semibold text-primary block flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reset Password (Leave blank to keep current)</span>
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Updates</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MODAL: ASSIGN VEHICLE
      ───────────────────────────────────────────────────────────── */}
      {isVehicleModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center border border-sky-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title">Allocate Fleet Vehicle</h3>
                  <p className="text-xs text-muted">
                    Captain: <strong>{selectedDriver.profile?.full_name || selectedDriver.full_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVehicleModalOpen(false);
                  setSelectedDriver(null);
                }}
                className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignVehicleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-secondary font-semibold">
                  Select from Admin Rates Vehicle Configuration:
                </label>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {/* Option: Unassign */}
                  <div
                    onClick={() => setVehicleModalSelectedId('')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      vehicleModalSelectedId === ''
                        ? 'bg-amber-500/10 border-amber-500 text-primary'
                        : 'bg-surface border-base text-secondary hover:border-amber-500/40'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-primary">Unassign Vehicle</p>
                      <p className="text-[10px] text-muted">Release current vehicle back to pool</p>
                    </div>
                    {vehicleModalSelectedId === '' && (
                      <Check className="w-4 h-4 text-amber-500" />
                    )}
                  </div>

                  {activeRateVehicles.map((rv) => {
                    const isSelected = vehicleModalSelectedId === rv.id;
                    const conflictDriver = getVehicleCurrentDriver(rv.id, selectedDriver.id);

                    return (
                      <div
                        key={rv.id}
                        onClick={() => {
                          if (!conflictDriver) {
                            setVehicleModalSelectedId(rv.id);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          conflictDriver
                            ? 'bg-surface/40 border-base opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-primary cursor-pointer'
                            : 'bg-surface border-base text-secondary hover:border-emerald-500/40 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-primary truncate">{rv.name}</p>
                          <p className="text-[10px] text-muted font-mono">
                            {rv.category.toUpperCase()} &bull; {rv.seating_capacity} Seats &bull; {rv.luggage_capacity} Luggage
                          </p>
                          {conflictDriver && (
                            <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
                              Assigned to: {conflictDriver.profile?.full_name || 'Another Captain'}
                            </span>
                          )}
                        </div>

                        {isSelected && !conflictDriver && (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => {
                    setIsVehicleModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingVehicle ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Allocation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. MODAL: DRIVER DOSSIER & REAL RIDE HISTORY
      ───────────────────────────────────────────────────────────── */}
      {isDetailsModalOpen && selectedDriver && (() => {
        const d = selectedDriver;
        const isAccountActive = d.profile?.status !== 'deactivated' && d.profile?.status !== 'suspended';
        const vehicle = getVehicleDetails(d.assigned_vehicle_id);
        const driverReviews = getDriverRatings(d.id);
        const completedTrips = getDriverCompletedTrips(d.id);
        const activeTrips = getDriverActiveTrips(d.id);
        const driverName = d.profile?.full_name || d.full_name || 'Captain';

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-card border border-base rounded-3xl p-6 max-w-2xl w-full my-6 max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-base pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <ChauffeurAvatar
                    src={d.avatar_url || d.profile?.avatar_url || (d as any).photo}
                    name={driverName}
                    size="md"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-primary">{driverName}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isAccountActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isAccountActive ? 'Account Active' : 'Account Deactivated'}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      Chauffeur ID: <span className="font-mono text-secondary">{d.id.slice(0, 8)}...</span> &bull; Status: <strong className="uppercase">{d.status}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Dossier Content */}
              <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
                {/* Contact & Legal Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-surface border border-base space-y-0.5">
                    <span className="text-[10px] text-muted block">Direct Phone</span>
                    <a
                      href={`tel:${d.profile?.phone || d.phone}`}
                      className="font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline truncate block"
                    >
                      {d.profile?.phone || d.phone || '—'}
                    </a>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface border border-base space-y-0.5">
                    <span className="text-[10px] text-muted block">Driving License</span>
                    <span className="font-mono font-bold text-primary truncate block">
                      {d.license_number || '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface border border-base space-y-0.5">
                    <span className="text-[10px] text-muted block">National ID</span>
                    <span className="font-mono font-bold text-primary truncate block">
                      {d.national_id || '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface border border-base space-y-0.5">
                    <span className="text-[10px] text-muted block">Average Rating</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {d.rating !== null && d.rating !== undefined ? Number(d.rating).toFixed(1) : '5.0'} / 5.0
                    </span>
                  </div>
                </div>

                {/* Allocated Vehicle Box */}
                <div className="p-4 rounded-2xl bg-surface border border-base space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-sky-500" />
                      <span>Allocated Vehicle Specification</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        openVehicleModal(d);
                      }}
                      className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                    >
                      {vehicle ? 'Change Allocation' : 'Assign Vehicle'}
                    </button>
                  </div>

                  {vehicle ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-muted block text-[10px]">Model &amp; Name:</span>
                        <span className="font-bold text-primary">{vehicle.name}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Registration Plate:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{vehicle.plate_number}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Passenger Capacity:</span>
                        <span className="font-semibold text-primary">{vehicle.seating_capacity} Guests</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Luggage Capacity:</span>
                        <span className="font-semibold text-primary">{vehicle.luggage_capacity} Suitcases</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-amber-500 text-xs italic">No fleet vehicle currently allocated to this chauffeur.</p>
                  )}
                </div>

                {/* Real Booking Ride History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span>Trip Records &amp; Ride History ({completedTrips.length} completed)</span>
                    </span>
                  </div>

                  {completedTrips.length === 0 ? (
                    <div className="p-6 text-center bg-surface/50 border border-base rounded-2xl text-xs text-muted space-y-1">
                      <Car className="w-6 h-6 mx-auto text-muted" />
                      <p className="font-bold text-primary">No Recorded Trips Yet</p>
                      <p>Completed passenger trips will appear here automatically when rides are concluded.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                      {completedTrips.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-2xl bg-surface border border-base flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-500 text-[11px]">
                                #{b.booking_reference}
                              </span>
                              <span className="text-[10px] text-muted">
                                {formatDateTime(b.scheduled_at || b.created_at)}
                              </span>
                            </div>
                            <p className="text-primary truncate font-medium">
                              {b.pickup_address} &rarr; {b.destination_address}
                            </p>
                            <span className="text-[10px] text-muted block">
                              Guest: {b.passenger_name} ({b.passenger_phone})
                            </span>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                              {formatCurrency(b.final_fare || b.estimated_fare)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verified Passenger Reviews */}
                <div className="space-y-2">
                  <span className="font-bold text-primary text-xs flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Passenger Ratings &amp; Reviews ({driverReviews.length})</span>
                  </span>

                  {driverReviews.length === 0 ? (
                    <p className="text-xs text-muted italic bg-surface/50 p-3 rounded-xl border border-base">
                      No passenger reviews left yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {driverReviews.map((rev) => (
                        <div key={rev.id} className="p-3 rounded-xl bg-surface border border-base space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">
                              {rev.customer?.full_name || 'Passenger'}
                            </span>
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span>{rev.rating}.0</span>
                            </div>
                          </div>
                          {rev.feedback ? (
                            <p className="text-xs text-secondary italic">&ldquo;{rev.feedback}&rdquo;</p>
                          ) : (
                            <span className="text-[10px] text-muted italic">No written comment left.</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-base flex items-center justify-between gap-2 shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      openEditModal(d);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface hover:bg-elevated border border-base text-primary font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-500" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusToggle(d)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isAccountActive
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isAccountActive ? 'Deactivate Chauffeur' : 'Reactivate Chauffeur'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    openDeleteModal(d);
                  }}
                  className="px-3.5 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 font-semibold transition-colors cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          9. MODAL: PASSENGER REVIEWS DOSSIER
      ───────────────────────────────────────────────────────────── */}
      {isReviewsModalOpen && selectedDriver && (() => {
        const d = selectedDriver;
        const driverReviews = getDriverRatings(d.id);
        const driverName = d.profile?.full_name || d.full_name || 'Captain';

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-card border border-base rounded-3xl p-5 sm:p-6 max-w-xl w-full my-6 max-h-[90vh] flex flex-col shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-base pb-3">
                <div className="flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <div>
                    <h3 className="type-card-title">Passenger Feedback &amp; Reviews</h3>
                    <p className="text-xs text-muted">Captain: <strong>{driverName}</strong></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewsModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
                {driverReviews.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-base rounded-2xl space-y-2">
                    <Star className="w-8 h-8 text-muted mx-auto" />
                    <h4 className="text-sm font-bold text-primary">No Passenger Reviews Yet</h4>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      When passengers submit ratings and written feedback for completed trips with {driverName}, they will appear here.
                    </p>
                  </div>
                ) : (
                  driverReviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-surface border border-base space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-primary">{rev.customer?.full_name || 'Passenger'}</span>
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </div>
                      {rev.feedback ? (
                        <p className="text-xs text-secondary italic bg-input/40 p-2.5 rounded-xl border border-base">
                          &ldquo;{rev.feedback}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted italic">No written comment left.</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-base flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewsModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-elevated border border-base text-primary transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          10. MODAL: SAFE DELETE CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedDriver && (() => {
        const d = selectedDriver;
        const driverName = d.profile?.full_name || d.full_name || 'Captain';
        const activeTrips = getDriverActiveTrips(d.id);
        const completedTrips = getDriverCompletedTrips(d.id);
        const hasActiveTrips = activeTrips.length > 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-card border border-rose-500/40 rounded-3xl p-6 max-w-lg w-full my-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-base pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="type-card-title text-rose-600 dark:text-rose-400">Chauffeur Account Deletion</h3>
                    <p className="text-xs text-muted">Review safe options before proceeding.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning Notice & Active Trip Check */}
              {hasActiveTrips ? (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 space-y-2 text-xs text-rose-300">
                  <p className="font-bold flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert className="w-4 h-4" /> Action Blocked: Active Ongoing Trips Detected!
                  </p>
                  <p>
                    Captain <strong>{driverName}</strong> is currently assigned to <strong>{activeTrips.length} active in-progress trip(s)</strong>.
                  </p>
                  <div className="p-2.5 rounded-xl bg-black/30 font-mono text-[11px] space-y-1">
                    {activeTrips.map((t) => (
                      <div key={t.id} className="flex justify-between">
                        <span>#{t.booking_reference}</span>
                        <span className="uppercase text-amber-400 font-bold">{t.status}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px]">
                    Please reassign or conclude these trips in the <strong>Ride Queue</strong> before deleting this account.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface border border-base space-y-3 text-xs">
                  <p className="text-secondary leading-relaxed">
                    You are managing the account for <strong>{driverName}</strong>. Choose between safe temporary deactivation or irreversible permanent deletion:
                  </p>

                  <div className="space-y-2">
                    {/* Option 1: Temporary Deactivation */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recommended: Temporary Deactivation
                      </span>
                      <p className="text-secondary text-[11px]">
                        Deactivating immediately marks the driver inactive, blocks incoming ride assignments, and preserves all {completedTrips.length} historical trips and ratings. You can reactivate anytime with 1 click.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleUserStatus(d.id);
                          setIsDeleteModalOpen(false);
                          setSelectedDriver(null);
                        }}
                        className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      >
                        Deactivate Account (Safe)
                      </button>
                    </div>

                    {/* Option 2: Permanent Deletion */}
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Irreversible: Permanent Deletion
                      </span>
                      <p className="text-secondary text-[11px]">
                        Permanently deletes the driver from Supabase Auth and database roster. Historical booking records and earnings are preserved in audit archives with driver unassigned.
                      </p>

                      <form onSubmit={handleDeleteSubmit} className="space-y-2 pt-1">
                        <label className="text-[11px] font-semibold text-secondary block">
                          To confirm permanent deletion, type <strong>DELETE</strong> below:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE"
                          className="w-full bg-input border border-rose-500/40 rounded-xl px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="submit"
                          disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isSubmittingDelete}
                          className="w-full py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {isSubmittingDelete ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Permanently Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Permanently Delete Driver</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-base">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
