'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  UserCircle,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Compass,
  Clock,
  Car,
  Users,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  FileText,
  BadgeCheck,
  Activity,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

type ActiveProfileTab = 'personal' | 'security' | 'operations';

export default function DispatcherProfilePage() {
  const {
    currentUser,
    bookings,
    drivers,
    vehicles,
    updateUserProfile,
    uploadAvatar,
    changePassword,
    refreshData,
    isDataLoading,
  } = useApp();

  const { language, setLanguage, dir, isRTL, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveProfileTab>('personal');

  // Profile fields
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Dispatcher operational preferences (stored in localStorage)
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dispatcher_sound_alerts');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [autoRefreshRadar, setAutoRefreshRadar] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dispatcher_auto_refresh_radar');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // Keep form in sync if currentUser loads or refreshes
  useEffect(() => {
    if (currentUser?.full_name) {
      setFullName(currentUser.full_name);
    }
    if (currentUser?.phone) {
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Operational metrics
  const pendingQueueCount = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'pending' ||
        b.status === 'pending_review' ||
        b.status === 'pending_verification' ||
        b.status === 'confirmed'
    ).length;
  }, [bookings]);

  const activeDriversCount = useMemo(() => {
    return drivers.filter((d) => d.status !== 'offline').length;
  }, [drivers]);

  const inTransitTripsCount = useMemo(() => {
    return bookings.filter(
      (b) =>
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
    ).length;
  }, [bookings]);

  // Save profile changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      toast.error(isRTL ? 'الرجاء إدخال الاسم الكامل' : 'Full name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const ok = await updateUserProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        preferred_language: language,
      });

      if (ok) {
        toast.success(
          isRTL
            ? 'تم حفظ معلومات الملف الشخصي بنجاح'
            : 'Dispatcher profile updated successfully.'
        );
      } else {
        toast.error(isRTL ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile.');
      }
    } catch {
      toast.error(isRTL ? 'حدث خطأ أثناء التحديث' : 'An error occurred while updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        isRTL
          ? 'حجم الصورة يجب أن لا يتجاوز 5 ميغابايت'
          : 'Image size must be smaller than 5MB.'
      );
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      if (url) {
        toast.success(isRTL ? 'تم تحديث الصورة الشخصية' : 'Profile photo updated successfully.');
      } else {
        toast.error(isRTL ? 'فشل تحميل الصورة' : 'Failed to upload photo.');
      }
    } catch {
      toast.error(isRTL ? 'حدث خطأ أثناء تحميل الصورة' : 'Error uploading profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(isRTL ? 'يرجى تعبئة جميع حقول كلمة المرور' : 'All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(isRTL ? 'كلمتا المرور غير متطابقتين' : 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error(
        isRTL
          ? 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success(
          isRTL
            ? 'تم تغيير كلمة المرور بنجاح'
            : 'Password changed successfully.'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(
          result.error || (isRTL ? 'فشل تغيير كلمة المرور' : 'Failed to change password.')
        );
      }
    } catch {
      toast.error(isRTL ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Error changing password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const toggleSoundAlerts = () => {
    const next = !soundAlerts;
    setSoundAlerts(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dispatcher_sound_alerts', String(next));
    }
    toast.success(
      next
        ? isRTL
          ? 'تم تفعيل التنبيهات الصوتية للطلبات'
          : 'Audio chime alerts enabled for new queue rides.'
        : isRTL
        ? 'تم كتم التنبيهات الصوتية'
        : 'Audio chime alerts muted.'
    );
  };

  const toggleAutoRefreshRadar = () => {
    const next = !autoRefreshRadar;
    setAutoRefreshRadar(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dispatcher_auto_refresh_radar', String(next));
    }
    toast.success(
      next
        ? isRTL
          ? 'تم تفعيل التحديث التلقائي لرادار الأسطول'
          : 'Fleet radar auto-refresh active.'
        : isRTL
        ? 'تم إيقاف التحديث التلقائي'
        : 'Radar auto-refresh paused.'
    );
  };

  const memberSinceFormatted = useMemo(() => {
    if (!currentUser?.created_at) return isRTL ? 'عضو نشط' : 'Active Member';
    try {
      const d = new Date(currentUser.created_at);
      return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isRTL ? 'عضو نشط' : 'Active Member';
    }
  }, [currentUser?.created_at, isRTL]);

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div dir={dir} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & IDENTITY BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-base rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isRTL ? 'مركز التحكم والعمليات' : 'Fleet Operations Control'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" />
              {isRTL ? 'مشغل معتمد' : 'Authorized Dispatcher'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            {isRTL ? 'الملف الشخصي لمشرف العمليات' : 'Dispatcher Profile'}
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            {isRTL
              ? 'إدارة الهوية التشغيلية، بيانات التواصل، كلمات المرور، وتفضيلات تنبيهات الرادار.'
              : 'Manage your operational identity, credentials, contact information, and dispatch preferences.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={isDataLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-secondary hover:text-primary bg-elevated hover:bg-slate-200/80 rounded-xl border border-base transition-colors cursor-pointer disabled:opacity-50"
            title={isRTL ? 'تحديث البيانات' : 'Refresh Telemetry'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRTL ? 'تحديث' : 'Refresh'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{isRTL ? 'نوبة العمل: نشط' : 'On Shift: Active'}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. OPERATIONAL TELEMETRY KPI CARDS (4 Modules)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Queue */}
        <Link
          href="/dispatcher/queue"
          className="bg-white border border-base hover:border-emerald-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted">
              {isRTL ? 'طابور الطلبات المعلقة' : 'Actionable Queue'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary font-mono">{pendingQueueCount}</span>
            <span className="text-[11px] text-amber-700 font-medium">
              {isRTL ? 'بانتظار التعيين' : 'Pending review'}
            </span>
          </div>
        </Link>

        {/* Chauffeurs Active */}
        <Link
          href="/dispatcher/drivers"
          className="bg-white border border-base hover:border-emerald-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted">
              {isRTL ? 'الكباتن المتصلين' : 'Chauffeurs Online'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60 group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary font-mono">{activeDriversCount}</span>
            <span className="text-[11px] text-emerald-700 font-medium">
              {isRTL ? 'في الخدمة الآن' : 'Ready on road'}
            </span>
          </div>
        </Link>

        {/* Active Trips on Road */}
        <Link
          href="/dispatcher"
          className="bg-white border border-base hover:border-emerald-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted">
              {isRTL ? 'رحلات قيد التنفيذ' : 'Missions on Road'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary font-mono">{inTransitTripsCount}</span>
            <span className="text-[11px] text-blue-700 font-medium">
              {isRTL ? 'تتبع مباشر' : 'Live telemetry'}
            </span>
          </div>
        </Link>

        {/* Security Clearance */}
        <div className="bg-white border border-base rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted">
              {isRTL ? 'مستوى الصلاحية' : 'Security Clearance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-bold text-primary">
              {isRTL ? 'المستوى ٢: عمليات' : 'Level 2: Dispatch'}
            </span>
            <span className="text-[11px] text-purple-700 font-medium">
              {isRTL ? 'مشغل معتمد' : 'Full access'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN 2-COLUMN LAYOUT
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Identity & Shift Telemetry Card (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-base rounded-2xl p-6 shadow-xs text-center space-y-4">
            {/* Avatar with Camera Trigger */}
            <div className="relative inline-block mx-auto">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-900 border-2 border-emerald-500/50 shadow-md flex items-center justify-center text-3xl font-extrabold text-amber-300 overflow-hidden">
                {currentUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name || 'Dispatcher'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentUser.full_name || 'D').charAt(0).toUpperCase()
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={isRTL ? 'تغيير الصورة الشخصية' : 'Change profile photo'}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md cursor-pointer transition-colors disabled:opacity-50 border-2 border-white"
                title={isRTL ? 'رفع صورة جديدة' : 'Upload photo'}
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Name & Role */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-primary truncate">
                {currentUser.full_name || (isRTL ? 'مشرف العمليات' : 'Operations Dispatcher')}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRTL ? 'مشرف أسطول معتمد' : 'Certified Fleet Controller'}</span>
              </div>
            </div>

            {/* Quick Contact Badges */}
            <div className="pt-2 border-t border-base space-y-2 text-xs text-left rtl:text-right">
              <div className="flex items-center gap-2 text-secondary bg-elevated/70 px-3 py-2 rounded-xl">
                <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className="truncate flex-1 font-mono text-[11.5px]">
                  {currentUser.email || 'operations@alharmaintravel.com'}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold">
                  {isRTL ? 'مؤكد' : 'Verified'}
                </span>
              </div>

              {currentUser.phone && (
                <div className="flex items-center gap-2 text-secondary bg-elevated/70 px-3 py-2 rounded-xl">
                  <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="truncate font-mono text-[11.5px]">{currentUser.phone}</span>
                </div>
              )}
            </div>

            {/* Operational ID Specs */}
            <div className="pt-3 border-t border-base grid grid-cols-2 gap-2 text-left rtl:text-right text-[11px]">
              <div className="bg-elevated/50 p-2.5 rounded-xl border border-base/80">
                <span className="text-muted block text-[10px]">{isRTL ? 'معرّف المشغل' : 'Controller ID'}</span>
                <span className="font-mono font-bold text-primary truncate block mt-0.5">
                  {currentUser.id ? currentUser.id.slice(0, 8).toUpperCase() : 'DISP-01'}
                </span>
              </div>
              <div className="bg-elevated/50 p-2.5 rounded-xl border border-base/80">
                <span className="text-muted block text-[10px]">{isRTL ? 'تاريخ التعيين' : 'Member Since'}</span>
                <span className="font-bold text-primary block mt-0.5">{memberSinceFormatted}</span>
              </div>
            </div>
          </div>

          {/* Quick Module Navigation Card */}
          <div className="bg-white border border-base rounded-2xl p-5 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {isRTL ? 'روابط سريعة للمنظومة' : 'Dispatcher Quick Access'}
            </h3>
            <div className="space-y-1.5">
              <Link
                href="/dispatcher"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <span>{isRTL ? 'رادار الأسطول الحي' : 'Fleet Radar Telemetry'}</span>
                </div>
                <ChevronIcon className="w-4 h-4 text-muted" />
              </Link>

              <Link
                href="/dispatcher/queue"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{isRTL ? 'طابور الرحلات والتعيين' : 'Ride Queue & Review'}</span>
                </div>
                <ChevronIcon className="w-4 h-4 text-muted" />
              </Link>

              <Link
                href="/dispatcher/new-booking"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-blue-600" />
                  <span>{isRTL ? 'تسجيل حجز هاتفي يدوي' : 'Manual Phone Booking'}</span>
                </div>
                <ChevronIcon className="w-4 h-4 text-muted" />
              </Link>

              <Link
                href="/dispatcher/drivers"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-elevated border border-transparent hover:border-base transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-teal-600" />
                  <span>{isRTL ? 'سجل الكباتن والأسطول' : 'Chauffeurs Roster'}</span>
                </div>
                <ChevronIcon className="w-4 h-4 text-muted" />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Tabs (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tab Selection Header */}
          <div className="bg-white border border-base rounded-2xl p-1.5 shadow-xs flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              <span>{isRTL ? 'المعلومات الشخصية' : 'Personal Details'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isRTL ? 'الأمان وكلمة المرور' : 'Security & Password'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('operations')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'operations'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-elevated'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{isRTL ? 'إعدادات النوبة والتنبيهات' : 'Shift & Alerts'}</span>
            </button>
          </div>

          {/* TAB 1: Personal Details */}
          {activeTab === 'personal' && (
            <div className="bg-white border border-base rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-base pb-4">
                <h3 className="text-base font-bold text-primary">
                  {isRTL ? 'بيانات المشغل والتواصل' : 'Personal & Contact Information'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {isRTL
                    ? 'حدّث اسمك الكامل ورقم الهاتف المعتمد للتواصل مع الكباتن والعملاء.'
                    : 'Update your official full name and direct telephone line for operational dispatch.'}
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'الاسم الكامل الرسمي' : 'Full Legal Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRTL ? 'مثال: محمد العمري' : 'e.g. Tariq Al-Otaibi'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-base bg-input text-primary text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-muted"
                    required
                  />
                </div>

                {/* Email (Read-only / System-Linked) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-primary">
                      {isRTL ? 'البريد الإلكتروني للعمليات' : 'Operational Email Address'}
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {isRTL ? 'مربوط بالنظام' : 'System Linked & Verified'}
                    </span>
                  </div>
                  <input
                    type="email"
                    value={currentUser.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-base bg-elevated text-muted text-xs cursor-not-allowed select-none font-mono"
                  />
                  <p className="text-[11px] text-muted">
                    {isRTL
                      ? 'لأسباب أمنية، يتطلب تغيير البريد الإلكتروني مراجعة المشرف العام (Admin).'
                      : 'For operational security, changing your official email requires administrator approval.'}
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'رقم هاتف الاتصال المباشر' : 'Direct Dispatch Phone'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-base bg-input text-primary text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-muted font-mono"
                  />
                </div>

                {/* Preferred Language */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'لغة الواجهة المفضلة' : 'Preferred Interface Language'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        language === 'en'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-base bg-white text-secondary hover:bg-elevated'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold">English</div>
                        <div className="text-[10px] text-muted">LTR Standard</div>
                      </div>
                      {language === 'en' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage('ar')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        language === 'ar'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-base bg-white text-secondary hover:bg-elevated'
                      }`}
                    >
                      <div className="text-right">
                        <div className="font-bold">العربية</div>
                        <div className="text-[10px] text-muted">RTL قياسي</div>
                      </div>
                      {language === 'ar' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-3 border-t border-base flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSavingProfile ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="bg-white border border-base rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-base pb-4">
                <h3 className="text-base font-bold text-primary">
                  {isRTL ? 'أمان الحساب وكلمة المرور' : 'Account Security & Password'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {isRTL
                    ? 'قم بتحديث كلمة المرور الخاصة بك بانتظام لحماية منظومة الترحيل وسجلات الكباتن.'
                    : 'Regularly update your credentials to safeguard dispatch telemetry and flight reservations.'}
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'كلمة المرور الحالية' : 'Current Password'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-base bg-input text-primary text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-muted"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-muted hover:text-primary transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'كلمة المرور الجديدة' : 'New Password'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-base bg-input text-primary text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-muted"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-muted hover:text-primary transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">
                    {isRTL
                      ? 'يجب أن لا تقل عن 8 خانات وتحتوي على مزيج من الأحرف والأرقام.'
                      : 'Must be at least 8 characters with letters and numbers.'}
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-primary">
                    {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-base bg-input text-primary text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-muted"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-muted hover:text-primary transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Security Advice Card */}
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">
                      {isRTL ? 'معايير أمان نوبة العمليات' : 'Operational Security Notice'}
                    </span>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      {isRTL
                        ? 'تأكد من عدم مشاركة بيانات دخول المشغل مع أي شخص أو تسجيل الدخول من أجهزة عامة غير مرخصة.'
                        : 'Never share your dispatcher login credentials or access the fleet cockpit from unauthorized public terminals.'}
                    </p>
                  </div>
                </div>

                {/* Save Password Button */}
                <div className="pt-3 border-t border-base flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPassword ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>
                      {isSavingPassword
                        ? isRTL
                          ? 'جاري تغيير كلمة المرور...'
                          : 'Updating Password...'
                        : isRTL
                        ? 'تحديث كلمة المرور'
                        : 'Update Password'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Shift & Alerts */}
          {activeTab === 'operations' && (
            <div className="bg-white border border-base rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-base pb-4">
                <h3 className="text-base font-bold text-primary">
                  {isRTL ? 'إعدادات نوبة الترحيل والتنبيهات' : 'Shift Preferences & Live Telemetry Alerts'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {isRTL
                    ? 'تخصيص تنبيهات وصول الطلبات الجديدة وتحديثات رادار الأسطول.'
                    : 'Customize audio chime triggers for incoming rides and fleet radar auto-refresh behaviors.'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Audio Chime Notification Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-base bg-elevated/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/70">
                      {soundAlerts ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-muted" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-primary">
                        {isRTL ? 'تنبيه نغمة الرنين للطلبات الجديدة' : 'Audio Chime on Incoming Bookings'}
                      </div>
                      <div className="text-[11px] text-muted">
                        {isRTL
                          ? 'إصدار صوت خفيف فوري عند دخول حجز جديد إلى طابور الترحيل.'
                          : 'Play an acoustic alert chime whenever a new booking enters the pending review queue.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSoundAlerts}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soundAlerts ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        soundAlerts ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Radar Auto-refresh Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-base bg-elevated/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/70">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-primary">
                        {isRTL ? 'التحديث التلقائي لرادار تتبع المركبات' : 'Radar Telemetry Auto-Poll'}
                      </div>
                      <div className="text-[11px] text-muted">
                        {isRTL
                          ? 'تحديث إحداثيات GPS لمركبات الأسطول تلقائياً كل 10 ثوانٍ.'
                          : 'Automatically update live vehicle GPS coordinates on the interactive radar every 10 seconds.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAutoRefreshRadar}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoRefreshRadar ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoRefreshRadar ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dispatcher Station Info */}
                <div className="p-4 rounded-xl border border-base bg-white space-y-2.5">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isRTL ? 'معلومات محطة العمليات الحالية' : 'Current Operations Station'}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-elevated/50 border border-base/80">
                      <span className="text-muted block text-[10px]">{isRTL ? 'النظام التشغيلي' : 'Client Environment'}</span>
                      <span className="font-mono text-[11px] text-primary">Web Fleet Cockpit v2.4</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-elevated/50 border border-base/80">
                      <span className="text-muted block text-[10px]">{isRTL ? 'حالة المزامنة' : 'Realtime Sync Engine'}</span>
                      <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Supabase PostgreSQL Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
