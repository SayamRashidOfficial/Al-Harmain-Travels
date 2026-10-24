'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { RatingFeedback } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import {
  Star,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Car,
  User,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  X,
  Phone,
  ThumbsUp,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminTableCard,
} from '@/components/admin/AdminUIComponents';
import { toast } from 'sonner';

interface EnrichedRating extends RatingFeedback {
  resolvedCustomerName?: string;
  resolvedCustomerPhone?: string;
  resolvedDriverName?: string;
  resolvedBookingRef?: string;
  resolvedPickup?: string;
  resolvedDestination?: string;
  resolvedVehicleType?: string;
  resolvedTripDate?: string;
}

export default function AdminReviewsPage() {
  const { bookings, drivers, usersList, refreshData } = useApp();

  const [ratingsList, setRatingsList] = useState<EnrichedRating[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [starFilter, setStarFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // ── Fetch Reviews directly from Supabase with joins ───────────────────────
  const fetchRatings = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from('ratings_feedback')
        .select(`
          *,
          booking:bookings(
            id,
            booking_reference,
            pickup_address,
            destination_address,
            passenger_name,
            passenger_phone,
            vehicle_type,
            created_at
          ),
          customer:profiles!customer_id(
            id,
            full_name,
            avatar_url,
            phone
          ),
          driver:drivers!driver_id(
            id,
            rating,
            total_rides,
            profile:profiles(
              full_name,
              avatar_url,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Enrich and normalize
      const enriched: EnrichedRating[] = (data || []).map((r: any) => {
        const matchedBooking = bookings.find((b) => b.id === r.booking_id);
        const matchedDriver = drivers.find((d) => d.id === r.driver_id);
        const matchedCustomer = usersList.find((u) => u.id === r.customer_id);

        const customerName =
          r.customer?.full_name ||
          matchedCustomer?.full_name ||
          r.booking?.passenger_name ||
          matchedBooking?.passenger_name ||
          'Verified Passenger';

        const customerPhone =
          r.customer?.phone ||
          matchedCustomer?.phone ||
          r.booking?.passenger_phone ||
          matchedBooking?.passenger_phone ||
          null;

        const driverName =
          r.driver?.profile?.full_name ||
          matchedDriver?.profile?.full_name ||
          matchedDriver?.full_name ||
          'Captain';

        const bookingRef =
          r.booking?.booking_reference ||
          matchedBooking?.booking_reference ||
          'N/A';

        const pickup =
          r.booking?.pickup_address ||
          matchedBooking?.pickup_address ||
          'Pickup Point';

        const destination =
          r.booking?.destination_address ||
          matchedBooking?.destination_address ||
          'Destination';

        const vehicleType =
          r.booking?.vehicle_type ||
          matchedBooking?.vehicle_type ||
          matchedDriver?.assigned_vehicle?.vehicle_type ||
          'Sedan';

        const tripDate =
          r.booking?.created_at ||
          matchedBooking?.created_at ||
          r.created_at;

        return {
          ...r,
          resolvedCustomerName: customerName,
          resolvedCustomerPhone: customerPhone,
          resolvedDriverName: driverName,
          resolvedBookingRef: bookingRef,
          resolvedPickup: pickup,
          resolvedDestination: destination,
          resolvedVehicleType: vehicleType,
          resolvedTripDate: tripDate,
        };
      });

      setRatingsList(enriched);
    } catch (err: any) {
      console.error('Failed to load ratings from Supabase:', err);
      setFetchError(err?.message || 'Unable to load real ratings from database.');
    } finally {
      setIsLoading(false);
    }
  }, [bookings, drivers, usersList]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchRatings(), refreshData()]);
      toast.success('Reviews & ratings ledger updated.');
    } catch {
      toast.error('Failed to synchronize ratings.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Rating Statistics from real database records ─────────────────────────
  const totalReviewsCount = ratingsList.length;

  const validRatings = useMemo(() => {
    return ratingsList.filter(
      (r) => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating))
    );
  }, [ratingsList]);

  const fleetAverageScore = useMemo(() => {
    if (validRatings.length === 0) return '0.0';
    const sum = validRatings.reduce((acc, curr) => acc + Number(curr.rating), 0);
    return (sum / validRatings.length).toFixed(1);
  }, [validRatings]);

  const starBreakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    validRatings.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [validRatings]);

  const fiveStarPercentage = useMemo(() => {
    if (totalReviewsCount === 0) return 0;
    return Math.round((starBreakdown[5] / totalReviewsCount) * 100);
  }, [totalReviewsCount, starBreakdown]);

  const criticalReviewsCount = useMemo(() => {
    return ratingsList.filter(
      (r) => Number(r.rating) <= 3 || r.category === 'complaint'
    ).length;
  }, [ratingsList]);

  // ── Filtered & Sorted Reviews ─────────────────────────────────────────────
  const filteredRatings = useMemo(() => {
    return ratingsList.filter((r) => {
      // Star filter
      if (starFilter !== 'all') {
        const starNum = Number(starFilter);
        if (Math.round(Number(r.rating)) !== starNum) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (r.category !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCustomer = r.resolvedCustomerName?.toLowerCase().includes(q);
        const matchDriver = r.resolvedDriverName?.toLowerCase().includes(q);
        const matchRef = r.resolvedBookingRef?.toLowerCase().includes(q);
        const matchFeedback = r.feedback?.toLowerCase().includes(q);
        const matchPickup = r.resolvedPickup?.toLowerCase().includes(q);
        const matchDest = r.resolvedDestination?.toLowerCase().includes(q);

        return (
          matchCustomer ||
          matchDriver ||
          matchRef ||
          matchFeedback ||
          matchPickup ||
          matchDest
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOrder === 'highest') {
        return Number(b.rating) - Number(a.rating);
      }
      if (sortOrder === 'lowest') {
        return Number(a.rating) - Number(b.rating);
      }
      return 0;
    });
  }, [ratingsList, starFilter, categoryFilter, searchQuery, sortOrder]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, starFilter, categoryFilter, pageSize]);

  // ── Pagination Calculation ────────────────────────────────────────────────
  const totalItems = filteredRatings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentReviewsPage = filteredRatings.slice(startIndex, endIndex);

  // Generate page numbers array
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  return (
    <div className="page-shell space-y-6">
      {/* ── 1. Top Executive Banner ────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Fleet Quality Assurance"
        badge="Direct Supabase Ledger"
        title="Customer Reviews & Chauffeur Ratings"
        description="Comprehensive real-time customer satisfaction oversight, star ratings, and verified journey feedback recorded across all Umrah, Hajj & City transfers."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-surface hover:bg-elevated border border-base text-secondary hover:text-primary transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          title="Refresh ratings from database"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Sync Reviews</span>
        </button>

        <Link
          href="/admin"
          className="px-4 py-2.5 rounded-xl bg-card hover:bg-elevated border border-base text-primary font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-emerald-500" />
          <span>Admin Overview</span>
        </Link>
      </AdminPageHeader>

      {/* ── 2. Primary Quality KPI Metric Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fleet Average */}
        <AdminStatCard
          title="Fleet Average Rating"
          value={`${fleetAverageScore} / 5.0`}
          subtitle="Overall Pilgrimage Score"
          icon={<Star className="w-4.5 h-4.5 fill-amber-500 text-amber-500" />}
          tone="amber"
        />

        {/* Total Reviews */}
        <AdminStatCard
          title="Total Recorded Reviews"
          value={totalReviewsCount}
          subtitle="Verified Journeys"
          icon={<MessageSquare className="w-4.5 h-4.5" />}
          tone="green"
        />

        {/* 5-Star Satisfaction */}
        <AdminStatCard
          title="5-Star Excellence"
          value={`${fiveStarPercentage}%`}
          subtitle={`${starBreakdown[5]} Top-Tier Ratings`}
          icon={<ThumbsUp className="w-4.5 h-4.5" />}
          tone="green"
        />

        {/* Critical or Inquiries */}
        <AdminStatCard
          title="Feedback Attention"
          value={criticalReviewsCount}
          subtitle="3 Stars or Complaints"
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          tone={criticalReviewsCount > 0 ? 'red' : 'neutral'}
        />
      </div>

      {/* ── 3. Visual Star Rating Distribution Bar ─────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-base shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base pb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Chauffeur Rating Distribution</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Breakdown of guest feedback by star level based on real database records.
            </p>
          </div>
          {starFilter !== 'all' && (
            <button
              onClick={() => setStarFilter('all')}
              className="text-xs font-semibold text-emerald-600 hover:underline self-start sm:self-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear star filter ({starFilter}★)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = (starBreakdown as any)[stars] || 0;
            const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
            const isSelected = starFilter === String(stars);

            return (
              <button
                key={stars}
                onClick={() => setStarFilter(starFilter === String(stars) ? 'all' : String(stars))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 shadow-xs'
                    : 'bg-surface/50 border-base hover:bg-elevated hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{stars} Stars</span>
                  </div>
                  <span className="font-mono font-bold text-secondary">{count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-base overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10.5px] text-muted mt-1 text-right">{pct}% of reviews</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Main Reviews Ledger Card ────────────────────────────────────── */}
      <AdminTableCard
        title="Verified Guest Reviews Ledger"
        subtitle="Individual ride reviews submitted by pilgrims with passenger and chauffeur dossier"
        badge={`${filteredRatings.length} Reviews`}
        headerAction={
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-base rounded-xl overflow-hidden bg-surface p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-card text-primary shadow-xs font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-card text-primary shadow-xs font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Detailed Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      >
        {/* Toolbar: Search, Filters, Sort */}
        <div className="p-4 border-b border-base bg-surface/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative md:w-80 shrink-0">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search passenger, chauffeur, route, review..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-default-medium rounded-xl pl-10 pr-8 py-2 text-xs text-heading placeholder:text-body focus:outline-none focus:border-brand"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Star Filter */}
            <select
              value={starFilter}
              onChange={(e) => setStarFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-xs rounded-xl focus:ring-brand focus:border-brand shadow-xs"
            >
              <option value="all">All Stars ({totalReviewsCount})</option>
              <option value="5">5 Stars only ({starBreakdown[5]})</option>
              <option value="4">4 Stars only ({starBreakdown[4]})</option>
              <option value="3">3 Stars only ({starBreakdown[3]})</option>
              <option value="2">2 Stars only ({starBreakdown[2]})</option>
              <option value="1">1 Star only ({starBreakdown[1]})</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-xs rounded-xl focus:ring-brand focus:border-brand shadow-xs"
            >
              <option value="all">All Categories</option>
              <option value="rating">General Ratings</option>
              <option value="complaint">Complaints</option>
              <option value="suggestion">Suggestions</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-xs rounded-xl focus:ring-brand focus:border-brand shadow-xs"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest">Sort: Highest Rating</option>
              <option value="lowest">Sort: Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* ── Content: Loading, Error, Empty, or Reviews ───────────────────── */}
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-40 bg-surface/50 rounded-2xl border border-base" />
              ))}
            </div>
          </div>
        ) : fetchError ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-primary">Error Loading Reviews</h4>
            <p className="text-xs text-muted max-w-md mx-auto">{fetchError}</p>
            <button
              onClick={fetchRatings}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              Retry Database Connection
            </button>
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-primary">No Passenger Reviews Found</h4>
            <p className="text-xs text-muted max-w-md mx-auto">
              {searchQuery || starFilter !== 'all' || categoryFilter !== 'all'
                ? 'No customer reviews matched your search criteria. Try resetting the filters.'
                : 'No customer reviews recorded in the database yet. As pilgrims rate completed journeys, their feedback will display here.'}
            </p>
            {(searchQuery || starFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStarFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-elevated border border-base text-primary transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Cards View */
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {currentReviewsPage.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-card border border-base hover:border-amber-500/40 hover:shadow-sm transition-all space-y-3.5 relative flex flex-col justify-between"
                >
                  {/* Top Bar: Passenger, Chauffeur, Stars */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 flex items-center justify-center font-bold text-sm shrink-0">
                          {rev.resolvedCustomerName?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                            <span>{rev.resolvedCustomerName}</span>
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Verified
                            </span>
                          </div>
                          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <span>Captain:</span>
                            <span className="font-semibold text-secondary">{rev.resolvedDriverName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        <span className="font-black text-amber-950 text-xs">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Associated Journey Route Pill */}
                    <div className="mt-3 p-2.5 rounded-xl bg-surface/60 border border-base space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-mono font-bold text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          {rev.resolvedBookingRef}
                        </span>
                        <span className="text-muted uppercase font-bold text-[10px]">
                          {rev.resolvedVehicleType?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary text-[11px] truncate mt-1">
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{rev.resolvedPickup}</span>
                        <span className="text-amber-500 shrink-0">&rarr;</span>
                        <span className="truncate">{rev.resolvedDestination}</span>
                      </div>
                    </div>

                    {/* Written Feedback / Comments */}
                    <div className="mt-3">
                      {rev.feedback ? (
                        <p className="text-xs text-primary italic bg-surface/30 p-3 rounded-xl border border-base/80 leading-relaxed">
                          &ldquo;{rev.feedback.trim()}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-muted italic bg-surface/20 p-2.5 rounded-xl border border-base/50">
                          5-star rating recorded without additional written notes.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer: Date & Category */}
                  <div className="pt-2.5 border-t border-base flex items-center justify-between text-[11px] text-muted">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(rev.created_at)}</span>
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded-md font-semibold text-[10px] bg-surface text-secondary border border-base">
                      {rev.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Detailed Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-secondary">
              <thead className="bg-surface/80 text-muted uppercase font-bold text-[10.5px] tracking-wider border-b border-base">
                <tr>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Chauffeur</th>
                  <th className="py-3.5 px-4">Booking Ref &amp; Route</th>
                  <th className="py-3.5 px-4">Feedback Note</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {currentReviewsPage.map((rev) => (
                  <tr key={rev.id} className="hover:bg-elevated/50 transition-colors">
                    {/* Stars */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg border border-amber-300 w-fit">
                        <Star className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        <span className="font-black text-amber-950 text-xs">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Passenger */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary">{rev.resolvedCustomerName}</div>
                      {rev.resolvedCustomerPhone && (
                        <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{rev.resolvedCustomerPhone}</span>
                        </div>
                      )}
                    </td>

                    {/* Driver */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-primary">{rev.resolvedDriverName}</div>
                      <div className="text-[10px] text-muted">Licensed Captain</div>
                    </td>

                    {/* Booking & Route */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-mono text-[11px] font-black text-amber-950">
                        {rev.resolvedBookingRef}
                      </div>
                      <div className="text-[11px] text-muted truncate mt-0.5">
                        {rev.resolvedPickup} &rarr; {rev.resolvedDestination}
                      </div>
                    </td>

                    {/* Feedback */}
                    <td className="py-3.5 px-4 max-w-sm">
                      {rev.feedback ? (
                        <p className="text-primary italic truncate" title={rev.feedback}>
                          &ldquo;{rev.feedback}&rdquo;
                        </p>
                      ) : (
                        <span className="text-muted italic text-[11px]">No written notes</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-surface text-secondary border border-base">
                        {rev.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-right text-muted whitespace-nowrap">
                      {formatDateTime(rev.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5. Standardized Functional Pagination (Matches User Prompt) ──── */}
        <div className="p-4 border-t border-base bg-surface/30 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Record Counter */}
          <div className="text-xs text-muted">
            Showing <span className="font-bold text-heading">{totalItems === 0 ? 0 : startIndex + 1}</span>–
            <span className="font-bold text-heading">{endIndex}</span> of{' '}
            <span className="font-bold text-heading">{totalItems}</span> reviews
          </div>

          {/* Navigation Controls conforming to user snippet */}
          <nav aria-label="Page navigation example" className="flex items-center space-x-4">
            <ul className="flex -space-x-px text-sm">
              {/* Previous Button */}
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-s-base text-sm px-3 h-9 focus:outline-none cursor-pointer ${
                    currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Previous
                </button>
              </li>

              {/* Page Numbers */}
              {pageNumbers.map((num) => {
                const isActive = num === currentPage;
                return (
                  <li key={num}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'flex items-center justify-center text-fg-brand bg-neutral-tertiary-medium box-border border border-default-medium hover:text-fg-brand font-medium text-sm w-9 h-9 focus:outline-none cursor-pointer font-bold'
                          : 'flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 text-sm w-9 h-9 focus:outline-none cursor-pointer'
                      }
                    >
                      {num}
                    </button>
                  </li>
                );
              })}

              {/* Next Button */}
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-e-base text-sm px-3 h-9 focus:outline-none cursor-pointer ${
                    currentPage === totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </li>
            </ul>

            {/* Per-Page Selector Form */}
            <form className="w-32 mx-auto" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="reviews-per-page" className="sr-only">
                Select an option
              </label>
              <select
                id="reviews-per-page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="block w-full px-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm leading-4 rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body cursor-pointer"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </form>
          </nav>
        </div>
      </AdminTableCard>
    </div>
  );
}
