'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Car,
  Compass,
  Navigation,
  Crosshair,
  Layers,
  Search,
  Filter,
  X,
  MapPin,
  Radio,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Maximize2,
  Minimize2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Info,
  Copy,
  ExternalLink,
  Users,
  Zap,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Driver, Booking, Vehicle } from '@/types';
import {
  loadGoogleMaps,
  isValidCoordinate,
  hasGoogleMapsAuthFailed,
  onGoogleMapsAuthFailure,
} from '@/lib/maps/location-service';
import { calculateDistanceKm } from '@/lib/geo';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import MapControls, { MapViewMode } from '@/components/map/MapControls';

export type DriverTelemetryStatus =
  | 'online_available'
  | 'online_trip'
  | 'stale_gps'
  | 'offline'
  | 'location_unavailable';

export interface FleetRadarProps {
  drivers: Driver[];
  bookings: Booking[];
  selectedDriverId?: string | null;
  onSelectDriver?: (driverId: string | null) => void;
  onAssignBooking?: (driverId: string) => void;
  className?: string;
}

// 2 minutes in milliseconds determines when GPS telemetry is considered stale
const STALE_GPS_THRESHOLD_MS = 2 * 60 * 1000;

// Shortest angle rotation interpolation between two angles (0-360)
function interpolateHeading(start: number, end: number, t: number): number {
  let diff = (end - start) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (start + diff * t + 360) % 360;
}

// Format relative time (e.g., "12s ago", "3m ago", "2d ago")
function formatRelativeTime(isoString?: string | null): { text: string; isStale: boolean; ageMs: number } {
  if (!isoString) {
    return { text: 'Never recorded', isStale: true, ageMs: Infinity };
  }
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (isNaN(diffMs) || diffMs < 0) {
    return { text: 'Just now', isStale: false, ageMs: 0 };
  }

  const isStale = diffMs > STALE_GPS_THRESHOLD_MS;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 15) return { text: 'Just now', isStale, ageMs: diffMs };
  if (seconds < 60) return { text: `${seconds}s ago`, isStale, ageMs: diffMs };

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { text: `${minutes}m ago`, isStale, ageMs: diffMs };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, isStale, ageMs: diffMs };

  const days = Math.floor(hours / 24);
  return { text: `${days}d ago`, isStale, ageMs: diffMs };
}

// Determine compass card direction from degrees
function getCompassDirection(degrees?: number): string {
  if (degrees === undefined || degrees === null || isNaN(degrees)) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}

// Resolve precise driver telemetry status
export function resolveDriverTelemetryStatus(
  driver: Driver,
  activeBooking?: Booking | null
): { status: DriverTelemetryStatus; label: string; badgeColor: string; hasValidCoords: boolean; ageText: string; isStale: boolean } {
  const lat = driver.location?.latitude;
  const lng = driver.location?.longitude;
  const hasValidCoords = typeof lat === 'number' && typeof lng === 'number' && isValidCoordinate(lat, lng);
  const { text: ageText, isStale } = formatRelativeTime(driver.location?.updated_at);

  if (!hasValidCoords) {
    return {
      status: 'location_unavailable',
      label: 'Location Unavailable',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      hasValidCoords: false,
      ageText: 'No GPS Signal',
      isStale: true,
    };
  }

  if (driver.status === 'offline') {
    return {
      status: 'offline',
      label: 'Offline (Last Known)',
      badgeColor: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      hasValidCoords: true,
      ageText,
      isStale: true,
    };
  }

  if (isStale) {
    return {
      status: 'stale_gps',
      label: 'Stale GPS Telemetry',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      hasValidCoords: true,
      ageText,
      isStale: true,
    };
  }

  const isTripActive =
    driver.status === 'on_trip' ||
    driver.status === 'busy' ||
    (activeBooking &&
      ['driver_assigned', 'accepted', 'driver_accepted', 'on_the_way', 'driver_arriving', 'arrived', 'driver_arrived', 'started', 'trip_started', 'ride_started'].includes(
        activeBooking.status
      ));

  if (isTripActive) {
    return {
      status: 'online_trip',
      label: 'Active Trip In Transit',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      hasValidCoords: true,
      ageText,
      isStale: false,
    };
  }

  return {
    status: 'online_available',
    label: 'Online & Available',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    hasValidCoords: true,
    ageText,
    isStale: false,
  };
}

// Generate high quality luxury SVG marker HTML
function buildVehicleMarkerHtml(
  status: DriverTelemetryStatus,
  heading: number,
  shortName: string,
  plate: string,
  isSelected: boolean
): string {
  const configs = {
    online_available: {
      color: '#059669',
      border: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.45)',
      pulse: true,
      ringColor: '#34d399',
      tagBg: '#022c22',
    },
    online_trip: {
      color: '#6366f1',
      border: '#818cf8',
      shadow: 'rgba(99, 102, 241, 0.5)',
      pulse: true,
      ringColor: '#a5b4fc',
      tagBg: '#1e1b4b',
    },
    stale_gps: {
      color: '#d97706',
      border: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.35)',
      pulse: false,
      ringColor: '#fbbf24',
      tagBg: '#451a03',
    },
    offline: {
      color: '#475569',
      border: '#94a3b8',
      shadow: 'rgba(100, 116, 139, 0.25)',
      pulse: false,
      ringColor: '#cbd5e1',
      tagBg: '#0f172a',
    },
    location_unavailable: {
      color: '#64748b',
      border: '#94a3b8',
      shadow: 'rgba(100, 116, 139, 0.2)',
      pulse: false,
      ringColor: '#cbd5e1',
      tagBg: '#0f172a',
    },
  }[status];

  const size = isSelected ? 50 : 44;
  const pulseHtml = configs.pulse
    ? `<span style="position: absolute; inset: -6px; border-radius: 9999px; background: ${configs.ringColor}; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.5; pointer-events: none;"></span>`
    : '';

  return `
    <div class="fleet-marker-container" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none; transition: transform 0.2s ease;">
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        ${pulseHtml}
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${configs.color};
          border: 3px solid ${isSelected ? '#fbbf24' : configs.border};
          box-shadow: 0 4px 14px ${configs.shadow}, 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        ">
          <!-- Rotatable vehicle icon with heading -->
          <svg class="fleet-vehicle-svg" xmlns="http://www.w3.org/2000/svg" width="${size - 20}" height="${size - 20}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading || 0}deg); transition: transform 0.2s linear;">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.6V16c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        ${
          status === 'stale_gps'
            ? `<div style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; border-radius: 9999px; background: #f59e0b; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; z-index: 3; font-size: 10px; font-weight: bold; color: #000;">!</div>`
            : ''
        }
      </div>
      <!-- Label Pill -->
      <div style="
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 9999px;
        background: ${configs.tagBg};
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        font-family: system-ui, -apple-system, sans-serif;
        white-space: nowrap;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        border: 1px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.25)'};
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 2;
      ">
        <span>${shortName}</span>
        ${plate ? `<span style="color: #94a3b8; font-size: 9px; font-weight: 500;">• ${plate}</span>` : ''}
      </div>
    </div>
  `;
}

export default function FleetRadar({
  drivers = [],
  bookings = [],
  selectedDriverId: propSelectedDriverId,
  onSelectDriver,
  onAssignBooking,
  className = 'h-[500px] w-full',
}: FleetRadarProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<'google' | 'leaflet' | 'loading'>('loading');
  const [mapMode, setMapMode] = useState<MapViewMode>('standard');

  // Internal selection state synced with prop
  const [internalSelectedDriverId, setInternalSelectedDriverId] = useState<string | null>(
    propSelectedDriverId || null
  );

  useEffect(() => {
    if (propSelectedDriverId !== undefined) {
      setInternalSelectedDriverId(propSelectedDriverId);
    }
  }, [propSelectedDriverId]);

  const activeDriverId = propSelectedDriverId !== undefined ? propSelectedDriverId : internalSelectedDriverId;

  const handleSelectDriver = useCallback(
    (id: string | null) => {
      setInternalSelectedDriverId(id);
      if (onSelectDriver) {
        onSelectDriver(id);
      }
    },
    [onSelectDriver]
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'trip' | 'stale' | 'offline' | 'unavailable'>('all');
  const [showRosterPanel, setShowRosterPanel] = useState(false);

  // Map references
  const gMapRef = useRef<any>(null);
  const gAdvancedMarkerRef = useRef<any>(null);
  const gMarkersMapRef = useRef<Map<string, any>>(new Map());
  const gPickupMarkersMapRef = useRef<Map<string, any>>(new Map());
  const hasFitInitialBoundsRef = useRef<boolean>(false);

  // Animation tracker: stores previous and current animated coordinates per driver
  const animationStateRef = useRef<
    Map<
      string,
      {
        currentLat: number;
        currentLng: number;
        targetLat: number;
        targetLng: number;
        currentHeading: number;
        targetHeading: number;
        startTime: number;
        duration: number;
        animating: boolean;
      }
    >
  >(new Map());

  // Leaflet references
  const lMapRef = useRef<any>(null);
  const lMarkersLayerRef = useRef<any>(null);
  const lPickupLayerRef = useRef<any>(null);
  const lTileLayerRef = useRef<any>(null);
  const lMarkersMapRef = useRef<Map<string, any>>(new Map());

  // Aggregate active bookings by driver ID
  const activeBookingsByDriver = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((b) => {
      const isOngoing = ![
        'completed',
        'trip_completed',
        'ride_completed',
        'cancelled',
        'rejected',
      ].includes(b.status);
      if (isOngoing && b.assigned_driver_id) {
        map.set(b.assigned_driver_id, b);
      }
    });
    return map;
  }, [bookings]);

  // Unified driver items with live telemetry metadata
  const unifiedDrivers = useMemo(() => {
    return drivers.map((d) => {
      const activeBooking = activeBookingsByDriver.get(d.id) || null;
      const telemetry = resolveDriverTelemetryStatus(d, activeBooking);
      const shortName = (d.profile?.full_name || d.full_name || 'Captain').split(' ')[0];
      const fullName = d.profile?.full_name || d.full_name || 'Captain';
      const plate = d.vehicle?.plate_number || d.assigned_vehicle?.plate_number || '';
      const vehicleDesc = `${d.vehicle?.make || d.assigned_vehicle?.make || 'Fleet'} ${
        d.vehicle?.model || d.assigned_vehicle?.model || 'VIP'
      }`;
      const lat = d.location?.latitude;
      const lng = d.location?.longitude;
      const heading = d.location?.heading || 0;
      const speed = d.location?.speed || 0;

      return {
        driver: d,
        fullName,
        shortName,
        plate,
        vehicleDesc,
        telemetry,
        activeBooking,
        lat: typeof lat === 'number' && isValidCoordinate(lat, lng) ? lat : undefined,
        lng: typeof lng === 'number' && isValidCoordinate(lat, lng) ? lng : undefined,
        heading,
        speed,
        updatedAt: d.location?.updated_at || null,
      };
    });
  }, [drivers, activeBookingsByDriver]);

  // Selected driver object
  const selectedDriver = useMemo(() => {
    if (!activeDriverId) return null;
    return unifiedDrivers.find((ud) => ud.driver.id === activeDriverId) || null;
  }, [activeDriverId, unifiedDrivers]);

  // Statistics
  const stats = useMemo(() => {
    let liveCount = 0;
    let tripCount = 0;
    let staleCount = 0;
    let offlineCount = 0;
    let unavailableCount = 0;

    unifiedDrivers.forEach((ud) => {
      switch (ud.telemetry.status) {
        case 'online_available':
          liveCount++;
          break;
        case 'online_trip':
          tripCount++;
          break;
        case 'stale_gps':
          staleCount++;
          break;
        case 'offline':
          offlineCount++;
          break;
        case 'location_unavailable':
          unavailableCount++;
          break;
      }
    });

    return {
      total: unifiedDrivers.length,
      liveCount,
      tripCount,
      staleCount,
      offlineCount,
      unavailableCount,
    };
  }, [unifiedDrivers]);

  // Filtered drivers based on Search and Status Filter
  const filteredDrivers = useMemo(() => {
    return unifiedDrivers.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.fullName.toLowerCase().includes(q);
        const matchesPlate = item.plate.toLowerCase().includes(q);
        const matchesVeh = item.vehicleDesc.toLowerCase().includes(q);
        if (!matchesName && !matchesPlate && !matchesVeh) return false;
      }

      if (statusFilter === 'live' && item.telemetry.status !== 'online_available') return false;
      if (statusFilter === 'trip' && item.telemetry.status !== 'online_trip') return false;
      if (statusFilter === 'stale' && item.telemetry.status !== 'stale_gps') return false;
      if (statusFilter === 'offline' && item.telemetry.status !== 'offline') return false;
      if (statusFilter === 'unavailable' && item.telemetry.status !== 'location_unavailable') return false;

      return true;
    });
  }, [unifiedDrivers, searchQuery, statusFilter]);

  // Active pick-up locations from active missions (real pickup coordinates only)
  const activePickups = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          [
            'driver_assigned',
            'accepted',
            'driver_accepted',
            'on_the_way',
            'driver_arriving',
            'arrived',
            'driver_arrived',
            'started',
            'trip_started',
            'ride_started',
          ].includes(b.status) && isValidCoordinate(b.pickup_latitude, b.pickup_longitude)
      )
      .map((b) => ({
        id: b.id,
        ref: b.booking_reference,
        lat: b.pickup_latitude,
        lng: b.pickup_longitude,
        passengerName: b.passenger_name,
        address: b.pickup_address,
        driverId: b.assigned_driver_id,
      }));
  }, [bookings]);

  // Map Initialization (Google Maps with Leaflet fallback)
  useEffect(() => {
    let isMounted = true;

    const mountLeaflet = async () => {
      if (!isMounted || !mapContainerRef.current) return;

      if (gMapRef.current) {
        try {
          const google = (window as any).google;
          if (google?.maps?.event) {
            google.maps.event.clearInstanceListeners(gMapRef.current);
          }
        } catch {}
        gMapRef.current = null;
      }

      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;

        mapContainerRef.current.innerHTML = '';

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([21.4225, 39.8262], 11);

        const tileUrl =
          mapMode === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          maxZoom: 20,
          subdomains: 'abcd',
        }).addTo(map);

        lTileLayerRef.current = tileLayer;
        lPickupLayerRef.current = L.layerGroup().addTo(map);
        lMarkersLayerRef.current = L.layerGroup().addTo(map);
        lMapRef.current = map;

        setTimeout(() => {
          if (isMounted) map.invalidateSize();
        }, 200);

        setEngine('leaflet');
      } catch (lErr) {
        console.error('[Al Harmain FleetRadar] Leaflet init error:', lErr);
      }
    };

    const unsubscribeAuth = onGoogleMapsAuthFailure(() => {
      console.warn('[Al Harmain FleetRadar] Google Maps auth failure. Switching to Leaflet.');
      mountLeaflet();
    });

    async function init() {
      if (typeof window === 'undefined' || !isMounted || !mapContainerRef.current) return;

      if (hasGoogleMapsAuthFailed()) {
        mountLeaflet();
        return;
      }

      const hasGoogle = await loadGoogleMaps().catch(() => false);
      if (!isMounted || !mapContainerRef.current) return;

      if (!hasGoogle || hasGoogleMapsAuthFailed()) {
        mountLeaflet();
        return;
      }

      if ((window as any).google?.maps?.Map) {
        try {
          const google = (window as any).google;
          mapContainerRef.current.innerHTML = '';

          const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
          const map = new google.maps.Map(mapContainerRef.current, {
            center: { lat: 21.4225, lng: 39.8262 },
            zoom: 11,
            disableDefaultUI: true,
            mapId,
            mapTypeId: mapMode === 'satellite' ? 'hybrid' : 'roadmap',
            gestureHandling: 'greedy',
            clickableIcons: false,
          });

          await new Promise<void>((r) => setTimeout(r, 200));
          if (!isMounted) return;
          if (hasGoogleMapsAuthFailed()) {
            mountLeaflet();
            return;
          }

          gMapRef.current = map;

          const AdvancedMarkerElement = google.maps.marker?.AdvancedMarkerElement;
          if (AdvancedMarkerElement) {
            gAdvancedMarkerRef.current = AdvancedMarkerElement;
          } else {
            try {
              const markerLib = await google.maps.importLibrary('marker');
              if (isMounted) {
                gAdvancedMarkerRef.current = markerLib?.AdvancedMarkerElement;
              }
            } catch (err) {
              console.warn('[Al Harmain FleetRadar] Failed to load marker library:', err);
            }
          }

          if (!isMounted) return;
          setEngine('google');
          return;
        } catch (err) {
          console.warn('[Al Harmain FleetRadar] Google Maps init error, mounting Leaflet:', err);
          mountLeaflet();
          return;
        }
      }

      mountLeaflet();
    }

    init();

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Sync Map Mode (Roadmap vs Satellite)
  useEffect(() => {
    if (engine === 'google' && gMapRef.current && (window as any).google?.maps) {
      gMapRef.current.setMapTypeId(mapMode === 'satellite' ? 'hybrid' : 'roadmap');
    } else if (engine === 'leaflet' && lMapRef.current && lTileLayerRef.current) {
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        lTileLayerRef.current.remove();
        const tileUrl =
          mapMode === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const newLayer = L.tileLayer(tileUrl, { maxZoom: 20, subdomains: 'abcd' }).addTo(lMapRef.current);
        lTileLayerRef.current = newLayer;
      });
    }
  }, [mapMode, engine]);

  // Smooth Marker Animation Loop (requestAnimationFrame)
  // Glides vehicle markers smoothly between actual GPS updates without jitter
  useEffect(() => {
    let animationFrameId: number;

    const animateMarkers = () => {
      const now = performance.now();
      let hasActiveAnimations = false;

      animationStateRef.current.forEach((state, driverId) => {
        if (!state.animating) return;

        const elapsed = now - state.startTime;
        const progress = Math.min(1, elapsed / state.duration);
        // Smooth ease-out curve
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentLat = state.currentLat + (state.targetLat - state.currentLat) * easeProgress;
        const currentLng = state.currentLng + (state.targetLng - state.currentLng) * easeProgress;
        const currentHeading = interpolateHeading(state.currentHeading, state.targetHeading, easeProgress);

        if (engine === 'google') {
          const marker = gMarkersMapRef.current.get(driverId);
          if (marker) {
            marker.position = { lat: currentLat, lng: currentLng };
            // Update SVG rotation directly for fast 60fps rotation
            const svg = marker.content?.querySelector('.fleet-vehicle-svg');
            if (svg) {
              svg.style.transform = `rotate(${currentHeading}deg)`;
            }
          }
        } else if (engine === 'leaflet') {
          const marker = lMarkersMapRef.current.get(driverId);
          if (marker) {
            marker.setLatLng([currentLat, currentLng]);
            const svg = marker.getElement()?.querySelector('.fleet-vehicle-svg');
            if (svg) {
              svg.style.transform = `rotate(${currentHeading}deg)`;
            }
          }
        }

        if (progress >= 1) {
          state.currentLat = state.targetLat;
          state.currentLng = state.targetLng;
          state.currentHeading = state.targetHeading;
          state.animating = false;
        } else {
          hasActiveAnimations = true;
        }
      });

      if (hasActiveAnimations) {
        animationFrameId = requestAnimationFrame(animateMarkers);
      }
    };

    const hasAny = Array.from(animationStateRef.current.values()).some((s) => s.animating);
    if (hasAny) {
      animationFrameId = requestAnimationFrame(animateMarkers);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  });

  // Render Drivers on Map (Google Maps Engine)
  useEffect(() => {
    if (engine !== 'google' || !gMapRef.current || !gAdvancedMarkerRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;
    const map = gMapRef.current;
    const AdvancedMarkerElement = gAdvancedMarkerRef.current;
    const markersMap = gMarkersMapRef.current;
    const pickupMap = gPickupMarkersMapRef.current;
    const activeDriverKeys = new Set<string>();
    const activePickupKeys = new Set<string>();
    const allValidPoints: any[] = [];

    // 1. Process Drivers with real GPS coordinates ONLY
    filteredDrivers.forEach((item) => {
      if (item.lat === undefined || item.lng === undefined || !isValidCoordinate(item.lat, item.lng)) {
        return; // NEVER fabricate coordinates or place markers without a valid GPS coordinate
      }

      const driverId = item.driver.id;
      activeDriverKeys.add(driverId);

      const targetPos = new google.maps.LatLng(item.lat, item.lng);
      allValidPoints.push(targetPos);

      const isSelected = driverId === activeDriverId;
      const html = buildVehicleMarkerHtml(
        item.telemetry.status,
        item.heading,
        item.shortName,
        item.plate,
        isSelected
      );

      let anim = animationStateRef.current.get(driverId);
      if (!anim) {
        anim = {
          currentLat: item.lat,
          currentLng: item.lng,
          targetLat: item.lat,
          targetLng: item.lng,
          currentHeading: item.heading,
          targetHeading: item.heading,
          startTime: performance.now(),
          duration: 900,
          animating: false,
        };
        animationStateRef.current.set(driverId, anim);
      } else {
        // If coordinate moved significantly, trigger smooth animation
        const distKm = calculateDistanceKm(anim.targetLat, anim.targetLng, item.lat, item.lng);
        if (distKm > 0.0001 || Math.abs(anim.targetHeading - item.heading) > 5) {
          anim.currentLat = anim.currentLat + (anim.targetLat - anim.currentLat) * 0.5;
          anim.currentLng = anim.currentLng + (anim.targetLng - anim.currentLng) * 0.5;
          anim.targetLat = item.lat;
          anim.targetLng = item.lng;
          anim.targetHeading = item.heading;
          anim.startTime = performance.now();
          anim.animating = true;
        }
      }

      let marker = markersMap.get(driverId);
      if (!marker) {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = html;

        marker = new AdvancedMarkerElement({
          position: targetPos,
          map,
          title: `${item.fullName} (${item.telemetry.label})`,
          content: contentDiv,
          gmpClickable: true,
          zIndex: isSelected ? 300 : item.telemetry.status === 'online_trip' ? 200 : 100,
        });

        marker.addEventListener('gmp-click', () => {
          handleSelectDriver(driverId);
          map.panTo(targetPos);
        });

        markersMap.set(driverId, marker);
      } else {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = html;
        marker.content = contentDiv;
        marker.zIndex = isSelected ? 300 : item.telemetry.status === 'online_trip' ? 200 : 100;
        if (!anim.animating) {
          marker.position = targetPos;
        }
      }
    });

    // Cleanup markers that are no longer filtered or active
    for (const [key, marker] of markersMap.entries()) {
      if (!activeDriverKeys.has(key)) {
        marker.map = null;
        markersMap.delete(key);
        animationStateRef.current.delete(key);
      }
    }

    // 2. Render Active Pickup Points for Dispatched Rides
    activePickups.forEach((p) => {
      activePickupKeys.add(p.id);
      const pos = new google.maps.LatLng(p.lat, p.lng);
      allValidPoints.push(pos);

      let pMarker = pickupMap.get(p.id);
      if (!pMarker) {
        const div = document.createElement('div');
        div.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
            <div style="width: 32px; height: 32px; border-radius: 9999px; background: #047857; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(4,120,87,0.5); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 13px;">
              P
            </div>
            <div style="margin-top: 3px; padding: 1px 6px; border-radius: 9999px; background: #022c22; color: #a7f3d0; font-size: 9px; font-weight: 700; white-space: nowrap; border: 1px solid #10b981;">
              ${p.ref}
            </div>
          </div>
        `;
        pMarker = new AdvancedMarkerElement({
          position: pos,
          map,
          title: `Pickup: ${p.passengerName} (${p.ref})`,
          content: div,
          gmpClickable: true,
          zIndex: 90,
        });

        pMarker.addEventListener('gmp-click', () => {
          if (p.driverId) {
            handleSelectDriver(p.driverId);
          }
          map.panTo(pos);
        });

        pickupMap.set(p.id, pMarker);
      }
    });

    for (const [key, pMarker] of pickupMap.entries()) {
      if (!activePickupKeys.has(key)) {
        pMarker.map = null;
        pickupMap.delete(key);
      }
    }

    // Initial bounding box auto-fit
    if (allValidPoints.length > 0 && !hasFitInitialBoundsRef.current) {
      const bounds = new google.maps.LatLngBounds();
      allValidPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      hasFitInitialBoundsRef.current = true;
    }
  }, [engine, filteredDrivers, activePickups, activeDriverId, handleSelectDriver]);

  // Render Drivers on Map (Leaflet Fallback Engine)
  useEffect(() => {
    if (engine !== 'leaflet' || !lMapRef.current || !lMarkersLayerRef.current) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = lMapRef.current;
      const layer = lMarkersLayerRef.current;
      const pLayer = lPickupLayerRef.current;
      if (!layer || !map) return;

      layer.clearLayers();
      lMarkersMapRef.current.clear();
      if (pLayer) pLayer.clearLayers();

      const allLatLngs: [number, number][] = [];

      filteredDrivers.forEach((item) => {
        if (item.lat === undefined || item.lng === undefined || !isValidCoordinate(item.lat, item.lng)) return;

        allLatLngs.push([item.lat, item.lng]);
        const isSelected = item.driver.id === activeDriverId;
        const html = buildVehicleMarkerHtml(
          item.telemetry.status,
          item.heading,
          item.shortName,
          item.plate,
          isSelected
        );

        const customIcon = L.divIcon({
          html,
          className: 'leaflet-fleet-marker',
          iconSize: [isSelected ? 50 : 44, isSelected ? 50 : 44],
          iconAnchor: [isSelected ? 25 : 22, isSelected ? 25 : 22],
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(layer);
        marker.on('click', () => {
          handleSelectDriver(item.driver.id);
          map.panTo([item.lat!, item.lng!]);
        });

        lMarkersMapRef.current.set(item.driver.id, marker);
      });

      // Render pickups on Leaflet
      if (pLayer) {
        activePickups.forEach((p) => {
          allLatLngs.push([p.lat, p.lng]);
          const pIcon = L.divIcon({
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <div style="width: 28px; height: 28px; border-radius: 9999px; background: #047857; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 12px; box-shadow: 0 3px 8px rgba(0,0,0,0.3);">
                  P
                </div>
                <div style="margin-top: 2px; padding: 1px 5px; border-radius: 9999px; background: #022c22; color: #a7f3d0; font-size: 9px; font-weight: 700; border: 1px solid #10b981;">
                  ${p.ref}
                </div>
              </div>
            `,
            className: 'leaflet-pickup-marker',
            iconSize: [32, 42],
            iconAnchor: [16, 21],
          });

          const pMarker = L.marker([p.lat, p.lng], { icon: pIcon }).addTo(pLayer);
          pMarker.on('click', () => {
            if (p.driverId) handleSelectDriver(p.driverId);
            map.panTo([p.lat, p.lng]);
          });
        });
      }

      if (allLatLngs.length > 0 && !hasFitInitialBoundsRef.current) {
        try {
          map.fitBounds(allLatLngs, { padding: [50, 50] });
          hasFitInitialBoundsRef.current = true;
        } catch {}
      }
    });
  }, [engine, filteredDrivers, activePickups, activeDriverId, handleSelectDriver]);

  // Recenter / Fit All Available Drivers
  const handleRecenterAll = useCallback(() => {
    const validDrivers = unifiedDrivers.filter(
      (d) => d.lat !== undefined && d.lng !== undefined && isValidCoordinate(d.lat, d.lng)
    );

    if (validDrivers.length === 0) {
      toast.info('No drivers currently have active GPS coordinates.');
      return;
    }

    if (engine === 'google' && gMapRef.current && (window as any).google?.maps) {
      const google = (window as any).google;
      const bounds = new google.maps.LatLngBounds();
      validDrivers.forEach((d) => bounds.extend(new google.maps.LatLng(d.lat!, d.lng!)));
      gMapRef.current.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    } else if (engine === 'leaflet' && lMapRef.current) {
      const latlngs = validDrivers.map((d) => [d.lat!, d.lng!] as [number, number]);
      lMapRef.current.fitBounds(latlngs, { padding: [50, 50] });
    }
  }, [unifiedDrivers, engine]);

  // Focus single driver on map
  const handleFocusDriver = useCallback(
    (driverId: string) => {
      const target = unifiedDrivers.find((d) => d.driver.id === driverId);
      if (!target || target.lat === undefined || target.lng === undefined) {
        toast.error('This driver has no GPS coordinates recorded yet.');
        return;
      }

      handleSelectDriver(driverId);

      if (engine === 'google' && gMapRef.current) {
        gMapRef.current.panTo({ lat: target.lat, lng: target.lng });
        gMapRef.current.setZoom(16);
      } else if (engine === 'leaflet' && lMapRef.current) {
        lMapRef.current.setView([target.lat, target.lng], 16);
      }
    },
    [unifiedDrivers, engine, handleSelectDriver]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (engine === 'google' && gMapRef.current) {
      gMapRef.current.setZoom((gMapRef.current.getZoom() || 11) + 1);
    } else if (engine === 'leaflet' && lMapRef.current) {
      lMapRef.current.zoomIn();
    }
  }, [engine]);

  const handleZoomOut = useCallback(() => {
    if (engine === 'google' && gMapRef.current) {
      gMapRef.current.setZoom((gMapRef.current.getZoom() || 11) - 1);
    } else if (engine === 'leaflet' && lMapRef.current) {
      lMapRef.current.zoomOut();
    }
  }, [engine]);

  // Copy GPS Coordinates helper
  const handleCopyCoords = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    toast.success('Coordinates copied to clipboard.');
  };

  return (
    <div className="bg-card border border-base rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP RADAR HEADER & REAL-TIME CONTROLS BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-base pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
              Live Fleet GPS Telemetry Radar
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Streaming actual GPS hardware coordinates directly from drivers’ mobile devices via Supabase Realtime.
          </p>
        </div>

        {/* Quick Chauffeur Dropdown Selector & Roster toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Driver Quick Selector */}
          <div className="relative min-w-[200px]">
            <select
              value={activeDriverId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  handleSelectDriver(null);
                } else {
                  handleFocusDriver(val);
                }
              }}
              className="w-full bg-surface border border-base rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
            >
              <option value="">-- Focus a Chauffeur ({unifiedDrivers.length}) --</option>
              {unifiedDrivers.map((ud) => (
                <option key={ud.driver.id} value={ud.driver.id}>
                  {ud.fullName} • {ud.plate || 'No Plate'} ({ud.telemetry.label})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Fleet Roster Button */}
          <button
            type="button"
            onClick={() => setShowRosterPanel((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
              showRosterPanel
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20'
                : 'bg-surface border-base text-secondary hover:text-primary hover:border-emerald-500/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{showRosterPanel ? 'Hide Fleet Roster' : 'View Fleet Roster'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI STATUS SUMMARY STRIP
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {/* Total Registered */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-surface border-base hover:border-emerald-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-muted block">Registered</span>
          <span className="text-lg font-extrabold text-primary">{stats.total} Drivers</span>
        </button>

        {/* Live Available */}
        <button
          onClick={() => setStatusFilter('live')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'live'
              ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-surface border-base hover:border-emerald-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Available
          </span>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{stats.liveCount}</span>
        </button>

        {/* Active Trip */}
        <button
          onClick={() => setStatusFilter('trip')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'trip'
              ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500/40'
              : 'bg-surface border-base hover:border-indigo-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> In Transit
          </span>
          <span className="text-lg font-extrabold text-indigo-400">{stats.tripCount}</span>
        </button>

        {/* Stale GPS */}
        <button
          onClick={() => setStatusFilter('stale')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'stale'
              ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/40'
              : 'bg-surface border-base hover:border-amber-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Stale Telemetry
          </span>
          <span className="text-lg font-extrabold text-amber-500">{stats.staleCount}</span>
        </button>

        {/* Offline */}
        <button
          onClick={() => setStatusFilter('offline')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'offline'
              ? 'bg-slate-500/20 border-slate-500 ring-1 ring-slate-500/40'
              : 'bg-surface border-base hover:border-slate-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Offline</span>
          <span className="text-lg font-extrabold text-secondary">{stats.offlineCount}</span>
        </button>

        {/* Location Unavailable */}
        <button
          onClick={() => setStatusFilter('unavailable')}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'unavailable'
              ? 'bg-rose-500/20 border-rose-500 ring-1 ring-rose-500/40'
              : 'bg-surface border-base hover:border-rose-500/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-rose-400 block">No GPS Fix</span>
          <span className="text-lg font-extrabold text-rose-400">{stats.unavailableCount}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN MAP CONTAINER WITH FLOATING HUD & DETAILS
      ───────────────────────────────────────────────────────────── */}
      <div className={`relative isolate rounded-2xl overflow-hidden border border-base ${className}`}>
        {/* Map Mount Canvas */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

        {/* Floating Map Controls (Top-Right) */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCurrentLocation={handleRecenterAll}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          currentLocationTitle="Auto-fit Map to All Registered Drivers"
        />

        {/* Real-time Status Badge (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-card/95 dark:bg-slate-950/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-base flex items-center gap-2.5 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-primary">Supabase Realtime Telemetry</span>
          <span className="text-muted text-[11px] hidden sm:inline">&bull; 0ms Delay</span>
          <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {engine === 'google' ? 'Google Vector Map' : 'Leaflet Fallback'}
          </span>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. FLOATING DRIVER DETAILS CARD (WHEN DRIVER SELECTED)
        ───────────────────────────────────────────────────────────── */}
        {selectedDriver && (
          <div className="absolute top-3 left-3 z-[410] max-w-sm w-full bg-card/95 dark:bg-slate-950/95 backdrop-blur-xl border-2 border-emerald-500 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 space-y-4">
            {/* Header: Driver Name & Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-lg shrink-0 shadow-inner">
                  {selectedDriver.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-primary flex items-center gap-1.5">
                    {selectedDriver.fullName}
                  </h4>
                  <p className="text-xs text-secondary flex items-center gap-1">
                    <span>{selectedDriver.vehicleDesc}</span>
                    <span>&bull;</span>
                    <span className="font-mono font-bold text-amber-500">{selectedDriver.plate || 'NO PLATE'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectDriver(null)}
                className="w-7 h-7 rounded-full bg-surface hover:bg-elevated text-muted hover:text-primary flex items-center justify-center border border-base transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Freshness Badge */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border uppercase tracking-wider inline-flex items-center gap-1.5 ${selectedDriver.telemetry.badgeColor}`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {selectedDriver.telemetry.label}
                </span>
                <span className="text-[11px] text-muted font-mono">{selectedDriver.telemetry.ageText}</span>
              </div>
              {selectedDriver.telemetry.status === 'stale_gps' && (
                <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  GPS signal inactive. Last recorded position displayed for reference only.
                </p>
              )}
            </div>

            {/* Real-time Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-surface p-3 rounded-2xl border border-base">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Speed</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {selectedDriver.speed > 0 ? `${Math.round(selectedDriver.speed)} km/h` : '0 km/h (Stationary)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Heading</span>
                <span className="font-mono font-bold text-primary text-sm flex items-center gap-1">
                  <Navigation
                    className="w-3.5 h-3.5 text-amber-500"
                    style={{ transform: `rotate(${selectedDriver.heading}deg)` }}
                  />
                  {Math.round(selectedDriver.heading)}° {getCompassDirection(selectedDriver.heading)}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-base/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">GPS Coordinates</span>
                  <span className="font-mono text-[11px] text-secondary">
                    {selectedDriver.lat !== undefined && selectedDriver.lng !== undefined
                      ? `${selectedDriver.lat.toFixed(5)}° N, ${selectedDriver.lng.toFixed(5)}° E`
                      : 'Unavailable'}
                  </span>
                </div>
                {selectedDriver.lat !== undefined && selectedDriver.lng !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleCopyCoords(selectedDriver.lat!, selectedDriver.lng!)}
                    className="px-2 py-1 rounded-lg bg-card hover:bg-elevated border border-base text-[10px] text-muted hover:text-primary flex items-center gap-1 transition-colors"
                    title="Copy Coordinates"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
              </div>
            </div>

            {/* Assigned Mission Status */}
            {selectedDriver.activeBooking ? (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Active Assigned Trip</span>
                  <span className="font-mono font-bold text-amber-400">
                    #{selectedDriver.activeBooking.booking_reference}
                  </span>
                </div>
                <p className="font-semibold text-primary">
                  Passenger: {selectedDriver.activeBooking.passenger_name} ({selectedDriver.activeBooking.passenger_phone})
                </p>
                <p className="text-[11px] text-secondary line-clamp-1">
                  From: {selectedDriver.activeBooking.pickup_address}
                </p>
                <p className="text-[11px] text-secondary line-clamp-1">
                  To: {selectedDriver.activeBooking.destination_address}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface border border-base text-xs text-muted flex items-center justify-between">
                <span>No active trip assigned.</span>
                {onAssignBooking && (
                  <button
                    type="button"
                    onClick={() => onAssignBooking(selectedDriver.driver.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                  >
                    Assign Trip
                  </button>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleFocusDriver(selectedDriver.driver.id)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <Crosshair className="w-3.5 h-3.5" /> Center on Map
              </button>

              {selectedDriver.driver.phone && (
                <a
                  href={`tel:${selectedDriver.driver.phone}`}
                  className="py-2 px-3 rounded-xl bg-surface hover:bg-elevated text-secondary text-xs font-bold border border-base flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-500" /> Call
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. FLEET ROSTER PANEL (SLIDE / COLLAPSIBLE DRAWER)
      ───────────────────────────────────────────────────────────── */}
      {showRosterPanel && (
        <div className="bg-surface border border-base rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-bold text-primary">All Registered Fleet Chauffeurs ({filteredDrivers.length})</h4>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, plate, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-base rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No chauffeurs match the selected filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {filteredDrivers.map((ud) => {
                const isSelected = ud.driver.id === activeDriverId;
                return (
                  <div
                    key={ud.driver.id}
                    onClick={() => handleFocusDriver(ud.driver.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
                        : 'bg-card border-base hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-surface border border-base flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {ud.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-primary leading-tight">{ud.fullName}</p>
                          <p className="text-[11px] text-muted">
                            {ud.vehicleDesc} &bull; <strong className="text-amber-500 font-mono">{ud.plate || 'No Plate'}</strong>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${ud.telemetry.badgeColor}`}
                      >
                        {ud.telemetry.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-base/80">
                      <span>Last Update: {ud.telemetry.ageText}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                        {ud.lat !== undefined ? 'Track Live &rarr;' : 'No GPS Signal'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
