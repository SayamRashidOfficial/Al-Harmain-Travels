'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Profile, Booking, UserStatus, Driver, Vehicle } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Car,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Power,
  RefreshCw,
  X,
  Copy,
  Check,
  Upload,
  Camera,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  PhoneCall,
  Lock,
  AlertCircle,
  Hash,
  Sparkles,
  CheckCircle2,
  Filter,
  DollarSign,
  MapPin,
  FileText,
  MessageSquare,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardGridSkeleton, TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';

// Helper: RFC 5322 Email Validation
function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

// Helper: Normalize phone for comparisons
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

// Helper: Customer Avatar with resilient error handling and initials fallback
function CustomerAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = (name || 'Pilgrim').trim().slice(0, 1).toUpperCase();

  const sizeClass = {
    sm: 'w-9 h-9 rounded-xl text-xs',
    md: 'w-12 h-12 rounded-2xl text-base',
    lg: 'w-16 h-16 rounded-2xl text-xl',
    xl: 'w-20 h-20 rounded-3xl text-2xl',
  }[size];

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClass} bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 text-amber-300 font-black flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0 select-none ${className}`}
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

export default function DispatcherCustomersPage() {
  const {
    usersList,
    bookings,
    drivers,
    vehicles,
    rateVehicles,
    isDataLoading,
    refreshData,
    adminCreateUser,
    adminUpdateUser,
    toggleUserStatus,
    deleteUser,
    uploadCustomerAvatar,
  } = useApp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bookingFilter, setBookingFilter] = useState<
    'all' | 'has_active' | 'has_completed' | 'has_cancelled' | 'no_bookings'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active modal targets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [detailsBookingFilter, setDetailsBookingFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  // Add Form state
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('+966 5');
  const [addPassword, setAddPassword] = useState('AlHarmain@2026');
  const [addAutoPassword, setAddAutoPassword] = useState(true);
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
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarRemoved, setEditAvatarRemoved] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
      toast.success('Customer directory synchronized with Supabase.');
    } catch {
      toast.error('Failed to sync customer records.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extract all profiles with customer role
  const allCustomers = useMemo(() => {
    return usersList.filter((u) => u.role === 'customer');
  }, [usersList]);

  // Helper to fetch all bookings associated with a customer
  const getCustomerBookings = (customer: Profile): Booking[] => {
    const normPhone = customer.phone ? normalizePhone(customer.phone) : '';
    const email = customer.email ? customer.email.trim().toLowerCase() : '';

    return bookings.filter((b) => {
      // 1. Direct customer_id match
      if (b.customer_id && b.customer_id === customer.id) return true;
      // 2. Normalized phone match
      if (normPhone && b.passenger_phone && normalizePhone(b.passenger_phone) === normPhone) return true;
      // 3. Email match (if customer object on booking has matching email)
      if (email && b.customer?.email && b.customer.email.trim().toLowerCase() === email) return true;
      return false;
    });
  };

  // Helper to get active ongoing trips for a customer
  const getCustomerActiveTrips = (customerId: string, customerPhone?: string | null): Booking[] => {
    const normPhone = customerPhone ? normalizePhone(customerPhone) : '';
    return bookings.filter((b) => {
      const isMatch =
        (b.customer_id && b.customer_id === customerId) ||
        (normPhone && b.passenger_phone && normalizePhone(b.passenger_phone) === normPhone);

      if (!isMatch) return false;

      return (
        b.status === 'pending_review' ||
        b.status === 'pending_verification' ||
        b.status === 'pending' ||
        b.status === 'confirmed' ||
        b.status === 'driver_assigned' ||
        b.status === 'driver_accepted' ||
        b.status === 'accepted' ||
        b.status === 'driver_arriving' ||
        b.status === 'on_the_way' ||
        b.status === 'driver_arrived' ||
        b.status === 'arrived' ||
        b.status === 'trip_started' ||
        b.status === 'started' ||
        b.status === 'ride_started'
      );
    });
  };

  // Derive driver details for a booking
  const getBookingDriverInfo = (booking: Booking) => {
    if (!booking.assigned_driver_id) return null;
    const driver = drivers.find((d) => d.id === booking.assigned_driver_id || d.profile?.id === booking.assigned_driver_id);
    if (!driver) return null;

    let veh = driver.assigned_vehicle;
    if (!veh && driver.assigned_vehicle_id) {
      const rateVeh = rateVehicles?.find((rv) => rv.id === driver.assigned_vehicle_id || rv.category === driver.assigned_vehicle_id);
      if (rateVeh) {
        veh = {
          id: rateVeh.id,
          plate_number: rateVeh.category.toUpperCase(),
          make: rateVeh.name,
          model: `(${rateVeh.seating_capacity} Seats)`,
          vehicle_type: rateVeh.category as any,
          seating_capacity: rateVeh.seating_capacity,
          status: 'assigned',
          created_at: rateVeh.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    return {
      name: driver.profile?.full_name || driver.full_name || 'Captain',
      phone: driver.profile?.phone || driver.phone || '',
      vehicle: veh,
      rating: driver.rating || 5.0,
    };
  };

  // KPI Calculations
  const totalCustomerCount = allCustomers.length;
  const activeAccountsCount = useMemo(() => {
    return allCustomers.filter((c) => c.status !== 'deactivated' && c.status !== 'suspended').length;
  }, [allCustomers]);
  const inactiveAccountsCount = totalCustomerCount - activeAccountsCount;

  // Total bookings across all customers
  const totalCustomerBookingsCount = useMemo(() => {
    const custIds = new Set(allCustomers.map((c) => c.id));
    const custPhones = new Set(allCustomers.filter((c) => c.phone).map((c) => normalizePhone(c.phone!)));
    return bookings.filter(
      (b) => (b.customer_id && custIds.has(b.customer_id)) || (b.passenger_phone && custPhones.has(normalizePhone(b.passenger_phone)))
    ).length;
  }, [allCustomers, bookings]);

  // Total completed rides
  const completedRidesCount = useMemo(() => {
    const custIds = new Set(allCustomers.map((c) => c.id));
    const custPhones = new Set(allCustomers.filter((c) => c.phone).map((c) => normalizePhone(c.phone!)));
    return bookings.filter((b) => {
      const isCust =
        (b.customer_id && custIds.has(b.customer_id)) ||
        (b.passenger_phone && custPhones.has(normalizePhone(b.passenger_phone)));
      return (
        isCust &&
        (b.status === 'trip_completed' ||
          b.status === 'completed' ||
          b.status === 'payment_completed' ||
          b.status === 'ride_completed')
      );
    }).length;
  }, [allCustomers, bookings]);

  // Filtered & Searched Customers list
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const isAccountActive = c.status !== 'deactivated' && c.status !== 'suspended';

      // 1. Account status filter
      if (accountStatusFilter === 'active' && !isAccountActive) return false;
      if (accountStatusFilter === 'inactive' && isAccountActive) return false;

      // 2. Booking activity filter
      if (bookingFilter !== 'all') {
        const cBookings = getCustomerBookings(c);
        const hasActive = cBookings.some((b) =>
          [
            'pending_review',
            'pending_verification',
            'pending',
            'confirmed',
            'driver_assigned',
            'driver_accepted',
            'accepted',
            'driver_arriving',
            'on_the_way',
            'driver_arrived',
            'arrived',
            'trip_started',
            'started',
            'ride_started',
          ].includes(b.status)
        );
        const hasCompleted = cBookings.some((b) =>
          ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status)
        );
        const hasCancelled = cBookings.some((b) =>
          ['cancelled', 'canceled', 'rejected', 'driver_rejected'].includes(b.status)
        );

        if (bookingFilter === 'has_active' && !hasActive) return false;
        if (bookingFilter === 'has_completed' && !hasCompleted) return false;
        if (bookingFilter === 'has_cancelled' && !hasCancelled) return false;
        if (bookingFilter === 'no_bookings' && cBookings.length > 0) return false;
      }

      // 3. Text Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = (c.full_name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const id = (c.id || '').toLowerCase();

        return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
      }

      return true;
    });
  }, [allCustomers, accountStatusFilter, bookingFilter, search, bookings]);

  // Reset Add Form
  const resetAddForm = () => {
    setAddFullName('');
    setAddEmail('');
    setAddPhone('+966 5');
    setAddPassword('AlHarmain@2026');
    setAddAutoPassword(true);
    setAddStatus('active');
    setAddAvatarFile(null);
    setAddAvatarPreview(null);
    setCreatedCredentials(null);
    setHasCopiedCredentials(false);
  };

  // Open Edit Modal with customer data prefilled
  const openEditModal = (customer: Profile) => {
    setSelectedCustomer(customer);
    setEditFullName(customer.full_name || '');
    setEditEmail(customer.email || '');
    setEditPhone(customer.phone || '');
    setEditStatus(customer.status || 'active');
    setEditPassword('');
    setEditAvatarFile(null);
    setEditAvatarPreview(customer.avatar_url || null);
    setEditAvatarRemoved(false);
    setIsEditModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (customer: Profile) => {
    setSelectedCustomer(customer);
    setDetailsBookingFilter('all');
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (customer: Profile) => {
    setSelectedCustomer(customer);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
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

  // Submit Add Customer Form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addFullName.trim() || addFullName.trim().length < 2) {
      toast.error('Please enter the customer\'s full legal name (minimum 2 characters).');
      return;
    }
    if (!addEmail.trim() || !isValidEmail(addEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (!addPhone.trim() || addPhone.trim().length < 7) {
      toast.error('Please provide a valid phone number (minimum 7 digits).');
      return;
    }

    setIsSubmittingAdd(true);

    try {
      let finalAvatarUrl: string | undefined = undefined;

      // 1. Upload avatar to Supabase Storage if file selected
      if (addAvatarFile) {
        toast.loading('Uploading customer profile photo...');
        const uploaded = await uploadCustomerAvatar(addAvatarFile);
        toast.dismiss();
        if (uploaded) {
          finalAvatarUrl = uploaded;
        }
      }

      // 2. Determine password to use
      const passwordToUse = addAutoPassword
        ? 'AlHarmain@' + Math.floor(100000 + Math.random() * 900000)
        : addPassword.trim();

      // 3. Create customer account via server endpoint
      const result = await adminCreateUser({
        role: 'customer',
        full_name: addFullName.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim(),
        password: passwordToUse,
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
        toast.success(`Customer ${addFullName.trim()} successfully registered!`);
      }
    } catch (err: unknown) {
      console.error('Add customer error:', err);
      toast.error('Failed to create customer account.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Submit Edit Customer Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!editFullName.trim() || editFullName.trim().length < 2) {
      toast.error('Please enter the full legal name.');
      return;
    }
    if (!editEmail.trim() || !isValidEmail(editEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 7) {
      toast.error('Please provide a valid phone number.');
      return;
    }

    setIsSubmittingEdit(true);

    try {
      let finalAvatarUrl: string | null | undefined = undefined;

      if (editAvatarFile) {
        toast.loading('Uploading new profile photo...');
        const uploaded = await uploadCustomerAvatar(editAvatarFile, selectedCustomer.id);
        toast.dismiss();
        if (uploaded) finalAvatarUrl = uploaded;
      } else if (editAvatarRemoved) {
        finalAvatarUrl = null;
      }

      const updates: any = {
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim(),
        status: editStatus,
      };

      if (finalAvatarUrl !== undefined) {
        updates.avatar_url = finalAvatarUrl;
      }

      if (editPassword && editPassword.trim().length >= 6) {
        updates.password = editPassword.trim();
      }

      const res = await adminUpdateUser(selectedCustomer.id, updates);
      if (res.success) {
        toast.success(`Customer ${editFullName.trim()} profile updated!`);
        setIsEditModalOpen(false);
        // Refresh selected customer state
        setSelectedCustomer((prev) => (prev ? { ...prev, ...updates } : null));
      }
    } catch (err) {
      console.error('Update customer error:', err);
      toast.error('Failed to update customer profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Quick Toggle Status
  const handleQuickStatusToggle = async (customer: Profile) => {
    await toggleUserStatus(customer.id);
  };

  // Handle Permanent Delete
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const activeTrips = getCustomerActiveTrips(selectedCustomer.id, selectedCustomer.phone);
    if (activeTrips.length > 0) {
      toast.error(
        `Cannot delete ${selectedCustomer.full_name}: ${activeTrips.length} active booking(s) in progress. Please conclude or cancel these trips first.`
      );
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm permanent deletion.');
      return;
    }

    setIsSubmittingDelete(true);
    try {
      const success = await deleteUser(selectedCustomer.id, true);
      if (success) {
        setIsDeleteModalOpen(false);
        setIsDetailsModalOpen(false);
        setSelectedCustomer(null);
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
    const text = `Al Harmain Travels Customer Account Details:\nPortal: https://alharmaintravel.com/sign-in\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nPassword: ${createdCredentials.pass}`;
    navigator.clipboard.writeText(text);
    setHasCopiedCredentials(true);
    toast.success('Customer credentials copied to clipboard!');
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
              Pilgrim Directory
            </span>
          </div>
          <h1 className="type-page-title mt-1">Customer Management &amp; Profiles</h1>
          <p className="text-xs text-secondary mt-0.5">
            Onboard verified pilgrim accounts, manage contact coordinates, audit historical trips, and control account status.
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
            <span>{isRefreshing ? 'Syncing...' : 'Sync Directory'}</span>
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
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI STAT CARDS (5 Cards)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Customers */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-primary font-mono">{totalCustomerCount}</p>
          <span className="text-[10px] text-secondary block">Registered accounts</span>
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
            Authorized to book rides
          </span>
        </div>

        {/* Inactive Accounts */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Inactive Accounts</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {inactiveAccountsCount}
          </p>
          <span className="text-[10px] text-secondary block">Suspended / Deactivated</span>
        </div>

        {/* Total Rides Booked */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Total Bookings</span>
            <Car className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {totalCustomerBookingsCount}
          </p>
          <span className="text-[10px] text-secondary block">Lifetime customer rides</span>
        </div>

        {/* Completed Trips */}
        <div className="p-4 rounded-3xl bg-card border border-base shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted text-[11px] font-medium">
            <span>Completed Trips</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {completedRidesCount}
          </p>
          <span className="text-[10px] text-secondary block">Fulfilled journeys</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH, FILTERS & VIEW MODE CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-base p-4 rounded-3xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input border border-base rounded-2xl pl-10 pr-10 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters & View Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account Status Filter */}
            <div className="flex items-center p-1 rounded-2xl bg-surface border border-base text-xs">
              <button
                type="button"
                onClick={() => setAccountStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  accountStatusFilter === 'all'
                    ? 'bg-card text-primary shadow-sm font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                All Accounts
              </button>
              <button
                type="button"
                onClick={() => setAccountStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  accountStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setAccountStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  accountStatusFilter === 'inactive'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Booking State Filter Dropdown */}
            <div className="relative">
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value as any)}
                className="bg-surface border border-base rounded-2xl px-3.5 py-2 text-xs text-secondary font-medium focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="all">All Booking States</option>
                <option value="has_active">In-Progress Trips</option>
                <option value="has_completed">Completed Trips</option>
                <option value="has_cancelled">Cancelled Trips</option>
                <option value="no_bookings">No Bookings Yet</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Grid / Table Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-surface border border-base">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
                title="Data Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-base">
          <span>
            Showing <strong className="text-primary font-mono">{filteredCustomers.length}</strong> of{' '}
            <strong className="text-primary font-mono">{totalCustomerCount}</strong> registered customers
          </span>
          {(search || accountStatusFilter !== 'all' || bookingFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setAccountStatusFilter('all');
                setBookingFilter('all');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CUSTOMER DIRECTORY: GRID OR TABLE VIEW
      ───────────────────────────────────────────────────────────── */}
      {isDataLoading ? (
        viewMode === 'grid' ? (
          <CardGridSkeleton count={6} heightClass="h-56" />
        ) : (
          <div className="bg-card border border-base rounded-3xl p-6 shadow-xl">
            <table className="w-full text-left text-xs">
              <tbody>
                <TableSkeletonRows rows={6} cols={6} />
              </tbody>
            </table>
          </div>
        )
      ) : filteredCustomers.length === 0 ? (
        <EmptyStateView
          icon={Users}
          title="No customers found"
          description={
            search || accountStatusFilter !== 'all' || bookingFilter !== 'all'
              ? 'No registered customers match your current filter criteria. Try adjusting or clearing your search filters.'
              : 'No customer accounts registered yet. Click "Add New Customer" above to create the first verified pilgrim profile.'
          }
          actionLabel={search || accountStatusFilter !== 'all' || bookingFilter !== 'all' ? 'Reset Filters' : 'Add First Customer'}
          onAction={() => {
            if (search || accountStatusFilter !== 'all' || bookingFilter !== 'all') {
              setSearch('');
              setAccountStatusFilter('all');
              setBookingFilter('all');
            } else {
              resetAddForm();
              setIsAddModalOpen(true);
            }
          }}
        />
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ───────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const customerBookings = getCustomerBookings(customer);
            const totalRides = customerBookings.length;
            const completedRides = customerBookings.filter((b) =>
              ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status)
            ).length;
            const activeTrips = customerBookings.filter((b) =>
              [
                'pending_review',
                'pending_verification',
                'pending',
                'confirmed',
                'driver_assigned',
                'driver_accepted',
                'accepted',
                'driver_arriving',
                'on_the_way',
                'driver_arrived',
                'arrived',
                'trip_started',
                'started',
                'ride_started',
              ].includes(b.status)
            ).length;
            const cancelledRides = customerBookings.filter((b) =>
              ['cancelled', 'canceled', 'rejected', 'driver_rejected'].includes(b.status)
            ).length;

            const isAccountActive = customer.status !== 'deactivated' && customer.status !== 'suspended';

            return (
              <div
                key={customer.id}
                className="bg-card border border-base hover:border-emerald-500/40 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Header: Avatar, Name & Account Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomerAvatar src={customer.avatar_url} name={customer.full_name} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-primary truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {customer.full_name}
                        </h3>
                        <p className="text-[11px] text-muted font-mono truncate" title={customer.id}>
                          ID: {customer.id.slice(0, 12)}...
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        isAccountActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAccountActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {isAccountActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  {/* Contact Coordinates */}
                  <div className="space-y-1.5 bg-surface/50 p-3 rounded-2xl border border-base/60 text-xs">
                    <div className="flex items-center gap-2 text-secondary min-w-0">
                      <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span className="truncate">{customer.email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center justify-between text-secondary">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          {customer.phone || 'No phone registered'}
                        </span>
                      </div>
                      {customer.phone && (
                        <a
                          href={`https://wa.me/${normalizePhone(customer.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Booking Metrics Ribbon */}
                  <div className="grid grid-cols-4 gap-1.5 py-1 text-center border-y border-base/60">
                    <div>
                      <span className="text-[10px] text-muted block">Bookings</span>
                      <strong className="text-xs font-mono font-bold text-primary">{totalRides}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block">Completed</span>
                      <strong className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {completedRides}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block">Active</span>
                      <strong className="text-xs font-mono font-bold text-teal-500">{activeTrips}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block">Cancelled</span>
                      <strong className="text-xs font-mono font-bold text-rose-500">{cancelledRides}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-3 flex items-center justify-between gap-1.5 border-t border-base/60">
                  <button
                    type="button"
                    onClick={() => openDetailsModal(customer)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="View Booking Ledger & Details"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(customer)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Edit Customer Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusToggle(customer)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isAccountActive
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={isAccountActive ? 'Deactivate Customer Account' : 'Reactivate Customer Account'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(customer)}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Delete Customer Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DATA TABLE VIEW ───────────────────────────────────────── */
        <div className="bg-card border border-base rounded-3xl p-6 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-secondary">
            <thead className="bg-surface text-secondary uppercase font-bold text-[10px] border-b border-base">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">ID &amp; Account</th>
                <th className="p-3">Contact Coordinates</th>
                <th className="p-3">Ride Statistics</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {filteredCustomers.map((customer) => {
                const customerBookings = getCustomerBookings(customer);
                const totalRides = customerBookings.length;
                const completedRides = customerBookings.filter((b) =>
                  ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status)
                ).length;
                const activeTrips = customerBookings.filter((b) =>
                  [
                    'pending_review',
                    'pending_verification',
                    'pending',
                    'confirmed',
                    'driver_assigned',
                    'driver_accepted',
                    'accepted',
                    'driver_arriving',
                    'on_the_way',
                    'driver_arrived',
                    'arrived',
                    'trip_started',
                    'started',
                    'ride_started',
                  ].includes(b.status)
                ).length;

                const isAccountActive = customer.status !== 'deactivated' && customer.status !== 'suspended';

                return (
                  <tr key={customer.id} className="hover:bg-surface/50 transition-colors group">
                    {/* Customer Name & Avatar */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar src={customer.avatar_url} name={customer.full_name} size="sm" />
                        <div>
                          <p className="font-bold text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {customer.full_name}
                          </p>
                          <span className="text-[10px] text-muted">
                            Joined {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer ID & Verification */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[11px] text-primary block">{customer.id.slice(0, 16)}...</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Pilgrim
                        </span>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <p className="text-secondary flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted shrink-0" />
                          <span>{customer.email || 'N/A'}</span>
                        </p>
                        <p className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted shrink-0" />
                          <span>{customer.phone || 'N/A'}</span>
                        </p>
                      </div>
                    </td>

                    {/* Ride Statistics */}
                    <td className="p-3">
                      <div className="flex items-center gap-3 text-[11px]">
                        <div>
                          <strong className="text-primary font-mono">{totalRides}</strong>
                          <span className="text-muted block text-[10px]">Total</span>
                        </div>
                        <div>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{completedRides}</strong>
                          <span className="text-muted block text-[10px]">Done</span>
                        </div>
                        {activeTrips > 0 && (
                          <div>
                            <strong className="text-teal-500 font-mono">{activeTrips}</strong>
                            <span className="text-muted block text-[10px]">Active</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAccountActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAccountActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        {isAccountActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(customer)}
                          className="p-1.5 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary transition-colors cursor-pointer"
                          title="View Complete Customer Details & Bookings"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="p-1.5 rounded-xl bg-surface hover:bg-elevated text-secondary hover:text-primary transition-colors cursor-pointer"
                          title="Edit Customer Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-500" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(customer)}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            isAccountActive
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={isAccountActive ? 'Deactivate Customer Account' : 'Reactivate Customer Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(customer)}
                          className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ADD CUSTOMER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div>
                <span className="type-eyebrow text-emerald-600 dark:text-emerald-400">Customer Operations</span>
                <h2 className="type-title text-lg font-bold text-primary mt-0.5">Register New Customer</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAddForm();
                }}
                className="p-2 rounded-2xl bg-surface hover:bg-elevated text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Created Credentials Success Callout */}
            {createdCredentials ? (
              <div className="space-y-5 animate-in zoom-in-95 duration-200">
                <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <strong className="text-sm">Customer Account Created Successfully!</strong>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Provide the pilgrim with their login credentials below so they can access their bookings and track vehicles:
                  </p>

                  <div className="bg-card p-4 rounded-2xl border border-base space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Full Name:</span>
                      <span className="text-primary font-bold">{createdCredentials.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Email:</span>
                      <span className="text-primary font-bold">{createdCredentials.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Phone:</span>
                      <span className="text-primary font-bold">{createdCredentials.phone}</span>
                    </div>
                    <div className="flex justify-between border-t border-base pt-2">
                      <span className="text-muted font-sans">Temporary Password:</span>
                      <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                        {createdCredentials.pass}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    {hasCopiedCredentials ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{hasCopiedCredentials ? 'Credentials Copied!' : 'Copy Credentials to Clipboard'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetAddForm();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-surface hover:bg-elevated border border-base text-primary font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Add Form */
              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Profile Image Upload */}
                <div className="flex items-center gap-4 bg-surface/50 p-4 rounded-2xl border border-base">
                  <CustomerAvatar src={addAvatarPreview} name={addFullName || 'New'} size="lg" />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary block">Profile Photo (Optional)</label>
                    <p className="text-[10px] text-secondary">Upload a clear photo for verified customer identification (max 5MB).</p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="file"
                        ref={addFileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAddAvatarSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-card hover:bg-elevated border border-base text-primary text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Choose Photo</span>
                      </button>
                      {addAvatarPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddAvatarFile(null);
                            setAddAvatarPreview(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mansoor Al-Harbi"
                    value={addFullName}
                    onChange={(e) => setAddFullName(e.target.value)}
                    className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Address & Phone Number Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="pilgrim@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary">
                      Phone (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+966 50 123 4567"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Password Configuration */}
                <div className="space-y-2 bg-surface/50 p-4 rounded-2xl border border-base">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Account Password</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary">
                      <input
                        type="checkbox"
                        checked={addAutoPassword}
                        onChange={(e) => setAddAutoPassword(e.target.checked)}
                        className="rounded accent-emerald-600"
                      />
                      <span>Auto-generate secure temporary password</span>
                    </label>
                  </div>

                  {!addAutoPassword && (
                    <input
                      type="text"
                      placeholder="Enter custom password (min 6 chars)"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="w-full bg-input border border-base rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Account Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Initial Account Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as UserStatus)}
                    className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="active">Active (Able to book rides immediately)</option>
                    <option value="deactivated">Deactivated (Account suspended from booking)</option>
                  </select>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-base">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetAddForm();
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    {isSubmittingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingAdd ? 'Creating...' : 'Confirm Registration'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: VIEW COMPLETE DETAILS & BOOKING HISTORY LEDGER
      ───────────────────────────────────────────────────────────── */}
      {isDetailsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-base pb-4">
              <div className="flex items-center gap-4">
                <CustomerAvatar src={selectedCustomer.avatar_url} name={selectedCustomer.full_name} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="type-title text-lg font-bold text-primary">{selectedCustomer.full_name}</h2>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedCustomer.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {selectedCustomer.status === 'active' ? 'Active Account' : 'Deactivated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-muted" />
                      ID: {selectedCustomer.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCustomer.id);
                        toast.success('Customer ID copied');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-sans text-[11px]"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 rounded-2xl bg-surface hover:bg-elevated text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Contact & Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface/50 p-4 rounded-3xl border border-base">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted font-bold uppercase block">Email Address</span>
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="text-xs text-primary font-medium hover:text-emerald-500 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{selectedCustomer.email || 'N/A'}</span>
                </a>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-muted font-bold uppercase block">Phone / WhatsApp</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedCustomer.phone || 'N/A'}</span>
                  </a>
                  {selectedCustomer.phone && (
                    <a
                      href={`https://wa.me/${normalizePhone(selectedCustomer.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-muted font-bold uppercase block">Member Since</span>
                <span className="text-xs text-secondary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                  <span>
                    {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </span>
              </div>
            </div>

            {/* Lifetime Metrics Grid */}
            {(() => {
              const custBookings = getCustomerBookings(selectedCustomer);
              const totalB = custBookings.length;
              const completedB = custBookings.filter((b) =>
                ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status)
              ).length;
              const activeB = custBookings.filter((b) =>
                [
                  'pending_review',
                  'pending_verification',
                  'pending',
                  'confirmed',
                  'driver_assigned',
                  'driver_accepted',
                  'accepted',
                  'driver_arriving',
                  'on_the_way',
                  'driver_arrived',
                  'arrived',
                  'trip_started',
                  'started',
                  'ride_started',
                ].includes(b.status)
              ).length;
              const cancelledB = custBookings.filter((b) =>
                ['cancelled', 'canceled', 'rejected', 'driver_rejected'].includes(b.status)
              ).length;

              const totalSpent = custBookings
                .filter((b) => ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status))
                .reduce((sum, b) => sum + Number(b.final_fare ?? b.confirmed_fare ?? b.fixed_fare_amount ?? 0), 0);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 bg-surface rounded-2xl border border-base text-center">
                    <span className="text-[10px] text-muted uppercase font-bold block">Total Bookings</span>
                    <strong className="text-lg font-mono text-primary font-bold">{totalB}</strong>
                  </div>
                  <div className="p-3 bg-surface rounded-2xl border border-base text-center">
                    <span className="text-[10px] text-muted uppercase font-bold block">Completed</span>
                    <strong className="text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {completedB}
                    </strong>
                  </div>
                  <div className="p-3 bg-surface rounded-2xl border border-base text-center">
                    <span className="text-[10px] text-muted uppercase font-bold block">In Progress</span>
                    <strong className="text-lg font-mono text-teal-500 font-bold">{activeB}</strong>
                  </div>
                  <div className="p-3 bg-surface rounded-2xl border border-base text-center">
                    <span className="text-[10px] text-muted uppercase font-bold block">Cancelled</span>
                    <strong className="text-lg font-mono text-rose-500 font-bold">{cancelledB}</strong>
                  </div>
                  <div className="p-3 bg-surface rounded-2xl border border-base text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted uppercase font-bold block">Total Spent</span>
                    <strong className="text-base font-mono text-amber-500 font-bold">
                      {formatCurrency(totalSpent)}
                    </strong>
                  </div>
                </div>
              );
            })()}

            {/* ── BOOKING HISTORY SECTION ───────────────────────────────── */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base pb-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-sm text-primary">Booking History &amp; Trip Ledger</h3>
                </div>

                {/* Sub filter */}
                <div className="flex items-center p-0.5 rounded-xl bg-surface border border-base text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDetailsBookingFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      detailsBookingFilter === 'all'
                        ? 'bg-card text-primary font-bold shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsBookingFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      detailsBookingFilter === 'active'
                        ? 'bg-teal-600 text-white font-bold shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsBookingFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      detailsBookingFilter === 'completed'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsBookingFilter('cancelled')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      detailsBookingFilter === 'cancelled'
                        ? 'bg-rose-600 text-white font-bold shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              {/* Bookings List */}
              {(() => {
                const allCustBookings = getCustomerBookings(selectedCustomer);
                const filteredBookings = allCustBookings.filter((b) => {
                  if (detailsBookingFilter === 'active') {
                    return [
                      'pending_review',
                      'pending_verification',
                      'pending',
                      'confirmed',
                      'driver_assigned',
                      'driver_accepted',
                      'accepted',
                      'driver_arriving',
                      'on_the_way',
                      'driver_arrived',
                      'arrived',
                      'trip_started',
                      'started',
                      'ride_started',
                    ].includes(b.status);
                  }
                  if (detailsBookingFilter === 'completed') {
                    return ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status);
                  }
                  if (detailsBookingFilter === 'cancelled') {
                    return ['cancelled', 'canceled', 'rejected', 'driver_rejected'].includes(b.status);
                  }
                  return true;
                });

                if (filteredBookings.length === 0) {
                  return (
                    <div className="p-8 text-center bg-surface/30 border border-base rounded-3xl space-y-2">
                      <Calendar className="w-8 h-8 text-muted mx-auto" />
                      <p className="text-xs font-bold text-primary">No bookings found</p>
                      <p className="text-[11px] text-secondary">
                        {detailsBookingFilter === 'all'
                          ? 'This customer has not created any bookings yet.'
                          : `No bookings found matching filter "${detailsBookingFilter}".`}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {filteredBookings.map((b) => {
                      const driverInfo = getBookingDriverInfo(b);
                      const fare = b.final_fare ?? b.confirmed_fare ?? b.fixed_fare_amount ?? b.estimated_fare;

                      return (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl bg-surface/50 border border-base hover:border-emerald-500/40 transition-all space-y-3"
                        >
                          {/* Row 1: Ref, Time, Status Badges */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-primary">
                                {b.booking_reference}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface text-secondary border border-base">
                                {b.booking_method === 'custom' ? 'Custom Route' : 'Fixed Fare'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Payment Verification Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  b.payment_status === 'paid' || b.status === 'payment_verified' || b.status === 'payment_completed'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : b.payment_status === 'failed' || b.status === 'payment_rejected'
                                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                }`}
                              >
                                Payment: {b.status === 'payment_verified' ? 'Verified' : (b.payment_status || 'Pending')}
                              </span>

                              {/* Trip Progress Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ['trip_completed', 'completed', 'payment_completed', 'ride_completed'].includes(b.status)
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : ['cancelled', 'canceled', 'rejected'].includes(b.status)
                                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                    : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                }`}
                              >
                                {b.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Route Coordinates */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted uppercase font-bold block">Pickup</span>
                                <span className="text-primary truncate block" title={b.pickup_address}>
                                  {b.pickup_address}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted uppercase font-bold block">Destination</span>
                                <span className="text-primary truncate block" title={b.destination_address}>
                                  {b.destination_address}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Assigned Driver, Vehicle, Fare & Payment Proof */}
                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-base/60 text-xs flex-wrap">
                            {/* Assigned Captain */}
                            <div className="flex items-center gap-2">
                              <Car className="w-3.5 h-3.5 text-muted shrink-0" />
                              {driverInfo ? (
                                <span className="text-secondary">
                                  Captain:{' '}
                                  <strong className="text-primary">{driverInfo.name}</strong>
                                  {driverInfo.vehicle && (
                                    <span className="text-muted ml-1 font-mono">
                                      ({driverInfo.vehicle.make} • {driverInfo.vehicle.plate_number})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-amber-500 italic">Awaiting driver assignment</span>
                              )}
                            </div>

                            {/* Payment screenshot thumbnail & Fare */}
                            <div className="flex items-center gap-3">
                              {b.payment_screenshot_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(b.payment_screenshot_url || null)}
                                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View Receipt</span>
                                </button>
                              )}

                              <div className="text-right">
                                <span className="text-muted text-[10px] block">Fare:</span>
                                <strong className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                                  {fare !== null && fare !== undefined ? formatCurrency(fare) : 'Pending Review'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 flex items-center justify-between gap-2.5 border-t border-base flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    openEditModal(selectedCustomer);
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-surface hover:bg-elevated border border-base text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-500" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleQuickStatusToggle(selectedCustomer);
                    setSelectedCustomer((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: prev.status === 'active' ? 'deactivated' : 'active',
                          }
                        : null
                    );
                  }}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedCustomer.status === 'active'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{selectedCustomer.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    openDeleteModal(selectedCustomer);
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-colors cursor-pointer"
                >
                  Delete Customer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedCustomer(null);
                  }}
                  className="px-4 py-2 rounded-2xl bg-card hover:bg-elevated border border-base text-secondary hover:text-primary text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: EDIT CUSTOMER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div>
                <span className="type-eyebrow text-teal-600 dark:text-teal-400">Account Operations</span>
                <h2 className="type-title text-lg font-bold text-primary mt-0.5">Edit Customer Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 rounded-2xl bg-surface hover:bg-elevated text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Profile Photo Upload / Replace / Remove */}
              <div className="flex items-center gap-4 bg-surface/50 p-4 rounded-2xl border border-base">
                <CustomerAvatar src={editAvatarPreview} name={editFullName} size="lg" />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Profile Photo</label>
                  <p className="text-[10px] text-secondary">Upload, replace, or remove customer avatar photo.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditAvatarSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-card hover:bg-elevated border border-base text-primary text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{editAvatarPreview ? 'Replace' : 'Upload Photo'}</span>
                    </button>
                    {editAvatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAvatarFile(null);
                          setEditAvatarPreview(null);
                          setEditAvatarRemoved(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Account Status Switcher */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full bg-input border border-base rounded-2xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="active">Active (Permitted to create and manage bookings)</option>
                  <option value="deactivated">Deactivated (Suspended from creating new bookings)</option>
                  <option value="suspended">Suspended (Restricted access)</option>
                </select>
              </div>

              {/* Optional Password Reset */}
              <div className="space-y-1 bg-surface/50 p-3.5 rounded-2xl border border-base">
                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Reset Password (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to preserve current password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-base">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedCustomer(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {isSubmittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: PERMANENT DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="type-title text-base font-bold text-primary">Permanent Account Deletion</h2>
                <p className="text-xs text-secondary mt-0.5">Customer: {selectedCustomer.full_name}</p>
              </div>
            </div>

            {/* Active Trips Safety Check */}
            {(() => {
              const activeTrips = getCustomerActiveTrips(selectedCustomer.id, selectedCustomer.phone);
              if (activeTrips.length > 0) {
                return (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                    <strong className="block font-bold">Action Blocked: Active Trips in Progress</strong>
                    <p className="leading-relaxed">
                      This customer currently has <strong>{activeTrips.length} active in-progress booking(s)</strong>.
                      To protect passenger safety and service operations, accounts with active trips cannot be deleted.
                    </p>
                    <div className="font-mono text-[11px] bg-card p-2 rounded-xl border border-base">
                      {activeTrips.map((t) => t.booking_reference).join(', ')}
                    </div>
                    <p className="text-[11px] opacity-80">
                      Please conclude or cancel these bookings in the Ride Queue before attempting deletion.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-surface border border-base text-xs text-secondary space-y-2 leading-relaxed">
                    <p>
                      Are you sure you want to permanently delete the account for{' '}
                      <strong className="text-primary">{selectedCustomer.full_name}</strong>?
                    </p>
                    <p className="text-[11px] text-muted">
                      • Historical trip records, verified payments, driver ratings, and financial audit logs will remain{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">securely preserved</strong> for bookkeeping.
                    </p>
                    <p className="text-[11px] text-muted">
                      • The customer will no longer be able to sign in or make new bookings.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-secondary">
                      Type <strong className="text-rose-500 font-mono">DELETE</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full bg-input border border-rose-500/40 rounded-2xl px-3.5 py-2.5 text-xs text-primary font-mono uppercase focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Modal Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-base">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2.5 rounded-2xl bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deleteConfirmText.trim().toUpperCase() !== 'DELETE' ||
                  getCustomerActiveTrips(selectedCustomer.id, selectedCustomer.phone).length > 0 ||
                  isSubmittingDelete
                }
                onClick={handleDeleteSubmit}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmittingDelete ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: PAYMENT RECEIPT IMAGE PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full max-h-[85vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-surface hover:bg-elevated text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Payment receipt proof"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-base shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
