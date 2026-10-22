'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import {
  resolveDriverVehicle,
  formatDriverRating,
  calculateDriverRating,
  calculateDriverCompletedRides,
} from '@/lib/driver-stats';
import {
  Car,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Save,
  Camera,
  Trash2,
  Star,
  Calendar,
  Globe,
  AlertCircle,
  Clock,
  Check,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  FileText,
  BadgeCheck,
  AlertTriangle,
  Award,
  Users,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

type ActiveTab = 'personal' | 'vehicle' | 'security' | 'performance';

export default function DriverProfilePage() {
  const {
    currentUser,
    userRole,
    drivers,
    vehicles,
    rateVehicles,
    bookings,
    ratings,
    updateUserProfile,
    uploadAvatar,
    changePassword,
    refreshData,
    isDataLoading,
  } = useApp();

  const { language, setLanguage, dir, isRTL, t } = useLanguage();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('personal');

  // Direct Supabase driver data state for instant sync
  const [directDriverData, setDirectDriverData] = useState<any | null>(null);
  const [isSyncingVehicle, setIsSyncingVehicle] = useState(false);

  // Identify driver record
  const currentDriver = useMemo(() => {
    const fromContext =
      drivers.find((d) => d.id === currentUser.id || d.profile?.id === currentUser.id) ||
      (userRole === 'admin' ? drivers[0] : undefined);
    if (fromContext && directDriverData) {
      return { ...fromContext, ...directDriverData };
    }
    return fromContext || directDriverData;
  }, [drivers, currentUser.id, userRole, directDriverData]);

  const effectiveDriverId = currentDriver?.id || currentUser.id;

  // Fetch driver record directly from Supabase on mount to ensure immediate real data
  useEffect(() => {
    let isMounted = true;
    async function loadDriverDirectly() {
      if (!currentUser?.id) return;
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*, assigned_vehicle:rate_vehicle_types(*)')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!error && data && isMounted) {
          setDirectDriverData(data);
        }
      } catch (err) {
        console.warn('Direct driver query warning:', err);
      }
    }
    loadDriverDirectly();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Form State: Personal Details
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [phone, setPhone] = useState(currentUser.phone || currentDriver?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser.date_of_birth || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    (currentUser.gender as 'male' | 'female' | 'other') || 'male'
  );

  // Form Validation & Status Messages
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Detect whether personal details have been modified (dirty state)
  const isProfileDirty = useMemo(() => {
    const origName = currentUser.full_name || '';
    const origPhone = currentUser.phone || currentDriver?.phone || '';
    const origDob = currentUser.date_of_birth || '';
    const origGender = currentUser.gender || 'male';

    return (
      fullName !== origName ||
      phone !== origPhone ||
      dateOfBirth !== origDob ||
      gender !== origGender
    );
  }, [fullName, phone, dateOfBirth, gender, currentUser, currentDriver]);

  // Sync state when currentUser updates
  useEffect(() => {
    if (currentUser?.full_name) {
      setFullName(currentUser.full_name);
    }
    if (currentUser?.phone || currentDriver?.phone) {
      setPhone(currentUser.phone || currentDriver?.phone || '');
    }
    if (currentUser?.date_of_birth) {
      setDateOfBirth(currentUser.date_of_birth);
    }
    if (currentUser?.gender) {
      setGender(currentUser.gender as 'male' | 'female' | 'other');
    }
  }, [currentUser, currentDriver]);

  // Avatar Management State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordConfirmModalOpen, setIsPasswordConfirmModalOpen] = useState(false);

  // Dedicated Phone Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [modalPhoneNumber, setModalPhoneNumber] = useState('');
  const [modalPhoneError, setModalPhoneError] = useState<string | null>(null);
  const [isUpdatingModalPhone, setIsUpdatingModalPhone] = useState(false);

  // Real statistics derived from database
  const completedRidesCount = useMemo(() => {
    return calculateDriverCompletedRides(bookings, effectiveDriverId);
  }, [bookings, effectiveDriverId]);

  const ratingStats = useMemo(() => {
    const rawStats = calculateDriverRating(ratings, effectiveDriverId);
    return formatDriverRating(rawStats.rating, rawStats.count);
  }, [ratings, effectiveDriverId]);

  const driverFeedbackList = useMemo(() => {
    return ratings.filter((r) => r.driver_id === effectiveDriverId);
  }, [ratings, effectiveDriverId]);

  // Resolved vehicle details (synchronized with dispatcher updates)
  const assignedVehicle = useMemo(() => {
    const vehId = currentDriver?.assigned_vehicle_id;
    return (
      resolveDriverVehicle(vehId, rateVehicles, vehicles) ||
      currentDriver?.assigned_vehicle ||
      currentDriver?.vehicle ||
      null
    );
  }, [currentDriver?.assigned_vehicle_id, currentDriver?.assigned_vehicle, currentDriver?.vehicle, rateVehicles, vehicles]);

  // Status dot color
  const statusBadge = useMemo(() => {
    const status = (currentDriver?.status || 'available').toLowerCase();
    switch (status) {
      case 'available':
        return { label: isRTL ? 'متاح ومستعد للخدمة' : 'Available on Duty', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' };
      case 'on_trip':
        return { label: isRTL ? 'في مسار رحلة' : 'On Active Trip', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30', dot: 'bg-purple-500' };
      case 'assigned':
        return { label: isRTL ? 'معين بمهمة' : 'Assigned to Mission', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', dot: 'bg-amber-500' };
      case 'offline':
        return { label: isRTL ? 'خارج أوقات الخدمة' : 'Offline / Off Duty', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30', dot: 'bg-rose-500' };
      default:
        return { label: status.toUpperCase(), color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' };
    }
  }, [currentDriver?.status, isRTL]);

  // Manual Vehicle Sync Handler
  const handleSyncVehicle = async () => {
    setIsSyncingVehicle(true);
    try {
      await refreshData();
      if (currentUser?.id) {
        const { data: latestDriver } = await supabase
          .from('drivers')
          .select('*, assigned_vehicle:rate_vehicle_types(*)')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (latestDriver) {
          setDirectDriverData(latestDriver);
        }
      }
      toast.success(isRTL ? 'تمت مزامنة بيانات المركبة المعينة بنجاح' : 'Assigned vehicle synchronized with live dispatch fleet.');
    } catch (err) {
      console.error('Vehicle sync error:', err);
      toast.error(isRTL ? 'فشلت المزامنة، يرجى المحاولة لاحقاً' : 'Failed to synchronize vehicle data.');
    } finally {
      setIsSyncingVehicle(false);
    }
  };

  // Handle Personal Details Save
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSuccessMsg(null);

    const errors: { fullName?: string; phone?: string } = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.fullName = isRTL ? 'يرجى إدخال اسم قانوني صالح (3 أحرف على الأقل).' : 'Please enter a valid legal name (at least 3 characters).';
    }

    if (phone.trim() && phone.trim().replace(/[^0-9]/g, '').length < 8) {
      errors.phone = isRTL ? 'يرجى إدخال رقم هاتف صالح مع رمز الدولة.' : 'Please enter a valid phone number with country code.';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsSavingProfile(true);
    try {
      const success = await updateUserProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        date_of_birth: dateOfBirth || null,
        gender,
        preferred_language: language,
      });

      if (success) {
        setProfileSuccessMsg(isRTL ? 'تم حفظ التعديلات بنجاح في قاعدة البيانات.' : 'Chauffeur profile updated and saved to Supabase successfully.');
        setTimeout(() => setProfileSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error(isRTL ? 'حدث خطأ أثناء حفظ الملف الشخصي.' : 'Error saving profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Revert Personal Details Form Changes
  const handleCancelPersonalInfo = () => {
    setFullName(currentUser.full_name || '');
    setPhone(currentUser.phone || currentDriver?.phone || '');
    setDateOfBirth(currentUser.date_of_birth || '');
    setGender((currentUser.gender as 'male' | 'female' | 'other') || 'male');
    setProfileErrors({});
    setProfileSuccessMsg(null);
  };

  // Photo Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      toast.error(isRTL ? 'يرجى اختيار صورة بتنسيق JPEG أو PNG أو WebP.' : 'Please choose a valid JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الصورة يتجاوز الحد الأقصى 5 ميجابايت.' : 'Image size must be less than 5MB.');
      return;
    }

    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewPhotoUrl(objectUrl);
    setIsPhotoPreviewOpen(true);
    // Reset file input value
    e.target.value = '';
  };

  // Confirm Photo Upload
  const handleConfirmPhotoUpload = async () => {
    if (!pendingFile) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadAvatar(pendingFile);
      if (url) {
        setIsPhotoPreviewOpen(false);
        setPendingFile(null);
        setPreviewPhotoUrl(null);
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    if (confirm(isRTL ? 'هل أنت متأكد من رغبتك في إزالة صورتك الشخصية؟' : 'Are you sure you want to remove your profile photo?')) {
      await updateUserProfile({ avatar_url: null });
      toast.success(isRTL ? 'تمت إزالة الصورة الشخصية بنجاح.' : 'Profile photo removed.');
    }
  };

  // Handle Dedicated Phone Change Modal Submit
  const handleSaveModalPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalPhoneError(null);

    const clean = modalPhoneNumber.trim().replace(/[^0-9]/g, '');
    if (clean.length < 8) {
      setModalPhoneError(isRTL ? 'يرجى إدخال رقم هاتف صالح مكون من 8 أرقام على الأقل.' : 'Please enter a valid phone number (at least 8 digits).');
      return;
    }

    setIsUpdatingModalPhone(true);
    try {
      const success = await updateUserProfile({ phone: modalPhoneNumber.trim() });
      if (success) {
        setPhone(modalPhoneNumber.trim());
        setIsPhoneModalOpen(false);
        toast.success(isRTL ? 'تم تحديث رقم الهاتف بنجاح.' : 'Phone number updated successfully.');
      }
    } finally {
      setIsUpdatingModalPhone(false);
    }
  };

  // Open Dedicated Phone Modal
  const openPhoneModal = () => {
    setModalPhoneNumber(phone || currentUser.phone || '');
    setModalPhoneError(null);
    setIsPhoneModalOpen(true);
  };

  // Password Requirements Checker
  const passwordRules = useMemo(() => {
    return {
      hasLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      isMatching: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid =
    passwordRules.hasLength &&
    passwordRules.hasUpper &&
    passwordRules.hasLower &&
    passwordRules.hasNumber &&
    passwordRules.isMatching;

  // Initial Submit of Password Form -> triggers Confirmation Modal
  const handlePasswordFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccessMsg(null);

    if (!currentPassword) {
      setPasswordError(isRTL ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.');
      return;
    }

    if (!passwordRules.hasLength) {
      setPasswordError(isRTL ? 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.' : 'New password must be at least 8 characters long.');
      return;
    }

    if (!passwordRules.hasUpper || !passwordRules.hasLower || !passwordRules.hasNumber) {
      setPasswordError(isRTL ? 'يجب أن تحتوي كلمة المرور على أحرف كبيرة وصغيرة وأرقام.' : 'Password must contain uppercase letters, lowercase letters, and numbers.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(isRTL ? 'كلمات المرور الجديدة غير متطابقة.' : 'New passwords do not match.');
      return;
    }

    // Open confirmation modal
    setIsPasswordConfirmModalOpen(true);
  };

  // Confirmed Password Change via Supabase Auth
  const handleExecutePasswordChange = async () => {
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccessMsg(null);

    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setIsPasswordConfirmModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccessMsg(
          isRTL
            ? 'تم تحديث كلمة المرور بنجاح وتوثيقها في Supabase Auth.'
            : 'Password updated successfully and confirmed via Supabase Auth.'
        );
        setTimeout(() => setPasswordSuccessMsg(null), 6000);
      } else {
        setIsPasswordConfirmModalOpen(false);
        setPasswordError(res.error || (isRTL ? 'فشل تحديث كلمة المرور.' : 'Failed to update password.'));
      }
    } catch (err: unknown) {
      setIsPasswordConfirmModalOpen(false);
      const msg = err instanceof Error ? err.message : 'An error occurred during password update.';
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const driverDisplayName =
    fullName ||
    currentDriver?.profile?.full_name ||
    currentDriver?.full_name ||
    currentUser.full_name ||
    (isRTL ? 'كابتن السائق' : 'Captain Driver');

  const avatarDisplayUrl = currentUser.avatar_url || currentDriver?.avatar_url || '';

  return (
    <div className="page-shell space-y-5 animate-fade-up">
      {/* ─────────────────────────────────────────────────────────────
          1. CHAUFFEUR HEADER PROFILE BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-base p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle background luxury glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
          {/* Avatar with Camera Overlay & Upload Button */}
          <div className="relative group shrink-0">
            {avatarDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDisplayUrl}
                alt={driverDisplayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 text-amber-400 font-bold text-2xl sm:text-3xl flex items-center justify-center border-2 border-emerald-500/50 shadow-lg">
                {driverDisplayName.charAt(0)?.toUpperCase() || 'C'}
              </div>
            )}

            {/* Camera Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute -bottom-1 ${
                isRTL ? '-left-1' : '-right-1'
              } p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all duration-200 group-hover:scale-110 cursor-pointer`}
              title={isRTL ? 'تغيير الصورة الشخصية' : 'Change Profile Photo'}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </div>

          {/* Captain Identifiers & Status Badges */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-primary">{driverDisplayName}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{isRTL ? 'كابتن معتمد — الهيئة العامة للنقل' : 'MOT Certified Chauffeur'}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-mono text-secondary">{currentUser.email || (isRTL ? 'كابتن موثق' : 'Verified Captain')}</span>
              </span>
              <span className="hidden sm:inline text-muted">•</span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-secondary">{phone || (isRTL ? 'لم يُسجل هاتف' : 'No phone set')}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                <span>{statusBadge.label}</span>
              </span>

              {assignedVehicle && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-base text-secondary">
                  <Car className="w-3 h-3 text-emerald-500" />
                  <span>{assignedVehicle.plate_number || assignedVehicle.license_plate || 'VIP KSA'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Badges & ID */}
        <div className="flex flex-row md:flex-col items-start md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-base">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-base text-xs font-semibold text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono">
              {isRTL ? 'معرّف الكابتن' : 'Chauffeur ID'}: #{effectiveDriverId.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {avatarDisplayUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[11px] text-rose-500 hover:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isRTL ? 'إزالة الصورة' : 'Remove photo'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncVehicle}
              disabled={isSyncingVehicle}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
              title={isRTL ? 'تحديث ومزامنة المركبة المعينة من المشرف' : 'Sync assigned vehicle from dispatcher'}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingVehicle ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'مزامنة المركبة' : 'Sync Fleet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LUXURY DASHBOARD TABS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-base overflow-x-auto pb-1.5 text-xs font-semibold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 text-xs ${
            activeTab === 'personal'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20'
              : 'bg-card text-secondary hover:text-primary hover:bg-elevated border border-base'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isRTL ? 'البيانات الشخصية' : 'Personal Profile'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vehicle')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 text-xs ${
            activeTab === 'vehicle'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20'
              : 'bg-card text-secondary hover:text-primary hover:bg-elevated border border-base'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>{isRTL ? 'المركبة المعينة والاعتمادات' : 'Assigned Vehicle & MOT'}</span>
          {assignedVehicle && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 text-xs ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20'
              : 'bg-card text-secondary hover:text-primary hover:bg-elevated border border-base'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{isRTL ? 'الأمان وتغيير كلمة المرور' : 'Security & Password'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 text-xs ${
            activeTab === 'performance'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20'
              : 'bg-card text-secondary hover:text-primary hover:bg-elevated border border-base'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>{isRTL ? 'تقييم الحجاج والأداء' : 'Safety & Performance'}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PERSONAL PROFILE (Editable Details, Language, Email)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Account Badges & Language Preferences */}
          <div className="lg:col-span-4 space-y-4">
            {/* Verification Status Card */}
            <div className="surface-card p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isRTL ? 'شارات التحقق والاعتماد' : 'Verification Credentials'}</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Official Chauffeur ID */}
                <div className="p-3 rounded-xl bg-surface border border-base space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-semibold flex items-center gap-1.5 text-[11px]">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {isRTL ? 'سجل السائق المعتمد' : 'Chauffeur Registry'}
                    </span>
                    <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isRTL ? 'معتمد' : 'Verified'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted">
                    {currentDriver?.license_number ? `MOT Lic: ${currentDriver.license_number}` : 'TGA Authorized Driver'}
                  </p>
                </div>

                {/* Email Verification Card (Read-Only) */}
                <div className="p-3 rounded-xl bg-surface border border-base space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-semibold flex items-center gap-1.5 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-emerald-500" />
                      {isRTL ? 'البريد الإلكتروني المعتمد' : 'Official Login Email'}
                    </span>
                    <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      {isRTL ? 'مقفول' : 'Locked'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-primary truncate">{currentUser.email || 'Verified Account'}</p>
                </div>

                {/* Phone Quick Status */}
                <div className="p-3 rounded-xl bg-surface border border-base space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-semibold flex items-center gap-1.5 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      {isRTL ? 'هاتف التواصل المباشر' : 'Dispatch Phone'}
                    </span>
                    <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isRTL ? 'نشط' : 'Active'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted">
                    {phone || (isRTL ? 'لم يُسجل رقم هاتف' : 'None recorded')}
                  </p>
                  <button
                    type="button"
                    onClick={openPhoneModal}
                    className="w-full py-1.5 px-3 rounded-xl bg-card hover:bg-elevated border border-base text-amber-600 dark:text-amber-400 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{isRTL ? 'تعديل رقم الهاتف' : 'Change Phone Number'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Language Preference Card */}
            <div className="surface-card p-5 rounded-2xl space-y-3.5 text-xs">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-500" />
                <span>{isRTL ? 'لغة التطبيق والتواصل' : 'Preferred Language'}</span>
              </h3>
              <p className="text-[11px] text-muted leading-relaxed">
                {isRTL
                  ? 'اللغة المستخدمة في واجهة لوحة تحكم الكابتن والتنبيهات المباشرة:'
                  : 'Operating language for Captain Cockpit, live alerts, and client interaction:'}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'en', label: 'English', native: 'English' },
                  { id: 'ar', label: 'العربية', native: 'العربية' },
                ].map((l) => {
                  const isSelected = language === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={async () => {
                        await setLanguage(l.id);
                        await updateUserProfile({ preferred_language: l.id });
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-surface border-base text-secondary hover:bg-elevated hover:border-emerald-500/30'
                      }`}
                    >
                      <span>{l.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Personal Information Form */}
          <div className="lg:col-span-8 surface-card p-5 sm:p-6 space-y-5 rounded-2xl">
            <div className="border-b border-base pb-3.5">
              <h2 className="text-base font-bold text-primary">{isRTL ? 'تعديل البيانات الشخصية للكابتن' : 'Edit Personal Details'}</h2>
              <p className="text-xs text-muted mt-0.5">
                {isRTL
                  ? 'تأكد من دقة اسمك ورقم هاتفك لتسهيل التواصل مع مشرفي الحركة والحجاج المسافرين.'
                  : 'Keep your chauffeur identity accurate for airport security clearance and passenger coordination.'}
              </p>
            </div>

            {/* In-form Success Alert */}
            {profileSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{profileSuccessMsg}</span>
                <button
                  type="button"
                  onClick={() => setProfileSuccessMsg(null)}
                  className="p-1 text-emerald-700 dark:text-emerald-300 hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* In-form Error Alert */}
            {Object.keys(profileErrors).length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  {Object.values(profileErrors).map((msg, i) => (
                    <p key={i} className="font-medium">
                      {msg}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSavePersonalInfo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legal Full Name */}
                <div>
                  <label className="type-label">{isRTL ? 'الاسم القانوني الكامل للكابتن *' : 'Full Legal Name *'}</label>
                  <div className="relative">
                    <User className={`w-3.5 h-3.5 text-muted absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (profileErrors.fullName) {
                          setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                        }
                      }}
                      className={`field-input ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} h-9 py-1.5 text-xs rounded-xl ${
                        profileErrors.fullName ? 'border-rose-500 ring-1 ring-rose-500/30' : ''
                      }`}
                      placeholder={isRTL ? 'مثال: طارق المنصور' : 'e.g. Captain Tariq Al-Mansoor'}
                    />
                  </div>
                  {profileErrors.fullName && (
                    <span className="text-[10px] text-rose-500 mt-1 block">{profileErrors.fullName}</span>
                  )}
                </div>

                {/* Primary Email Address (Readonly & Protected) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="type-label !mb-0">{isRTL ? 'البريد الإلكتروني المعتمد' : 'Primary Login Email'}</label>
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      {isRTL ? 'محمي ومعتمد' : 'Verified & Locked'}
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className={`w-3.5 h-3.5 text-muted absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                    <input
                      type="email"
                      disabled
                      value={currentUser.email || ''}
                      className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 h-9 rounded-xl bg-surface border border-base text-muted cursor-not-allowed text-xs font-mono`}
                    />
                  </div>
                  <span className="text-[10px] text-muted mt-1 block">
                    {isRTL
                      ? 'البريد الإلكتروني مرتبط بتسجيل الدخول الرسمي وتعديله يتطلب موافقة إدارة الأسطول.'
                      : 'Managed by Fleet Administration. Contact support to update official registered email.'}
                  </span>
                </div>
              </div>

              {/* Phone & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Phone */}
                <div>
                  <label className="type-label">{isRTL ? 'رقم هاتف التواصل والعمليات *' : 'Contact Phone Number *'}</label>
                  <div className="relative">
                    <Phone className={`w-3.5 h-3.5 text-muted absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (profileErrors.phone) {
                          setProfileErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      className={`field-input font-mono ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} h-9 py-1.5 text-xs rounded-xl ${
                        profileErrors.phone ? 'border-rose-500 ring-1 ring-rose-500/30' : ''
                      }`}
                      placeholder="+966 50 123 4567"
                    />
                  </div>
                  {profileErrors.phone ? (
                    <span className="text-[10px] text-rose-500 mt-1 block">{profileErrors.phone}</span>
                  ) : (
                    <span className="text-[10px] text-muted mt-1 block">
                      {isRTL ? 'يُستخدم للتواصل المباشر مع الحجاج ومسؤولي الترحيل.' : 'Used for automated dispatch calls and WhatsApp coordination.'}
                    </span>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="type-label">{isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
                  <div className="relative">
                    <Calendar className={`w-3.5 h-3.5 text-muted absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={`field-input ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} h-9 py-1.5 text-xs rounded-xl`}
                    />
                  </div>
                </div>
              </div>

              {/* Gender Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="type-label">{isRTL ? 'الجنس' : 'Gender'}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="field-input h-9 py-1.5 px-3 text-xs rounded-xl"
                  >
                    <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
                    <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
                    <option value="other">{isRTL ? 'غير ذلك' : 'Other'}</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Save & Cancel */}
              <div className="flex items-center gap-3 pt-3 border-t border-base">
                <button
                  type="submit"
                  disabled={isSavingProfile || !isProfileDirty}
                  className={`btn-brand py-2.5 px-5 text-xs rounded-xl flex items-center gap-2 cursor-pointer ${
                    !isProfileDirty ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isSavingProfile ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>{isRTL ? 'جاري الحفظ…' : 'Saving Changes…'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isRTL ? 'حفظ التعديلات' : 'Save Changes'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelPersonalInfo}
                  disabled={!isProfileDirty || isSavingProfile}
                  className={`btn-secondary py-2.5 px-4 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer ${
                    !isProfileDirty ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إلغاء' : 'Cancel'}</span>
                </button>

                {isProfileDirty && (
                  <span className="text-[11px] text-amber-500 font-medium">
                    {isRTL ? 'لديك تعديلات غير محفوظة' : 'Unsaved changes pending'}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ASSIGNED FLEET VEHICLE & MOT CREDENTIALS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'vehicle' && (
        <div className="space-y-5">
          {/* Dispatcher Synchronization Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-card border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-500" />
                <span>{isRTL ? 'تخصيص المركبة والتكامل مع غرفة الترحيل' : 'Live Fleet & Dispatcher Synchronization'}</span>
              </h3>
              <p className="text-xs text-muted max-w-2xl leading-relaxed">
                {isRTL
                  ? 'يتم تخصيص المركبة رسميًا من قبل مشرف الترحيل في الشركة. عند تدوير الأسطول أو تحديث المركبة، يتم التحديث هنا فورًا.'
                  : 'Assigned vehicles are allocated by Fleet Dispatch Operations. Updates made by the dispatcher are automatically synchronized with this profile.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncVehicle}
              disabled={isSyncingVehicle}
              className="btn-brand py-2 px-4 text-xs rounded-xl shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingVehicle ? 'animate-spin' : ''}`} />
              <span>{isSyncingVehicle ? (isRTL ? 'جاري التحقق…' : 'Syncing Fleet…') : (isRTL ? 'مزامنة المركبة الآن' : 'Check for Updates')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left: MOT Chauffeur Registration Details */}
            <div className="p-5 rounded-2xl bg-card border border-base space-y-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-base">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-primary">{isRTL ? 'رخصة وسجل القيادة المعتمد' : 'MOT Chauffeur License'}</h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* Official Driver License */}
                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    {isRTL ? 'رقم رخصة القيادة المهنية (MOT)' : 'Commercial Driving License'}
                  </span>
                  <div className="text-sm font-bold font-mono text-primary">
                    {currentDriver?.license_number || 'SA-DL-994821'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500 pt-0.5 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isRTL ? 'سارية ومعتمدة لدى هيئة النقل' : 'Active & Verified with TGA'}</span>
                  </div>
                </div>

                {/* National ID / Iqama */}
                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    {isRTL ? 'الهوية الوطنية / الإقامة النظامية' : 'National ID / Saudi Iqama'}
                  </span>
                  <div className="text-sm font-bold font-mono text-secondary">
                    {currentDriver?.national_id || '1098234156'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted pt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>{isRTL ? 'مسجلة رسمياً بسجل الأسطول' : 'Official Fleet Record'}</span>
                  </div>
                </div>

                {/* Chauffeur Permit Badge */}
                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    {isRTL ? 'تصريح قيادة سيارات النقل الفاخر' : 'VIP Chauffeur Permit'}
                  </span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {isRTL ? 'مرخص لخدمة الحرمين والمطارات' : 'Haramain & Airport Authorized'}
                  </div>
                  <p className="text-[10px] text-muted pt-0.5">
                    {isRTL ? 'صالح للمسارات بين مكة وجدة والمدينة المنورة.' : 'Valid across Makkah, Jeddah & Madinah corridors.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Assigned Fleet Vehicle Card */}
            <div className="md:col-span-2 p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-base flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary">{isRTL ? 'بيانات المركبة المخصصة للأسطول' : 'Assigned Fleet Vehicle'}</h3>
                    <p className="text-xs text-secondary">{isRTL ? 'المركبة المعتمدة لتنفيذ الرحلات ونقل ضيوف الرحمن' : 'Commercial VIP vehicle allocated to your chauffeur duty'}</p>
                  </div>
                </div>

                {assignedVehicle ? (
                  <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-mono font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{assignedVehicle.plate_number || assignedVehicle.license_plate || 'VIP KSA'}</span>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 text-xs font-bold">
                    {isRTL ? 'قيد التخصيص' : 'Pending Allocation'}
                  </span>
                )}
              </div>

              {assignedVehicle ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Vehicle Model & Make */}
                  <div className="p-4 rounded-xl bg-surface border border-base space-y-1">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-wider">{isRTL ? 'طراز وموديل المركبة' : 'Vehicle Model & Make'}</span>
                    <div className="text-primary font-bold text-sm">
                      {assignedVehicle.make ? `${assignedVehicle.make} ${assignedVehicle.model || ''}` : assignedVehicle.model || (isRTL ? 'مركبة كبار الشخصيات' : 'Executive VIP Fleet')}
                    </div>
                    {assignedVehicle.year && (
                      <span className="text-[10px] text-muted block font-mono">
                        {isRTL ? `سنة الصنع: ${assignedVehicle.year}` : `Model Year: ${assignedVehicle.year}`}
                      </span>
                    )}
                  </div>

                  {/* Vehicle Class / Category */}
                  <div className="p-4 rounded-xl bg-surface border border-base space-y-1">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-wider">{isRTL ? 'فئة وتصنيف المركبة' : 'Vehicle Class'}</span>
                    <div className="text-amber-600 dark:text-amber-400 font-bold text-sm uppercase">
                      {assignedVehicle.vehicle_type?.replace('_', ' ') || assignedVehicle.category || 'VIP Transportation'}
                    </div>
                    <span className="text-[10px] text-muted block">
                      {isRTL ? 'مركبة معتمدة لنقل ضيوف الرحمن' : 'Premium VIP pilgrim specification'}
                    </span>
                  </div>

                  {/* Passenger Seating Capacity */}
                  <div className="p-4 rounded-xl bg-surface border border-base space-y-1">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-wider">{isRTL ? 'سعة الركاب المعتمدة' : 'Passenger Seating Capacity'}</span>
                    <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>{assignedVehicle.seating_capacity || 7} {isRTL ? 'مقاعد ركاب' : 'Passengers'}</span>
                    </div>
                    <span className="text-[10px] text-muted block">
                      {isRTL ? 'مقاعد جلدية مريحة مع مساند VIP' : 'Ergonomic luxury seating'}
                    </span>
                  </div>

                  {/* Luggage Capacity */}
                  <div className="p-4 rounded-xl bg-surface border border-base space-y-1">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-wider">{isRTL ? 'سعة الحقائب والأمتعة' : 'Luggage Capacity'}</span>
                    <div className="text-primary font-bold text-sm flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-500" />
                      <span>{assignedVehicle.luggage_capacity || 5} {isRTL ? 'حقائب كبيرة' : 'Large Bags'}</span>
                    </div>
                    <span className="text-[10px] text-muted block">
                      {isRTL ? 'مساحة مخصصة لحقائب المعتمرين' : 'Ample trunk space for pilgrim luggage'}
                    </span>
                  </div>

                  {/* Inspection & Safety Status */}
                  <div className="p-4 rounded-xl bg-surface border border-base space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted text-[10px] uppercase font-bold tracking-wider">{isRTL ? 'الفحص الدوري والتأمين الشامل' : 'MOT Inspection & Insurance'}</span>
                      <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isRTL ? 'ساري ومعتمد بالكامل' : 'Valid & Certified'}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary pt-0.5">
                      {isRTL
                        ? 'المركبة مغطاة بوثيقة تأمين ركاب تجاري شامل ومجتازة لكافة فحوصات السلامة على الطرق السريعة.'
                        : 'Full commercial passenger insurance policy active. Verified for high-speed Makkah-Madinah highway travel.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 bg-surface/50 rounded-2xl border border-dashed border-base">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Car className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-primary">{isRTL ? 'لم يتم تعيين مركبة حالياً' : 'No Vehicle Assigned Yet'}</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {isRTL
                      ? 'يرجى التواصل مع مسؤول الترحيل أو إدارة الأسطول لتخصيص مركبة لحسابك.'
                      : 'Please contact the Fleet Dispatcher or Administration to allocate an available vehicle from the fleet.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncVehicle}
                    className="btn-secondary py-2 px-4 text-xs inline-flex items-center gap-1.5 rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'فحص التخصيص مجدداً' : 'Check for Allocation'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: SECURITY & PASSWORD (Supabase Auth Updates)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Security Overview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="surface-card p-5 rounded-2xl space-y-3.5 text-xs">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isRTL ? 'نظرة عامة على أمان الحساب' : 'Security Overview'}</span>
              </h3>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                      {isRTL ? 'المصادقة المشفرة' : 'Encrypted Authentication'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {isRTL
                      ? 'محمي بواسطة Supabase Auth مع تشفير كامل لكلمات المرور والجلسات.'
                      : 'Protected with Supabase Auth with bcrypt-hashed credentials and token rotation.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold">{isRTL ? 'البريد الإلكتروني المرتبط' : 'Associated Auth Email'}</span>
                  <p className="text-xs font-mono text-primary truncate">{currentUser.email || 'Verified Captain'}</p>
                  <span className="text-[10px] text-emerald-500 font-semibold block">{isRTL ? 'جلسة العمل نشطة ومحمية' : 'Driver Cockpit Session Active'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Password Change Form */}
          <div className="lg:col-span-8 surface-card p-5 sm:p-6 space-y-4 rounded-2xl">
            <div className="border-b border-base pb-3.5">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>{isRTL ? 'تحديث وتغيير كلمة المرور' : 'Change Account Password'}</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {isRTL
                  ? 'احرص على استخدام كلمة مرور قوية وغير مكررة لحماية حساب الكابتن وسجلات الرحلات.'
                  : 'Maintain a secure, confidential password to protect your captain missions and cash ledger.'}
              </p>
            </div>

            {/* In-form Success Alert */}
            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{passwordSuccessMsg}</span>
                <button
                  type="button"
                  onClick={() => setPasswordSuccessMsg(null)}
                  className="p-1 text-emerald-700 dark:text-emerald-300 hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* In-form Error Alert */}
            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{passwordError}</span>
                <button
                  type="button"
                  onClick={() => setPasswordError(null)}
                  className="p-1 text-rose-700 dark:text-rose-400 hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <form onSubmit={handlePasswordFormSubmit} className="space-y-4 text-xs">
              {/* Current Password */}
              <div>
                <label className="type-label">{isRTL ? 'كلمة المرور الحالية *' : 'Current Password *'}</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="field-input h-9 py-1.5 pr-10 pl-3 text-xs rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer`}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="type-label">{isRTL ? 'كلمة المرور الجديدة *' : 'New Password *'}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={isRTL ? '8 أحرف على الأقل تحتوي على حروف وأرقام' : 'Min. 8 characters with upper, lower & numbers'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="field-input h-9 py-1.5 pr-10 pl-3 text-xs rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer`}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="type-label">{isRTL ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={isRTL ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="field-input h-9 py-1.5 pr-10 pl-3 text-xs rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer`}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Requirements Meter */}
              {newPassword && (
                <div className="p-3.5 rounded-xl bg-surface border border-base space-y-2">
                  <span className="text-[11px] font-bold text-primary block">
                    {isRTL ? 'متطلبات كلمة المرور القوية:' : 'Password Security Requirements:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <span className={`flex items-center gap-1.5 ${passwordRules.hasLength ? 'text-emerald-500' : 'text-muted'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-500' : 'text-muted'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isRTL ? 'حرف كبير (A-Z)' : 'One uppercase letter (A-Z)'}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-500' : 'text-muted'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isRTL ? 'حرف صغير (a-z)' : 'One lowercase letter (a-z)'}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-emerald-500' : 'text-muted'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isRTL ? 'رقم واحد على الأقل (0-9)' : 'At least one number (0-9)'}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 sm:col-span-2 ${passwordRules.isMatching ? 'text-emerald-500' : 'text-muted'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isRTL ? 'تطابق كلمتي المرور' : 'Passwords match exactly'}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isPasswordValid || isChangingPassword}
                  className={`btn-brand py-2.5 px-5 text-xs rounded-xl flex items-center gap-2 cursor-pointer ${
                    !isPasswordValid ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: PERFORMANCE & REVIEWS (Real Supabase Ratings & Rides)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-5">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overall Rating */}
            <div className="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{isRTL ? 'تقييم الحجاج والمعتمرين' : 'Overall Pilgrim Rating'}</span>
              <div className="text-xl sm:text-2xl font-bold text-amber-500 flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{ratingStats.display}</span>
                {!ratingStats.isNew && <span className="text-xs text-muted font-normal">/ 5.0</span>}
              </div>
              <p className="text-[10px] text-secondary pt-0.5">{ratingStats.countLabel}</p>
            </div>

            {/* Total Completed Rides */}
            <div className="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{isRTL ? 'إجمالي الرحلات المنجزة' : 'Total Completed Rides'}</span>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {completedRidesCount} {isRTL ? 'رحلة' : 'Rides'}
              </div>
              <p className="text-[10px] text-secondary pt-0.5">
                {isRTL ? 'بين مكة والمدينة ومطارات جدة' : 'Makkah, Madinah & Jeddah Airport transfers'}
              </p>
            </div>

            {/* Chauffeur Standing */}
            <div className="surface-card p-4 sm:p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{isRTL ? 'سجل الالتزام والسلامة' : 'Safety Compliance'}</span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-500 flex items-center gap-1.5">
                <Award className="w-5 h-5 text-emerald-500" />
                <span>{isRTL ? 'ممتاز 100%' : '100% Elite'}</span>
              </div>
              <p className="text-[10px] text-secondary pt-0.5">
                {isRTL ? 'ملتزم بأنظمة الهيئة العامة للنقل' : 'Zero violations in Ministry registry'}
              </p>
            </div>
          </div>

          {/* Real Pilgrim Reviews from Database */}
          <div className="surface-card p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="border-b border-base pb-3">
              <h3 className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>{isRTL ? 'آراء وتقييمات الحجاج المباشرة' : 'Real Pilgrim Feedback & Reviews'}</span>
              </h3>
              <p className="text-xs text-muted">
                {isRTL ? 'ملاحظات المسافرين المسجلة في قاعدة البيانات بعد إتمام رحلاتهم:' : 'Verified customer ratings and remarks from completed journeys:'}
              </p>
            </div>

            {driverFeedbackList.length === 0 ? (
              <div className="p-8 text-center space-y-2.5 bg-surface/40 rounded-xl border border-dashed border-base">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Star className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-primary">{isRTL ? 'لا توجد تقييمات مسجلة حتى الآن' : 'No Reviews Yet'}</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {isRTL ? 'ستظهر هنا تقييمات الحجاج فور إتمام الرحلات الموكلة إليك.' : 'Customer reviews and ratings will be recorded here after completing assigned trips.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {driverFeedbackList.map((review) => (
                  <div key={review.id} className="p-4 rounded-xl bg-surface border border-base space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${
                              idx < (review.rating || 5)
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs text-primary italic">
                      "{review.feedback || (isRTL ? 'تقييم ممتاز لتجربة التوصيل والرحلة.' : 'Excellent chauffeur service and smooth VIP transfer.')}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: PHOTO PREVIEW & UPLOAD CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      {isPhotoPreviewOpen && previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-xs sm:max-w-sm surface-card p-5 space-y-4 rounded-2xl shadow-2xl border border-base">
            <h3 className="text-sm sm:text-base font-bold text-primary text-center">
              {isRTL ? 'معاينة الصورة الشخصية' : 'Preview Profile Photo'}
            </h3>

            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden mx-auto border-2 border-emerald-500 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <p className="text-xs text-muted text-center leading-relaxed">
              {isRTL
                ? 'ستظهر هذه الصورة للحجاج ومشرفي الحركة للتعرف عليك في صالات المطارات والفنادق.'
                : 'This photo will be displayed to pilgrims and dispatchers for identification at airports and hotel pickups.'}
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsPhotoPreviewOpen(false);
                  setPendingFile(null);
                  setPreviewPhotoUrl(null);
                }}
                className="btn-secondary flex-1 py-2 text-xs rounded-xl cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={handleConfirmPhotoUpload}
                className="btn-brand flex-1 py-2 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUploadingPhoto ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>{isRTL ? 'جاري الرفع…' : 'Uploading…'}</span>
                  </>
                ) : (
                  <span>{isRTL ? 'حفظ الصورة' : 'Save Photo'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: PASSWORD CHANGE CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      {isPasswordConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-sm surface-card p-5 space-y-4 rounded-2xl shadow-2xl border border-base">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-primary">
                {isRTL ? 'تأكيد تغيير كلمة المرور' : 'Confirm Password Update'}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {isRTL
                  ? 'هل أنت متأكد من رغبتك في تحديث كلمة مرور حسابك؟ سيتوجب عليك استخدام كلمة المرور الجديدة لتسجيل الدخول لاحقاً.'
                  : 'Are you sure you want to change your account password? You will need your new password for all subsequent logins.'}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-base">
              <button
                type="button"
                onClick={() => setIsPasswordConfirmModalOpen(false)}
                disabled={isChangingPassword}
                className="btn-secondary flex-1 py-2 text-xs rounded-xl cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecutePasswordChange}
                disabled={isChangingPassword}
                className="btn-brand flex-1 py-2 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isChangingPassword ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>{isRTL ? 'جاري التحديث…' : 'Updating…'}</span>
                  </>
                ) : (
                  <span>{isRTL ? 'تأكيد التحديث' : 'Confirm Change'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: QUICK PHONE NUMBER CHANGE
      ───────────────────────────────────────────────────────────── */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-sm surface-card p-5 space-y-4 rounded-2xl shadow-2xl border border-base">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <h3 className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500" />
                <span>{isRTL ? 'تعديل رقم الهاتف' : 'Update Phone Number'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalPhoneError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                {modalPhoneError}
              </div>
            )}

            <form onSubmit={handleSaveModalPhone} className="space-y-3.5 text-xs">
              <div>
                <label className="type-label">{isRTL ? 'رقم الهاتف (مع رمز الدولة)' : 'Phone Number (with country code)'}</label>
                <input
                  type="tel"
                  required
                  placeholder="+966 50 123 4567"
                  value={modalPhoneNumber}
                  onChange={(e) => {
                    setModalPhoneNumber(e.target.value);
                    if (modalPhoneError) setModalPhoneError(null);
                  }}
                  className="field-input h-9 py-1.5 px-3 text-xs rounded-xl font-mono"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  {isRTL ? 'يُستخدم للتواصل المباشر مع الحجاج ومسؤولي الترحيل.' : 'Used for automated dispatch calls and WhatsApp coordination.'}
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="btn-secondary py-2 px-3.5 text-xs rounded-xl cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingModalPhone}
                  className="btn-brand py-2 px-4 text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdatingModalPhone ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>{isRTL ? 'جاري الحفظ…' : 'Saving…'}</span>
                    </>
                  ) : (
                    <span>{isRTL ? 'حفظ الهاتف' : 'Save Phone'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
