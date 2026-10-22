'use client';

import React from 'react';
import {
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Car,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   1. ACTIVITY-BASED COLOR MAPPING & BADGES
   Green: Active, Verified, Confirmed, Completed, Available, Accepted, Success
   Red: Delete, Failed, Rejected, Cancelled, Inactive, Suspended, Deactivated
   Amber/Yellow: Pending, Waiting, Warning, Requires attention
   Blue: Information, View, Navigation, General actions, Assigned
   Purple: Special/admin-level actions, VIP, In-Progress, Trip Started
   Neutral/Gray: Secondary actions, inactive UI, metadata
───────────────────────────────────────────────────────────────────────────── */

export type ActivityTone = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral';

export function getActivityTone(status?: string | null): ActivityTone {
  if (!status) return 'neutral';
  const s = status.toLowerCase().replace(/[\s-]/g, '_');

  // Green
  if (
    [
      'active',
      'verified',
      'confirmed',
      'completed',
      'ride_completed',
      'trip_completed',
      'payment_completed',
      'available',
      'accepted',
      'driver_accepted',
      'success',
      'published',
      'valid',
      'certified',
    ].includes(s)
  ) {
    return 'green';
  }

  // Red
  if (
    [
      'delete',
      'deleted',
      'failed',
      'rejected',
      'cancelled',
      'canceled',
      'inactive',
      'deactivated',
      'suspended',
      'critical',
      'error',
      'expired',
      'hidden',
    ].includes(s)
  ) {
    return 'red';
  }

  // Amber / Yellow
  if (
    [
      'pending',
      'waiting',
      'warning',
      'unverified',
      'awaiting',
      'unassigned',
      'scheduled',
      'maintenance',
      'payment_pending',
    ].includes(s)
  ) {
    return 'amber';
  }

  // Blue
  if (
    [
      'info',
      'view',
      'assigned',
      'driver_assigned',
      'dispatcher',
      'staff',
      'navigation',
      'open',
    ].includes(s)
  ) {
    return 'blue';
  }

  // Purple
  if (
    [
      'admin',
      'administrator',
      'vip',
      'vip_gmc',
      'trip_started',
      'ride_started',
      'driver_arriving',
      'driver_arrived',
      'en_route',
      'in_progress',
      'special',
    ].includes(s)
  ) {
    return 'purple';
  }

  return 'neutral';
}

interface AdminStatusBadgeProps {
  status: string;
  label?: string;
  tone?: ActivityTone;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function AdminStatusBadge({
  status,
  label,
  tone,
  showDot = true,
  size = 'md',
  className = '',
}: AdminStatusBadgeProps) {
  const effectiveTone = tone || getActivityTone(status);
  const displayLabel = label || status.replace(/_/g, ' ');

  const toneClasses: Record<ActivityTone, { container: string; dot: string }> = {
    green: {
      container:
        'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80',
      dot: 'bg-emerald-600',
    },
    red: {
      container:
        'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80',
      dot: 'bg-rose-600',
    },
    amber: {
      container:
        'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80',
      dot: 'bg-amber-600',
    },
    blue: {
      container:
        'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/80',
      dot: 'bg-sky-600',
    },
    purple: {
      container:
        'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/80',
      dot: 'bg-purple-600',
    },
    neutral: {
      container:
        'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80',
      dot: 'bg-slate-500',
    },
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-2.5 py-0.5 text-[11px] gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider border transition-colors shadow-2xs select-none ${sizeClasses} ${toneClasses[effectiveTone].container} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneClasses[effectiveTone].dot} ${
            effectiveTone === 'green' || effectiveTone === 'amber' ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. ACCESSIBLE ACTION BUTTONS (View → Edit → Delete → More)
   Icons are visible, compact and sleek with tooltips.
───────────────────────────────────────────────────────────────────────────── */

export type ActionButtonVariant = 'view' | 'edit' | 'delete' | 'more' | 'primary' | 'secondary';

interface AdminActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ActionButtonVariant;
  tooltip: string;
  icon?: React.ReactNode;
  label?: string;
}

export function AdminActionButton({
  variant,
  tooltip,
  icon,
  label,
  className = '',
  disabled,
  ...props
}: AdminActionButtonProps) {
  const variantStyles: Record<ActionButtonVariant, string> = {
    view: 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200 hover:border-sky-300 focus-visible:ring-sky-500',
    edit: 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300 focus-visible:ring-amber-500',
    delete:
      'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 hover:border-rose-300 focus-visible:ring-rose-500',
    more: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300 focus-visible:ring-purple-500',
    primary:
      'text-white bg-emerald-600 hover:bg-emerald-500 border-emerald-600 shadow-xs focus-visible:ring-emerald-500',
    secondary:
      'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200 focus-visible:ring-amber-500',
  };

  const defaultIcons: Record<ActionButtonVariant, React.ReactNode> = {
    view: <Eye className="w-3.5 h-3.5 shrink-0" />,
    edit: <Pencil className="w-3.5 h-3.5 shrink-0" />,
    delete: <Trash2 className="w-3.5 h-3.5 shrink-0" />,
    more: <MoreVertical className="w-3.5 h-3.5 shrink-0" />,
    primary: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    secondary: <ChevronRight className="w-3.5 h-3.5 shrink-0" />,
  };

  const effectiveIcon = icon || defaultIcons[variant];

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 min-w-[30px] min-h-[30px] px-2 py-1 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-95 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {effectiveIcon}
      {label && <span className="font-medium text-[11px]">{label}</span>}
    </button>
  );
}

export function AdminActionGroup({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-1 sm:gap-1.5 ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. UNIFIED PAGE HEADER
───────────────────────────────────────────────────────────────────────────── */

interface AdminPageHeaderProps {
  eyebrow?: string;
  badge?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function AdminPageHeader({
  eyebrow = 'Administration HQ',
  badge,
  title,
  description,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="bg-card border border-base p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
      <div className="space-y-1 max-w-3xl z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="type-eyebrow text-amber-700 font-bold">
            {eyebrow}
          </span>
          {badge && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Shield className="w-2.5 h-2.5 text-emerald-600" />
              {badge}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-normal">
          {description}
        </p>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 z-10 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. STANDARDIZED KPI / STAT CARD
───────────────────────────────────────────────────────────────────────────── */

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: ActivityTone;
  trend?: string;
  onClick?: () => void;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'neutral',
  trend,
  onClick,
  className = '',
}: AdminStatCardProps) {
  const iconTones: Record<ActivityTone, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${iconTones[tone]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {trend && (
              <span className="font-semibold text-emerald-700 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </span>
            )}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. STANDARDIZED DATA TABLE WRAPPER
───────────────────────────────────────────────────────────────────────────── */

interface AdminTableCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  totalCount?: number;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AdminTableCard({
  title,
  subtitle,
  badge,
  totalCount,
  headerAction,
  children,
  footer,
  className = '',
}: AdminTableCardProps) {
  const displayBadge = badge || (typeof totalCount === 'number' ? `${totalCount} records` : undefined);

  return (
    <div
      className={`bg-card border border-base rounded-2xl shadow-xs hover:shadow-sm transition-shadow overflow-hidden ${className}`}
    >
      {(title || headerAction) && (
        <div className="p-3.5 sm:p-4 border-b border-base flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface/30">
          <div>
            <div className="flex items-center gap-2">
              {title && <h2 className="text-sm sm:text-base font-bold text-primary">{title}</h2>}
              {displayBadge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-secondary border border-base">
                  {displayBadge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      )}

      <div className="overflow-x-auto">{children}</div>

      {footer && (
        <div className="p-3 border-t border-base bg-surface/30 text-xs text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {footer}
        </div>
      )}
    </div>
  );
}
