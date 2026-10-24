'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarCheck,
  Users,
  UserCheck,
  Car,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  MapPin,
  Banknote,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
} from '@/components/admin/AdminUIComponents';
import { toast } from 'sonner';

// Helper to group bookings by date
function groupByDate(
  bookings: Array<{ created_at: string; final_fare?: number | null; estimated_fare?: number | null }>,
  days: number
): Array<{ date: string; count: number; revenue: number }> {
  const now = new Date();
  const result: Array<{ date: string; count: number; revenue: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayBookings = bookings.filter(
      (b) => b.created_at.split('T')[0] === dateStr
    );
    result.push({
      date: dateStr,
      count: dayBookings.length,
      revenue: dayBookings.reduce((s, b) => s + (b.final_fare || b.estimated_fare || 0), 0),
    });
  }
  return result;
}

// Mini bar chart component
function MiniBarChart({
  data,
  valueKey,
  color = 'emerald',
  height = 60,
  label,
}: {
  data: Array<{ date: string; count: number; revenue: number }>;
  valueKey: 'count' | 'revenue';
  color?: string;
  height?: number;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 mb-2">{label}</div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((d) => {
          const pct = (d[valueKey] / max) * 100;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${valueKey === 'revenue' ? formatCurrency(d[valueKey], 'SAR') : d[valueKey]}`}
              className={`flex-1 rounded-t transition-all cursor-default bg-${color}-500/60 hover:bg-${color}-500`}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 mt-1">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = 'emerald',
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl bg-${color}-100 border border-${color}-200 flex items-center justify-center`}>
          <span className={`text-${color}-600`}>{icon}</span>
        </div>
        {trend && trendLabel && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {trendLabel}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs font-semibold text-slate-700 mt-0.5">{title}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { bookings, drivers, vehicles, usersList, settings, refreshData } = useApp();
  const [period, setPeriod] = useState<7 | 14 | 30>(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - period);

  const periodBookings = bookings.filter(
    (b) => new Date(b.created_at) >= periodStart
  );
  const completedBookings = periodBookings.filter(
    (b) => b.status === 'trip_completed' || b.status === 'ride_completed' || b.status === 'payment_completed'
  );
  const cancelledBookings = periodBookings.filter((b) => b.status === 'cancelled');
  const activeBookings = periodBookings.filter(
    (b) =>
      b.status === 'driver_assigned' ||
      b.status === 'driver_accepted' ||
      b.status === 'trip_started' ||
      b.status === 'ride_started'
  );

  // Revenue metrics
  const totalRevenue = completedBookings.reduce(
    (s, b) => s + (b.final_fare || b.estimated_fare || 0),
    0
  );
  const cashRevenue = completedBookings
    .filter((b) => b.payment_method === 'cash')
    .reduce((s, b) => s + (b.final_fare || b.estimated_fare || 0), 0);
  const onlineRevenue = totalRevenue - cashRevenue;
  const avgFare =
    completedBookings.length > 0
      ? totalRevenue / completedBookings.length
      : 0;

  // Completion rate
  const completionRate =
    periodBookings.length > 0
      ? ((completedBookings.length / periodBookings.length) * 100).toFixed(1)
      : '0.0';
  const cancellationRate =
    periodBookings.length > 0
      ? ((cancelledBookings.length / periodBookings.length) * 100).toFixed(1)
      : '0.0';

  // Driver stats
  const availableDrivers = drivers.filter((d) => d.status === 'available').length;
  const onTripDrivers = drivers.filter((d) => d.status === 'on_trip' || d.status === 'assigned').length;
  const avgDriverRating =
    drivers.filter((d) => d.rating !== null).length > 0
      ? (
          drivers
            .filter((d) => d.rating !== null)
            .reduce((s, d) => s + (Number(d.rating) || 0), 0) /
          drivers.filter((d) => d.rating !== null).length
        ).toFixed(1)
      : '—';

  // Vehicle utilization
  const assignedVehicles = vehicles.filter((v) => v.status === 'assigned').length;
  const vehicleUtilization =
    vehicles.length > 0
      ? ((assignedVehicles / vehicles.length) * 100).toFixed(1)
      : '0.0';

  // Vehicle type breakdown
  const vehicleTypeBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    completedBookings.forEach((b) => {
      const t = b.vehicle_type || 'unknown';
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completedBookings]);

  // Daily chart data
  const dailyData = useMemo(
    () => groupByDate(bookings, period),
    [bookings, period]
  );

  // Top pickup areas
  const topPickupAreas = useMemo(() => {
    const areas: Record<string, number> = {};
    completedBookings.forEach((b) => {
      const area = b.pickup_address?.split(',')[0]?.trim() || 'Unknown';
      areas[area] = (areas[area] || 0) + 1;
    });
    return Object.entries(areas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completedBookings]);

  // Top destinations
  const topDestinations = useMemo(() => {
    const areas: Record<string, number> = {};
    completedBookings.forEach((b) => {
      const area = b.destination_address?.split(',')[0]?.trim() || 'Unknown';
      areas[area] = (areas[area] || 0) + 1;
    });
    return Object.entries(areas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completedBookings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Analytics data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Period (days)', period],
      ['Total Bookings', periodBookings.length],
      ['Completed', completedBookings.length],
      ['Cancelled', cancelledBookings.length],
      ['Completion Rate (%)', completionRate],
      ['Cancellation Rate (%)', cancellationRate],
      ['Total Revenue (SAR)', totalRevenue.toFixed(2)],
      ['Cash Revenue (SAR)', cashRevenue.toFixed(2)],
      ['Online Revenue (SAR)', onlineRevenue.toFixed(2)],
      ['Average Fare (SAR)', avgFare.toFixed(2)],
      ['Active Drivers', drivers.length],
      ['Available Drivers', availableDrivers],
      ['On Trip Drivers', onTripDrivers],
      ['Average Driver Rating', avgDriverRating],
      ['Fleet Size', vehicles.length],
      ['Vehicle Utilization (%)', vehicleUtilization],
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics report exported.');
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Business Intelligence"
        badge="Reports & Analytics"
        title="Reports & Analytics"
        description="Comprehensive operational reports covering revenue trends, booking performance, driver utilization, vehicle allocation, and customer satisfaction metrics."
      >
        <div className="flex items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {([7, 14, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </AdminPageHeader>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue, settings.currency)}
          subtitle={`Last ${period} days`}
          icon={<DollarSign className="w-4.5 h-4.5" />}
          color="emerald"
        />
        <MetricCard
          title="Total Bookings"
          value={periodBookings.length}
          subtitle={`Last ${period} days`}
          icon={<CalendarCheck className="w-4.5 h-4.5" />}
          color="sky"
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedBookings.length} completed`}
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          color="emerald"
        />
        <MetricCard
          title="Cancellation Rate"
          value={`${cancellationRate}%`}
          subtitle={`${cancelledBookings.length} cancelled`}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Bookings Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Booking Volume</h3>
              <p className="text-[10px] text-slate-400">Last {period} days</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <MiniBarChart data={dailyData} valueKey="count" color="emerald" height={80} label="Number of bookings per day" />
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Revenue</h3>
              <p className="text-[10px] text-slate-400">Last {period} days • SAR</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <MiniBarChart data={dailyData} valueKey="revenue" color="sky" height={80} label="Revenue per day (SAR)" />
        </div>
      </div>

      {/* Revenue Breakdown & Driver Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Revenue Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Revenue Breakdown</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Cash Payments</span>
                <span className="font-bold text-amber-700">{formatCurrency(cashRevenue, settings.currency)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: totalRevenue > 0 ? `${(cashRevenue / totalRevenue) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Online Payments</span>
                <span className="font-bold text-sky-700">{formatCurrency(onlineRevenue, settings.currency)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all"
                  style={{ width: totalRevenue > 0 ? `${(onlineRevenue / totalRevenue) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Average Fare</span>
                <span className="font-bold text-slate-900">{formatCurrency(avgFare, settings.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Driver Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Total Drivers</span>
              <span className="font-bold text-slate-900">{drivers.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Available Now</span>
              <span className="font-bold text-emerald-700">{availableDrivers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">On Trip</span>
              <span className="font-bold text-sky-700">{onTripDrivers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Fleet Avg Rating</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <Star className="w-3 h-3" />
                {avgDriverRating}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: drivers.length > 0 ? `${(availableDrivers / drivers.length) * 100}%` : '0%' }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {drivers.length > 0
                  ? `${((availableDrivers / drivers.length) * 100).toFixed(0)}% availability rate`
                  : 'No drivers'}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Fleet Utilization</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Total Vehicles</span>
              <span className="font-bold text-slate-900">{vehicles.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Assigned</span>
              <span className="font-bold text-emerald-700">{assignedVehicles}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Available</span>
              <span className="font-bold text-sky-700">
                {vehicles.filter((v) => v.status === 'available').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Maintenance</span>
              <span className="font-bold text-amber-700">
                {vehicles.filter((v) => v.status === 'maintenance').length}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${vehicleUtilization}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{vehicleUtilization}% fleet utilization</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Type Breakdown & Top Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehicle Type Popularity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Popular Vehicle Types</h3>
          </div>
          {vehicleTypeBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400">No completed trip data available.</p>
          ) : (
            <div className="space-y-2">
              {vehicleTypeBreakdown.map(([type, count]) => {
                const pct = completedBookings.length > 0
                  ? ((count / completedBookings.length) * 100).toFixed(0)
                  : '0';
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Pickup Areas & Destinations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Top Service Areas</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Pickups</p>
              {topPickupAreas.length === 0 ? (
                <p className="text-xs text-slate-400">No data.</p>
              ) : (
                topPickupAreas.map(([area, count], i) => (
                  <div key={area} className="flex items-center gap-2 mb-1">
                    <span className="w-4 text-[10px] text-slate-400 font-bold">{i + 1}.</span>
                    <span className="flex-1 text-xs text-slate-700 truncate">{area}</span>
                    <span className="text-xs font-bold text-emerald-700">{count}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Destinations</p>
              {topDestinations.length === 0 ? (
                <p className="text-xs text-slate-400">No data.</p>
              ) : (
                topDestinations.map(([area, count], i) => (
                  <div key={area} className="flex items-center gap-2 mb-1">
                    <span className="w-4 text-[10px] text-slate-400 font-bold">{i + 1}.</span>
                    <span className="flex-1 text-xs text-slate-700 truncate">{area}</span>
                    <span className="text-xs font-bold text-sky-700">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard
          title="Total Customers"
          value={usersList.filter((u) => u.role === 'customer').length}
          subtitle="Registered pilgrims"
          icon={<Users className="w-4.5 h-4.5" />}
          tone="blue"
        />
        <AdminStatCard
          title="Staff Members"
          value={usersList.filter((u) => u.role === 'dispatcher' || u.role === 'admin').length}
          subtitle="Dispatchers & admins"
          icon={<UserCheck className="w-4.5 h-4.5" />}
          tone="purple"
        />
        <AdminStatCard
          title="Active Bookings"
          value={activeBookings.length}
          subtitle="Currently in progress"
          icon={<Clock className="w-4.5 h-4.5" />}
          tone="amber"
        />
        <AdminStatCard
          title="Cash in System"
          value={formatCurrency(cashRevenue, settings.currency)}
          subtitle="Cash payments collected"
          icon={<Banknote className="w-4.5 h-4.5" />}
          tone="amber"
        />
      </div>
    </div>
  );
}
