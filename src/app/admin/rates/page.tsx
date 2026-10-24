'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  TERMINAL_LABELS,
  formatFareSAR,
  resolveFixedFare,
  getVehicleLabel,
  getServiceLabel,
  getVehicleCapacity,
  isAirportRoute,
  checkRateConflict,
} from '@/lib/fixed-fare';
import type {
  TerminalCode,
  FixedFareRate,
  RateVehicleType,
  RateServiceType,
  RateRoute,
  RateTerminal,
} from '@/types';
import {
  Car,
  Route,
  Plane,
  Users,
  Luggage,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  Info,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  TableProperties,
  ArrowUpDown,
  CircleDot,
  PauseCircle,
  Tag,
  ShieldCheck,
  Coins,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
} from '@/components/admin/AdminUIComponents';

type ActiveTab = 'rates' | 'vehicles' | 'routes_terminals' | 'services';

export default function AdminRatesPage() {
  const {
    fixedFareRates,
    addBulkFixedFareRates,
    updateFixedFareRate,
    deleteFixedFareRate,
    toggleFixedFareRateStatus,
    rateVehicles,
    addRateVehicle,
    updateRateVehicle,
    deleteRateVehicle,
    rateServices,
    addRateService,
    updateRateService,
    deleteRateService,
    rateRoutes,
    addRateRoute,
    updateRateRoute,
    deleteRateRoute,
    rateTerminals,
    addRateTerminal,
    updateRateTerminal,
    deleteRateTerminal,
    refreshData,
    isDataLoading,
  } = useApp();

  // ── Tab Navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('rates');

  // ── Filters & Search (Rates Tab) ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showMatrix, setShowMatrix] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Bulk Pricing Modal State ────────────────────────────────────────────────
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRoute, setBulkRoute] = useState<string>('intercity_jeddah_makkah');
  const [bulkTerminal, setBulkTerminal] = useState<string>('all_terminals');
  const [bulkFares, setBulkFares] = useState<Record<string, string>>({});
  const [bulkIsActive, setBulkIsActive] = useState<boolean>(true);

  // ── Rate Deletion & Conflict State ─────────────────────────────────────────
  const [deletingRate, setDeletingRate] = useState<FixedFareRate | null>(null);
  const [rateDeleteConflict, setRateDeleteConflict] = useState<{ linkedBookings: number; message: string } | null>(null);

  // ── Vehicle CRUD Modals State ──────────────────────────────────────────────
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<RateVehicleType | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    category: '',
    seating_capacity: 4,
    luggage_capacity: 3,
    description: '',
    is_active: true,
  });
  const [deletingVehicle, setDeletingVehicle] = useState<RateVehicleType | null>(null);
  const [vehicleDeleteConflict, setVehicleDeleteConflict] = useState<{ linkedBookings?: number; linkedRates?: number; error: string } | null>(null);

  // ── Route CRUD Modals State ────────────────────────────────────────────────
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RateRoute | null>(null);
  const [routeForm, setRouteForm] = useState({
    route_name: '',
    origin_name: '',
    destination_name: '',
    service_id: 'intercity',
    is_airport: false,
    is_active: true,
  });
  const [deletingRoute, setDeletingRoute] = useState<RateRoute | null>(null);
  const [routeDeleteConflict, setRouteDeleteConflict] = useState<{ linkedBookings?: number; error: string } | null>(null);

  // ── Terminal CRUD Modals State ─────────────────────────────────────────────
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<RateTerminal | null>(null);
  const [terminalForm, setTerminalForm] = useState({
    name: '',
    code: '',
    route_id: 'intercity_jeddah_makkah',
    description: '',
    is_active: true,
  });
  const [deletingTerminal, setDeletingTerminal] = useState<RateTerminal | null>(null);
  const [terminalDeleteConflict, setTerminalDeleteConflict] = useState<{ linkedBookings?: number; error: string } | null>(null);

  // ── Service Category CRUD Modals State ─────────────────────────────────────
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<RateServiceType | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [deletingService, setDeletingService] = useState<RateServiceType | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Dynamic Distinct List Options ──────────────────────────────────────────
  const activeRoutesList = useMemo(() => {
    return rateRoutes && rateRoutes.length > 0 ? rateRoutes : [];
  }, [rateRoutes]);

  const activeVehiclesList = useMemo(() => {
    return rateVehicles && rateVehicles.length > 0 ? rateVehicles : [];
  }, [rateVehicles]);

  const activeServicesList = useMemo(() => {
    return rateServices && rateServices.length > 0 ? rateServices : [];
  }, [rateServices]);

  // Terminal options for bulk pricing route
  const currentBulkTerminals = useMemo(() => {
    const isAirport = isAirportRoute(bulkRoute, rateRoutes);
    if (!isAirport) return [];
    const linked = rateTerminals.filter((t) => t.is_active && (!t.route_id || t.route_id === bulkRoute));
    const list: Array<{ code: string; label: string; desc: string }> = [
      { code: 'all_terminals', label: 'All Terminals', desc: 'Uniform fixed fare across all KAIA terminals' },
    ];
    linked.forEach((t) => {
      const code = t.code || t.id;
      if (code !== 'all_terminals') {
        list.push({ code, label: t.name, desc: t.description || `Airport terminal ${t.name}` });
      }
    });
    return list;
  }, [bulkRoute, rateRoutes, rateTerminals]);

  // ── Filtered Rates Table ───────────────────────────────────────────────────
  const filteredRates = useMemo(() => {
    return fixedFareRates.filter((r) => {
      const matchVehicle = filterVehicle === 'all' || r.vehicle_category === filterVehicle;
      const matchService = filterService === 'all' || r.service_type === filterService;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && r.is_active) ||
        (filterStatus === 'inactive' && !r.is_active);

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.vehicle_category.toLowerCase().includes(q) ||
        getVehicleLabel(r.vehicle_category, rateVehicles).toLowerCase().includes(q) ||
        r.service_type.toLowerCase().includes(q) ||
        getServiceLabel(r.service_type, rateRoutes).toLowerCase().includes(q) ||
        (r.terminal && r.terminal.toLowerCase().includes(q)) ||
        (r.terminal && TERMINAL_LABELS[r.terminal as NonNullable<TerminalCode>]?.toLowerCase().includes(q));

      return matchVehicle && matchService && matchStatus && matchSearch;
    });
  }, [fixedFareRates, filterVehicle, filterService, filterStatus, searchQuery, rateVehicles, rateRoutes]);

  // ── Statistics ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = fixedFareRates.length;
    const active = fixedFareRates.filter((r) => r.is_active).length;
    const inactive = total - active;
    const vehiclesCount = activeVehiclesList.length || new Set(fixedFareRates.map((r) => r.vehicle_category)).size;
    const routesCount = activeRoutesList.length;
    return { total, active, inactive, vehiclesCount, routesCount };
  }, [fixedFareRates, activeVehiclesList, activeRoutesList]);

  // ── Matrix View Columns ────────────────────────────────────────────────────
  const matrixCols = useMemo(() => {
    const cols: { serviceType: string; terminal: TerminalCode; label: string }[] = [];
    activeRoutesList.forEach((r) => {
      if (r.is_airport) {
        cols.push({ serviceType: r.id, terminal: 'all_terminals', label: `${r.route_name} (All Terminals)` });
        const linkedTerms = rateTerminals.filter((t) => t.is_active && (!t.route_id || t.route_id === r.id));
        linkedTerms.forEach((t) => {
          if (t.code !== 'all_terminals') {
            cols.push({ serviceType: r.id, terminal: t.code, label: `${r.route_name} – ${t.name}` });
          }
        });
      } else {
        cols.push({ serviceType: r.id, terminal: null, label: r.route_name });
      }
    });
    return cols;
  }, [activeRoutesList, rateTerminals]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Live rate master refreshed from database.');
    } catch {
      toast.error('Failed to refresh rate list.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Vehicle', 'Service Route', 'Terminal', 'Capacity Seats', 'Fixed Fare SAR', 'Status'];
    const rows = filteredRates.map((r) => {
      const cap = getVehicleCapacity(r.vehicle_category, rateVehicles);
      const termLabel = r.terminal
        ? TERMINAL_LABELS[r.terminal as NonNullable<TerminalCode>] || rateTerminals.find((t) => t.code === r.terminal)?.name || r.terminal
        : 'All Terminals / City';
      return [
        `"${getVehicleLabel(r.vehicle_category, rateVehicles)}"`,
        `"${getServiceLabel(r.service_type, rateRoutes)}"`,
        `"${termLabel}"`,
        cap.passengers,
        r.fare_amount,
        r.is_active ? 'Active' : 'Inactive',
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alharmain-rate-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported Rate List CSV.');
  };

  // ── Open Bulk Pricing Modal ────────────────────────────────────────────────
  const handleOpenBulkModal = (initialRoute?: string, initialTerminal?: string | null) => {
    const chosenRoute = initialRoute || (activeRoutesList[0]?.id ?? 'intercity_jeddah_makkah');
    setBulkRoute(chosenRoute);

    const isAirport = isAirportRoute(chosenRoute, rateRoutes);
    const chosenTerm = isAirport ? initialTerminal || 'all_terminals' : 'none';
    setBulkTerminal(chosenTerm);
    setBulkIsActive(true);

    // Prepopulate existing rates for active vehicles
    const nextFares: Record<string, string> = {};
    const normTerminal = chosenTerm !== 'none' ? chosenTerm : null;

    activeVehiclesList.forEach((v) => {
      const cat = v.category || v.id;
      const existing = fixedFareRates.find(
        (r) =>
          r.vehicle_category === cat &&
          r.service_type === chosenRoute &&
          (r.terminal === normTerminal || (!r.terminal && !normTerminal))
      );
      nextFares[cat] = existing ? String(existing.fare_amount) : '';
    });

    setBulkFares(nextFares);
    setIsBulkModalOpen(true);
  };

  // ── Bulk Pricing Submit ────────────────────────────────────────────────────
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRoute) {
      toast.error('Please specify a service route.');
      return;
    }

    const isAirport = isAirportRoute(bulkRoute, rateRoutes);
    const effectiveTerminal: TerminalCode =
      isAirport && bulkTerminal !== 'none' ? (bulkTerminal as TerminalCode) : null;

    // Collect non-blank vehicle rates
    const validRates: Array<{ vehicle_category: string; fare_amount: number; id?: string }> = [];

    activeVehiclesList.forEach((v) => {
      const cat = v.category || v.id;
      const rawVal = bulkFares[cat];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        const fare = Number(rawVal);
        if (isNaN(fare) || fare <= 0) {
          toast.error(`Fixed fare for ${v.name} must be a positive number greater than 0 SAR.`);
          return;
        }

        const existing = fixedFareRates.find(
          (r) =>
            r.vehicle_category === cat &&
            r.service_type === bulkRoute &&
            (r.terminal === effectiveTerminal || (!r.terminal && !effectiveTerminal))
        );

        validRates.push({
          vehicle_category: cat,
          fare_amount: fare,
          id: existing?.id,
        });
      }
    });

    if (validRates.length === 0) {
      toast.error('Please enter a fixed fare for at least one vehicle category before submitting.');
      return;
    }

    // Duplicate & conflict validation for every vehicle
    for (const r of validRates) {
      const conflict = checkRateConflict(
        r.vehicle_category,
        bulkRoute,
        effectiveTerminal,
        fixedFareRates,
        r.id
      );

      if (conflict.hasConflict && conflict.conflictingRate?.id !== r.id) {
        toast.error(conflict.message || 'Rate conflict detected with an existing active rate.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await addBulkFixedFareRates({
        service_type: bulkRoute,
        terminal: effectiveTerminal,
        is_active: bulkIsActive,
        rates: validRates,
      });

      if (result.success) {
        setIsBulkModalOpen(false);
      }
    } catch {
      toast.error('Failed to save rate entries.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Rate Handler with Safe Conflict Check ───────────────────────────
  const handleDeleteRateClick = (rate: FixedFareRate) => {
    setRateDeleteConflict(null);
    setDeletingRate(rate);
  };

  const handleDeleteRateConfirm = async () => {
    if (!deletingRate) return;
    setIsSubmitting(true);
    try {
      const ok = await deleteFixedFareRate(deletingRate.id);
      if (ok) {
        setDeletingRate(null);
        setRateDeleteConflict(null);
      }
    } catch {
      toast.error('Failed to delete rate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateRateInstead = async () => {
    if (!deletingRate) return;
    setIsSubmitting(true);
    try {
      await updateFixedFareRate(deletingRate.id, { is_active: false });
      toast.success('Rate deactivated successfully. Historical booking fares remain preserved.');
      setDeletingRate(null);
      setRateDeleteConflict(null);
    } catch {
      toast.error('Failed to deactivate rate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Vehicle CRUD Handlers ──────────────────────────────────────────────────
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({
      name: '',
      category: '',
      seating_capacity: 4,
      luggage_capacity: 3,
      description: '',
      is_active: true,
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (v: RateVehicleType) => {
    setEditingVehicle(v);
    setVehicleForm({
      name: v.name,
      category: v.category,
      seating_capacity: v.seating_capacity,
      luggage_capacity: v.luggage_capacity,
      description: v.description || '',
      is_active: v.is_active,
    });
    setIsVehicleModalOpen(true);
  };

  const handleVehicleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.name.trim() || !vehicleForm.category.trim()) {
      toast.error('Vehicle name and category slug are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        const res = await updateRateVehicle(editingVehicle.id, {
          name: vehicleForm.name.trim(),
          category: vehicleForm.category.trim().toLowerCase(),
          seating_capacity: vehicleForm.seating_capacity,
          luggage_capacity: vehicleForm.luggage_capacity,
          description: vehicleForm.description.trim() || null,
          is_active: vehicleForm.is_active,
        });
        if (res.success) setIsVehicleModalOpen(false);
      } else {
        const vehicleId = vehicleForm.category.trim().toLowerCase();
        const res = await addRateVehicle({
          id: vehicleId,
          name: vehicleForm.name.trim(),
          category: vehicleId,
          seating_capacity: vehicleForm.seating_capacity,
          luggage_capacity: vehicleForm.luggage_capacity,
          description: vehicleForm.description.trim() || null,
          is_active: vehicleForm.is_active,
          display_order: activeVehiclesList.length + 1,
        });
        if (res.success) setIsVehicleModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicleClick = (v: RateVehicleType) => {
    setVehicleDeleteConflict(null);
    setDeletingVehicle(v);
  };

  const handleDeleteVehicleConfirm = async () => {
    if (!deletingVehicle) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRateVehicle(deletingVehicle.id);
      if (res.success) {
        setDeletingVehicle(null);
        setVehicleDeleteConflict(null);
      } else if (res.canDeactivate) {
        setVehicleDeleteConflict({
          linkedBookings: res.linkedBookings,
          error: res.error || 'Vehicle is linked to active records. Please deactivate instead.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateVehicleInstead = async () => {
    if (!deletingVehicle) return;
    setIsSubmitting(true);
    try {
      await updateRateVehicle(deletingVehicle.id, { is_active: false });
      toast.success(`Vehicle "${deletingVehicle.name}" deactivated.`);
      setDeletingVehicle(null);
      setVehicleDeleteConflict(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Route CRUD Handlers ────────────────────────────────────────────────────
  const handleOpenAddRoute = () => {
    setEditingRoute(null);
    setRouteForm({
      route_name: '',
      origin_name: '',
      destination_name: '',
      service_id: 'intercity',
      is_airport: false,
      is_active: true,
    });
    setIsRouteModalOpen(true);
  };

  const handleOpenEditRoute = (r: RateRoute) => {
    setEditingRoute(r);
    setRouteForm({
      route_name: r.route_name,
      origin_name: r.origin_name,
      destination_name: r.destination_name,
      service_id: r.service_id || 'intercity',
      is_airport: Boolean(r.is_airport),
      is_active: r.is_active,
    });
    setIsRouteModalOpen(true);
  };

  const handleRouteFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.route_name.trim() || !routeForm.origin_name.trim() || !routeForm.destination_name.trim()) {
      toast.error('Route name, pickup origin, and destination are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRoute) {
        const res = await updateRateRoute(editingRoute.id, {
          route_name: routeForm.route_name.trim(),
          origin_name: routeForm.origin_name.trim(),
          destination_name: routeForm.destination_name.trim(),
          service_id: routeForm.service_id,
          is_airport: routeForm.is_airport,
          is_active: routeForm.is_active,
        });
        if (res.success) setIsRouteModalOpen(false);
      } else {
        const routeId = routeForm.route_name
          .toLowerCase()
          .replace(/[→\s-]+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const res = await addRateRoute({
          id: routeId,
          route_name: routeForm.route_name.trim(),
          origin_name: routeForm.origin_name.trim(),
          destination_name: routeForm.destination_name.trim(),
          service_id: routeForm.service_id,
          is_airport: routeForm.is_airport,
          is_active: routeForm.is_active,
          display_order: activeRoutesList.length + 1,
        });
        if (res.success) setIsRouteModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRouteClick = (r: RateRoute) => {
    setRouteDeleteConflict(null);
    setDeletingRoute(r);
  };

  const handleDeleteRouteConfirm = async () => {
    if (!deletingRoute) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRateRoute(deletingRoute.id);
      if (res.success) {
        setDeletingRoute(null);
        setRouteDeleteConflict(null);
      } else if (res.canDeactivate) {
        setRouteDeleteConflict({
          linkedBookings: res.linkedBookings,
          error: res.error || 'Route is linked to existing bookings. Please deactivate instead.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateRouteInstead = async () => {
    if (!deletingRoute) return;
    setIsSubmitting(true);
    try {
      await updateRateRoute(deletingRoute.id, { is_active: false });
      toast.success(`Route "${deletingRoute.route_name}" deactivated.`);
      setDeletingRoute(null);
      setRouteDeleteConflict(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Terminal CRUD Handlers ─────────────────────────────────────────────────
  const handleOpenAddTerminal = () => {
    setEditingTerminal(null);
    setTerminalForm({
      name: '',
      code: '',
      route_id: activeRoutesList[0]?.id || 'intercity_jeddah_makkah',
      description: '',
      is_active: true,
    });
    setIsTerminalModalOpen(true);
  };

  const handleOpenEditTerminal = (t: RateTerminal) => {
    setEditingTerminal(t);
    setTerminalForm({
      name: t.name,
      code: t.code,
      route_id: t.route_id || activeRoutesList[0]?.id || '',
      description: t.description || '',
      is_active: t.is_active,
    });
    setIsTerminalModalOpen(true);
  };

  const handleTerminalFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalForm.name.trim() || !terminalForm.code.trim()) {
      toast.error('Terminal name and code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTerminal) {
        const res = await updateRateTerminal(editingTerminal.id, {
          name: terminalForm.name.trim(),
          code: terminalForm.code.trim().toLowerCase(),
          route_id: terminalForm.route_id || null,
          description: terminalForm.description.trim() || null,
          is_active: terminalForm.is_active,
        });
        if (res.success) setIsTerminalModalOpen(false);
      } else {
        const terminalId = terminalForm.code.trim().toLowerCase();
        const res = await addRateTerminal({
          id: terminalId,
          name: terminalForm.name.trim(),
          code: terminalId,
          route_id: terminalForm.route_id || null,
          description: terminalForm.description.trim() || null,
          is_active: terminalForm.is_active,
          display_order: rateTerminals.length + 1,
        });
        if (res.success) setIsTerminalModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTerminalClick = (t: RateTerminal) => {
    setTerminalDeleteConflict(null);
    setDeletingTerminal(t);
  };

  const handleDeleteTerminalConfirm = async () => {
    if (!deletingTerminal) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRateTerminal(deletingTerminal.id);
      if (res.success) {
        setDeletingTerminal(null);
        setTerminalDeleteConflict(null);
      } else if (res.canDeactivate) {
        setTerminalDeleteConflict({
          linkedBookings: res.linkedBookings,
          error: res.error || 'Terminal is linked to existing bookings. Please deactivate instead.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateTerminalInstead = async () => {
    if (!deletingTerminal) return;
    setIsSubmitting(true);
    try {
      await updateRateTerminal(deletingTerminal.id, { is_active: false });
      toast.success(`Terminal "${deletingTerminal.name}" deactivated.`);
      setDeletingTerminal(null);
      setTerminalDeleteConflict(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Service Category CRUD Handlers ─────────────────────────────────────────
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      is_active: true,
    });
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (s: RateServiceType) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      description: s.description || '',
      is_active: s.is_active,
    });
    setIsServiceModalOpen(true);
  };

  const handleServiceFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      toast.error('Service category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingService) {
        const res = await updateRateService(editingService.id, {
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim() || null,
          is_active: serviceForm.is_active,
        });
        if (res.success) setIsServiceModalOpen(false);
      } else {
        const slug = serviceForm.name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const res = await addRateService({
          id: slug,
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim() || null,
          is_active: serviceForm.is_active,
          display_order: activeServicesList.length + 1,
        });
        if (res.success) setIsServiceModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteServiceClick = (s: RateServiceType) => {
    setDeletingService(s);
  };

  const handleDeleteServiceConfirm = async () => {
    if (!deletingService) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRateService(deletingService.id);
      if (res.success) setDeletingService(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters =
    filterVehicle !== 'all' || filterService !== 'all' || filterStatus !== 'all' || Boolean(searchQuery);

  return (
    <div className="page-shell space-y-7 pb-20 animate-fade-in text-slate-800">
      {/* ── TOP EXECUTIVE HEADER ──────────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Tariff Master & Financial Policy"
        badge="Live Rate Master"
        title="Fixed Rates & Tariffs Master"
        description="Standardized route pricing, vehicle capacities, and KAIA airport terminal surcharges. Fares directly power customer bookings without arbitrary distance estimation."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isDataLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-base bg-surface hover:bg-elevated text-secondary hover:text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          title="Synchronize live state with database"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>{isRefreshing ? 'Syncing…' : 'Sync Live'}</span>
        </button>

        {activeTab === 'rates' && (
          <>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-base bg-surface hover:bg-elevated text-secondary hover:text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Export rate card as CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                showMatrix
                  ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                  : 'border-base bg-surface hover:bg-elevated text-secondary hover:text-primary'
              }`}
              title="Toggle table versus matrix view"
            >
              <TableProperties className="w-4 h-4" />
              <span>{showMatrix ? 'Table View' : 'Fleet Matrix'}</span>
            </button>

            <button
              onClick={() => handleOpenBulkModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Set Bulk Pricing</span>
            </button>
          </>
        )}

        {activeTab === 'vehicles' && (
          <button
            onClick={handleOpenAddVehicle}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Vehicle Type</span>
          </button>
        )}

        {activeTab === 'routes_terminals' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddRoute}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Route</span>
            </button>
            <button
              onClick={handleOpenAddTerminal}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              <Plane className="w-4 h-4 text-purple-600" />
              <span>+ Add Terminal</span>
            </button>
          </div>
        )}

        {activeTab === 'services' && (
          <button
            onClick={handleOpenAddService}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Service Category</span>
          </button>
        )}
      </AdminPageHeader>

      {/* ── METRIC STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Rates Card */}
        <AdminStatCard
          title="Configured Fares"
          value={stats.total}
          subtitle="Total fixed tariffs"
          icon={<Tag className="w-4.5 h-4.5" />}
          tone="neutral"
        />

        <AdminStatCard
          title="Active Tariffs"
          value={stats.active}
          subtitle="Bookable for travelers"
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          tone="green"
        />

        <AdminStatCard
          title="Fleet Categories"
          value={stats.vehiclesCount}
          subtitle="Passenger vehicle types"
          icon={<Car className="w-4.5 h-4.5" />}
          tone="amber"
        />

        <AdminStatCard
          title="Service Corridors"
          value={stats.routesCount}
          subtitle="Intercity & sacred routes"
          icon={<Route className="w-4.5 h-4.5" />}
          tone="blue"
        />

        <AdminStatCard
          title="KAIA Terminals"
          value={rateTerminals.length}
          subtitle="Airport flight gates"
          icon={<Plane className="w-4.5 h-4.5" />}
          tone="purple"
          className="col-span-2 sm:col-span-3 lg:col-span-1"
        />
      </div>

      {/* ── TAB NAVIGATION BUTTONS ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 border border-base rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rates'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          <span>Fixed Rates &amp; Matrix</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'rates' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-200/70 text-slate-600'}`}>
            {fixedFareRates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'vehicles'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-blue-600" />
          <span>Vehicles &amp; Capacity</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'vehicles' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-200/70 text-slate-600'}`}>
            {activeVehiclesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes_terminals')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'routes_terminals'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Route className="w-3.5 h-3.5 text-indigo-600" />
          <span>Routes &amp; Terminals</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'routes_terminals' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200/70 text-slate-600'}`}>
            {activeRoutesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          <span>Service Categories</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'services' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-200/70 text-slate-600'}`}>
            {activeServicesList.length}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: FIXED RATES & BULK PRICING
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {/* Neutral / Slate Search & Filters Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-base space-y-3.5 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rates by vehicle, route, or terminal..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Vehicle Filter (Blue Theme) */}
              <div className="w-full md:w-52">
                <select
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="all">All Vehicles ({activeVehiclesList.length})</option>
                  {activeVehiclesList.map((v) => (
                    <option key={v.id} value={v.category || v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Corridor Filter (Indigo Theme) */}
              <div className="w-full md:w-60">
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="all">All Corridors ({activeRoutesList.length})</option>
                  {activeRoutesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter (Semantic Status Theme) */}
              <div className="w-full md:w-36">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">🟢 Active Only</option>
                  <option value="inactive">🔴 Inactive Only</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>
                  Showing <strong className="text-slate-900">{filteredRates.length}</strong> of{' '}
                  <strong className="text-slate-900">{fixedFareRates.length}</strong> configured rates
                </span>
                <button
                  onClick={() => {
                    setFilterVehicle('all');
                    setFilterService('all');
                    setFilterStatus('all');
                    setSearchQuery('');
                  }}
                  className="text-blue-600 hover:underline cursor-pointer font-semibold"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Matrix View vs Table View */}
          {showMatrix ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-sm space-y-4 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-base">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-blue-600" />
                    <span>Cross-Fleet Tariff Matrix</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comprehensive cross-reference of fixed prices per vehicle category and corridor.
                  </p>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>All fares in Saudi Riyal (SAR)</span>
                </div>
              </div>

              <div className="border border-base rounded-xl overflow-x-auto min-w-[700px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4 font-bold text-blue-700">Vehicle Class</th>
                      <th className="py-3 px-4 font-bold text-center text-teal-700">Capacity</th>
                      {matrixCols.map((c, i) => (
                        <th key={i} className="py-3 px-3 font-bold text-center text-indigo-700">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {activeVehiclesList.map((v) => {
                      const cat = v.category || v.id;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
                              <Car className="w-3.5 h-3.5" />
                            </div>
                            <span>{v.name}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 border border-teal-500/20">
                              <Users className="w-3 h-3 text-teal-600" />
                              <span>{v.seating_capacity} Seats</span>
                            </span>
                          </td>
                          {matrixCols.map((c, i) => {
                            const res = resolveFixedFare(cat, c.serviceType, c.terminal, fixedFareRates);
                            return (
                              <td key={i} className="py-3 px-3 text-center">
                                {res.found ? (
                                  <span className="font-extrabold text-emerald-600 tabular-nums">
                                    {formatFareSAR(res.fare)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl bg-card border border-base shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-blue-700">Vehicle Class</th>
                      <th className="py-3.5 px-4 font-bold text-indigo-700">Service Corridor</th>
                      <th className="py-3.5 px-4 font-bold text-purple-700">Airport / Gate</th>
                      <th className="py-3.5 px-4 font-bold text-center text-teal-700">Capacity</th>
                      <th className="py-3.5 px-4 font-semibold text-right text-slate-700">Fixed Tariff (SAR)</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {isDataLoading ? (
                      <TableSkeletonRows rows={6} cols={7} />
                    ) : filteredRates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 space-y-2">
                          <Info className="w-7 h-7 text-slate-400 mx-auto" />
                          <p className="font-semibold text-sm text-slate-800">
                            No fixed rates match your search criteria
                          </p>
                          <p className="text-xs text-slate-500">
                            Clear your filter selections or use &ldquo;Set Bulk Pricing&rdquo; to add new corridor rates.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRates.map((r) => {
                        const cap = getVehicleCapacity(r.vehicle_category, rateVehicles);
                        const vLabel = getVehicleLabel(r.vehicle_category, rateVehicles);
                        const sLabel = getServiceLabel(r.service_type, rateRoutes);
                        const isAirport = isAirportRoute(r.service_type, rateRoutes);
                        const tLabel = r.terminal
                          ? TERMINAL_LABELS[r.terminal as NonNullable<TerminalCode>] ||
                            rateTerminals.find((t) => t.code === r.terminal)?.name ||
                            r.terminal
                          : isAirport
                          ? 'All KAIA Terminals'
                          : 'Standard Corridor';

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Vehicle (Blue Theme) */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                                  <Car className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{vLabel}</div>
                                  <div className="text-[10px] font-mono text-blue-600 uppercase tracking-wider">
                                    {r.vehicle_category}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Service Route (Indigo Theme) */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                <Route className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{sLabel}</span>
                              </div>
                            </td>

                            {/* Terminal (Purple Theme) */}
                            <td className="py-3.5 px-4">
                              {r.terminal ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 border border-purple-500/25">
                                  <Plane className="w-3 h-3 text-purple-600" />
                                  <span>{tLabel}</span>
                                </span>
                              ) : isAirport ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 border border-purple-500/25">
                                  <Plane className="w-3 h-3 text-purple-600" />
                                  <span>All Terminals</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>Standard City Corridor</span>
                                </span>
                              )}
                            </td>

                            {/* Capacity (Teal Theme) */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-800 text-[11px] font-semibold">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-teal-600" />
                                  <span>{cap.passengers}</span>
                                </span>
                                <span className="text-teal-400/50">•</span>
                                <span className="flex items-center gap-1">
                                  <Luggage className="w-3 h-3 text-teal-600" />
                                  <span>{cap.luggage}</span>
                                </span>
                              </div>
                            </td>

                            {/* Fixed Tariff (SAR) — Primary Visual Hierarchy */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex flex-col items-end justify-center">
                                <div className="mt-0.5 inline-flex items-baseline gap-1.5 tabular-nums">
                                  <span className="text-xs font-bold text-emerald-600">
                                    SAR
                                  </span>
                                  <span className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                                    {r.fare_amount.toLocaleString('en-SA')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status Toggle (🟢 Green Active / 🔴 Red Inactive) */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => toggleFixedFareRateStatus(r.id)}
                                title={r.is_active ? 'Active: Click to deactivate' : 'Inactive: Click to activate'}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                                  r.is_active
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20'
                                }`}
                              >
                                {r.is_active ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    <span>Inactive</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions (Blue Edit / Red Delete) */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <AdminActionGroup className="justify-end">
                                  <AdminActionButton
                                    variant="edit"
                                    tooltip="Edit corridor fixed tariffs"
                                    onClick={() => handleOpenBulkModal(r.service_type, r.terminal)}
                                  />
                                  <AdminActionButton
                                    variant="delete"
                                    tooltip="Delete fixed rate entry"
                                    onClick={() => handleDeleteRateClick(r)}
                                  />
                                </AdminActionGroup>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: VEHICLES & PASSENGER CAPACITY (BLUE & TEAL THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-base shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span>Fleet Vehicle Specifications &amp; Capacity</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define fleet categories, maximum passenger seats, and baggage allowances. Used for customer booking validations.
              </p>
            </div>
            <button
              onClick={handleOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Vehicle Type</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-base shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-blue-700">Vehicle Fleet Model</th>
                    <th className="py-3.5 px-4 font-bold text-blue-700">Internal Category Code</th>
                    <th className="py-3.5 px-4 font-bold text-center text-teal-700">Max Passengers</th>
                    <th className="py-3.5 px-4 font-bold text-center text-teal-700">Max Luggage</th>
                    <th className="py-3.5 px-4 font-bold">Description / Notes</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {activeVehiclesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No vehicle models found in database.
                      </td>
                    </tr>
                  ) : (
                    activeVehiclesList.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                              <Car className="w-4 h-4" />
                            </div>
                            <span>{v.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-blue-600">
                          {v.category || v.id}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-800 font-bold text-xs">
                            <Users className="w-3.5 h-3.5 text-teal-600" />
                            <span>{v.seating_capacity} Seats</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-800 font-bold text-xs">
                            <Luggage className="w-3.5 h-3.5 text-teal-600" />
                            <span>{v.luggage_capacity} Bags</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {v.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => updateRateVehicle(v.id, { is_active: !v.is_active })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                              v.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{v.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <AdminActionGroup className="justify-end">
                            <AdminActionButton
                              variant="edit"
                              tooltip="Edit vehicle specs & capacity"
                              onClick={() => handleOpenEditVehicle(v)}
                            />
                            <AdminActionButton
                              variant="delete"
                              tooltip="Delete vehicle class"
                              onClick={() => handleDeleteVehicleClick(v)}
                            />
                          </AdminActionGroup>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: SERVICE ROUTES (INDIGO) & AIRPORT TERMINALS (PURPLE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'routes_terminals' && (
        <div className="space-y-7">
          {/* Sub-section A: Service Routes (Indigo) */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-base shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Route className="w-4 h-4 text-indigo-600" />
                  <span>Service Corridors &amp; Travel Routes</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Origins and destinations supporting fixed tariffs and airport flight connections.
                </p>
              </div>
              <button
                onClick={handleOpenAddRoute}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Route</span>
              </button>
            </div>

            <div className="rounded-2xl bg-card border border-base shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-indigo-700">Corridor Name</th>
                      <th className="py-3.5 px-4 font-bold">Origin Pickup Point</th>
                      <th className="py-3.5 px-4 font-bold">Destination Drop-off</th>
                      <th className="py-3.5 px-4 font-bold text-center text-purple-700">KAIA Airport</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {activeRoutesList.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Route className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{r.route_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{r.origin_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{r.destination_name}</td>
                        <td className="py-3.5 px-4 text-center">
                          {r.is_airport ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/25">
                              <Plane className="w-3 h-3 text-purple-600" />
                              <span>Airport Connected</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Intercity Standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => updateRateRoute(r.id, { is_active: !r.is_active })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                              r.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{r.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <AdminActionGroup className="justify-end">
                            <AdminActionButton
                              variant="edit"
                              tooltip="Edit service corridor route"
                              onClick={() => handleOpenEditRoute(r)}
                            />
                            <AdminActionButton
                              variant="delete"
                              tooltip="Delete service corridor"
                              onClick={() => handleDeleteRouteClick(r)}
                            />
                          </AdminActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sub-section B: Airport Terminals (Purple) */}
          <div className="space-y-3.5 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-base shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-purple-600" />
                  <span>Jeddah KAIA Airport Terminals</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designated airport terminals (Terminal 1, Hajj Terminal H, North Terminal N) for flight-specific fixed rates.
                </p>
              </div>
              <button
                onClick={handleOpenAddTerminal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Terminal</span>
              </button>
            </div>

            <div className="rounded-2xl bg-card border border-base shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-purple-700">Terminal Name</th>
                      <th className="py-3.5 px-4 font-bold text-purple-700">Internal Terminal Code</th>
                      <th className="py-3.5 px-4 font-bold text-indigo-700">Linked Service Corridor</th>
                      <th className="py-3.5 px-4 font-bold">Description</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {rateTerminals.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Plane className="w-3.5 h-3.5 text-purple-600" />
                            <span>{t.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-purple-600">
                          {t.code}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {t.route_id ? getServiceLabel(t.route_id, rateRoutes) : 'All Airport Routes'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {t.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => updateRateTerminal(t.id, { is_active: !t.is_active })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                              t.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{t.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <AdminActionGroup className="justify-end">
                            <AdminActionButton
                              variant="edit"
                              tooltip="Edit airport flight terminal"
                              onClick={() => handleOpenEditTerminal(t)}
                            />
                            <AdminActionButton
                              variant="delete"
                              tooltip="Delete airport terminal"
                              onClick={() => handleDeleteTerminalClick(t)}
                            />
                          </AdminActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: SERVICE CATEGORIES (PURPLE / CATEGORY THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-base shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Service Package Categories</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Top-level operational categories organizing transportation corridors (e.g. VIP Intercity, Sacred Ziyarat, Airport Pickups).
              </p>
            </div>
            <button
              onClick={handleOpenAddService}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Service Category</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-base shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-base text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-purple-700">Category Title</th>
                    <th className="py-3.5 px-4 font-bold text-purple-700">Slug Identifier</th>
                    <th className="py-3.5 px-4 font-bold">Description</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {activeServicesList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        <span>{s.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-purple-600">{s.id}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-sm truncate">
                        {s.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => updateRateService(s.id, { is_active: !s.is_active })}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                            s.is_active
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{s.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <AdminActionGroup className="justify-end">
                          <AdminActionButton
                            variant="edit"
                            tooltip="Edit service category"
                            onClick={() => handleOpenEditService(s)}
                          />
                          <AdminActionButton
                            variant="delete"
                            tooltip="Delete service category"
                            onClick={() => handleDeleteServiceClick(s)}
                          />
                        </AdminActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: BULK VEHICLE PRICING
         ═══════════════════════════════════════════════════════════════════════ */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-base bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 border border-blue-500/20 mb-1">
                  <Tag className="w-3 h-3 text-blue-600" />
                  <span>Bulk Tariff Setup</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Configure Corridor Vehicle Fares</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define fixed Saudi Riyal tariffs for multiple fleet classes simultaneously.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Route Selection */}
              <div>
                <label className="type-label block mb-1.5 text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Service Corridor <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={bulkRoute}
                  onChange={(e) => {
                    const nextRoute = e.target.value;
                    setBulkRoute(nextRoute);
                    const isAirport = isAirportRoute(nextRoute, rateRoutes);
                    setBulkTerminal(isAirport ? 'all_terminals' : 'none');
                    // Refresh pre-filled values
                    const nextFares: Record<string, string> = {};
                    activeVehiclesList.forEach((v) => {
                      const cat = v.category || v.id;
                      const ex = fixedFareRates.find(
                        (r) =>
                          r.vehicle_category === cat &&
                          r.service_type === nextRoute &&
                          (isAirport ? r.terminal === 'all_terminals' : !r.terminal)
                      );
                      nextFares[cat] = ex ? String(ex.fare_amount) : '';
                    });
                    setBulkFares(nextFares);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500"
                >
                  {activeRoutesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name} ({r.origin_name} → {r.destination_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Terminal Selection (if Airport) */}
              {isAirportRoute(bulkRoute, rateRoutes) && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-purple-600" />
                    <label className="text-xs font-bold text-purple-900">
                      KAIA Airport Terminal Selection
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Select &ldquo;All Terminals&rdquo; to apply the tariff across all gates, or specify an individual flight terminal.
                  </p>
                  <select
                    value={bulkTerminal}
                    onChange={(e) => {
                      const term = e.target.value;
                      setBulkTerminal(term);
                      const normTerminal = term !== 'none' ? term : null;
                      const nextFares: Record<string, string> = {};
                      activeVehiclesList.forEach((v) => {
                        const cat = v.category || v.id;
                        const ex = fixedFareRates.find(
                          (r) =>
                            r.vehicle_category === cat &&
                            r.service_type === bulkRoute &&
                            (r.terminal === normTerminal || (!r.terminal && !normTerminal))
                        );
                        nextFares[cat] = ex ? String(ex.fare_amount) : '';
                      });
                      setBulkFares(nextFares);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-500"
                  >
                    {currentBulkTerminals.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vehicle Fares Entry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fleet Fixed Tariffs (SAR)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Empty vehicle rows are skipped</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeVehiclesList.map((v) => {
                    const cat = v.category || v.id;
                    const val = bulkFares[cat] ?? '';
                    const hasValue = String(val).trim() !== '';

                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          hasValue
                            ? 'bg-slate-50 border-emerald-500/40 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-blue-600" />
                            <span>{v.name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                            {v.seating_capacity} Seats
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 pointer-events-none">
                            SAR
                          </span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="e.g. 200"
                            value={val}
                            onChange={(e) => setBulkFares((prev) => ({ ...prev, [cat]: e.target.value }))}
                            className="w-full pl-12 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-emerald-700 font-extrabold text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle (Green Active / Red Inactive) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Activate Tariffs Immediately</div>
                  <div className="text-[11px] text-slate-500">
                    Active rates are immediately made bookable for customers.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkIsActive(!bulkIsActive)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    bulkIsActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${bulkIsActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{bulkIsActive ? 'Active (Live)' : 'Inactive'}</span>
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving Tariffs…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Vehicle Tariffs</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: VEHICLE TYPE CRUD MODAL (BLUE THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-base bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>{editingVehicle ? 'Edit Vehicle Type & Capacity' : 'Add New Vehicle Type'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure vehicle fleet details and passenger/luggage seating capacity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVehicleFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Vehicle Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Camry VIP, Hyundai Sonata, GMC Yukon XL"
                  value={vehicleForm.name}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Category Code Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingVehicle)}
                  placeholder="e.g. sedan, camry, sonata, staria, gmc"
                  value={vehicleForm.category}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, category: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-60"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Unique internal key matching rate entries (e.g. &ldquo;camry&rdquo;, &ldquo;sonata&rdquo;)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1 text-xs text-teal-800 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Seats (Max) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={vehicleForm.seating_capacity}
                    onChange={(e) => setVehicleForm((p) => ({ ...p, seating_capacity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="type-label block mb-1 text-xs text-teal-800 font-semibold flex items-center gap-1">
                    <Luggage className="w-3.5 h-3.5 text-teal-600" />
                    <span>Bags (Max)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    required
                    value={vehicleForm.luggage_capacity}
                    onChange={(e) => setVehicleForm((p) => ({ ...p, luggage_capacity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP executive sedan with comfortable leather interior"
                  value={vehicleForm.description}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-800">Active for bookings</span>
                <button
                  type="button"
                  onClick={() => setVehicleForm((p) => ({ ...p, is_active: !p.is_active }))}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    vehicleForm.is_active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${vehicleForm.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{vehicleForm.is_active ? 'Active' : 'Inactive'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving…' : editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: ROUTE CRUD MODAL (INDIGO THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-base bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Route className="w-4 h-4 text-indigo-600" />
                  <span>{editingRoute ? 'Edit Service Route' : 'Add New Service Route'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure corridor pickup, destination, and airport terminal linking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRouteFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Route Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jeddah → Makkah, Taif Sacred Ziyarat"
                  value={routeForm.route_name}
                  onChange={(e) => setRouteForm((p) => ({ ...p, route_name: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                    Origin Pickup Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jeddah KAIA Airport"
                    value={routeForm.origin_name}
                    onChange={(e) => setRouteForm((p) => ({ ...p, origin_name: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                    Destination Drop-off <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Makkah Al-Mukarramah"
                    value={routeForm.destination_name}
                    onChange={(e) => setRouteForm((p) => ({ ...p, destination_name: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Service Category
                </label>
                <select
                  value={routeForm.service_id}
                  onChange={(e) => setRouteForm((p) => ({ ...p, service_id: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {activeServicesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-purple-600" />
                    <span>Involves Airport KAIA</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Enables terminal selection (Terminal 1, H, N) for customer bookings
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={routeForm.is_airport}
                  onChange={(e) => setRouteForm((p) => ({ ...p, is_airport: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving…' : editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: TERMINAL CRUD MODAL (PURPLE THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-base bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-purple-600" />
                  <span>{editingTerminal ? 'Edit Airport Terminal' : 'Add Airport Terminal'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure terminal designation, slug code, and linked corridor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTerminalModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTerminalFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Terminal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Terminal 1, Terminal H (Hajj), Terminal N"
                  value={terminalForm.name}
                  onChange={(e) => setTerminalForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Terminal Code Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. terminal_1, terminal_h, terminal_n"
                  value={terminalForm.code}
                  onChange={(e) => setTerminalForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Linked Service Corridor
                </label>
                <select
                  value={terminalForm.route_id}
                  onChange={(e) => setTerminalForm((p) => ({ ...p, route_id: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  {activeRoutesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. New main international & Saudia terminal"
                  value={terminalForm.description}
                  onChange={(e) => setTerminalForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving…' : editingTerminal ? 'Update Terminal' : 'Create Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: SERVICE CATEGORY CRUD MODAL (PURPLE THEME)
         ═══════════════════════════════════════════════════════════════════════ */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-base bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>{editingService ? 'Edit Service Category' : 'Add Service Category'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-level category grouping transportation corridors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleServiceFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Intercity Transfer, Sacred Ziyarat Tours"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="type-label block mb-1 text-xs text-slate-700 font-semibold">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Luxury direct highway transfers with meet & greet"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving…' : editingService ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SAFE DELETION MODALS (WITH BOOKING CONFLICT & DEACTIVATE OPTION)
         ═══════════════════════════════════════════════════════════════════════ */}
      {/* Rate Deletion Modal */}
      {deletingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Fixed Rate Tariff?</h3>
              <p className="text-xs text-slate-500">
                This will remove the standard tariff for{' '}
                <strong className="text-blue-700">{getVehicleLabel(deletingRate.vehicle_category, rateVehicles)}</strong>{' '}
                on route{' '}
                <strong className="text-indigo-700">{getServiceLabel(deletingRate.service_type, rateRoutes)}</strong> (
                <span className="font-bold text-emerald-600">{formatFareSAR(deletingRate.fare_amount)}</span>).
              </p>
            </div>

            {rateDeleteConflict && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2 font-medium">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Linked Historical Bookings Detected</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {rateDeleteConflict.message}
                </p>
                <button
                  type="button"
                  onClick={handleDeactivateRateInstead}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Deactivate Rate Instead (Safe)
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRateConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting…' : 'Delete Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Deletion Modal */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <Car className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Vehicle Type?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete vehicle type{' '}
                <strong className="text-blue-700">&ldquo;{deletingVehicle.name}&rdquo;</strong>?
              </p>
            </div>

            {vehicleDeleteConflict && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2 font-medium">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Cannot Delete: Record in Active Use</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {vehicleDeleteConflict.error}
                </p>
                <button
                  type="button"
                  onClick={handleDeactivateVehicleInstead}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Deactivate Vehicle Instead (Recommended)
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVehicleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting…' : 'Delete Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Deletion Modal */}
      {deletingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <Route className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Service Route?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete route{' '}
                <strong className="text-indigo-700">&ldquo;{deletingRoute.route_name}&rdquo;</strong>?
              </p>
            </div>

            {routeDeleteConflict && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2 font-medium">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Linked Booking Records Detected</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {routeDeleteConflict.error}
                </p>
                <button
                  type="button"
                  onClick={handleDeactivateRouteInstead}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Deactivate Route Instead
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRoute(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRouteConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting…' : 'Delete Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Deletion Modal */}
      {deletingTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <Plane className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Airport Terminal?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete terminal{' '}
                <strong className="text-purple-700">&ldquo;{deletingTerminal.name}&rdquo;</strong>?
              </p>
            </div>

            {terminalDeleteConflict && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2 font-medium">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Linked Booking Records Detected</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {terminalDeleteConflict.error}
                </p>
                <button
                  type="button"
                  onClick={handleDeactivateTerminalInstead}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Deactivate Terminal Instead
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTerminal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTerminalConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting…' : 'Delete Terminal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Category Deletion Modal */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-base rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <Layers className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Service Category?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete service category{' '}
                <strong className="text-purple-700">&ldquo;{deletingService.name}&rdquo;</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteServiceConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Deleting…' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
