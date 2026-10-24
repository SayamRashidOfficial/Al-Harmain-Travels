'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ServiceItem, VehicleType } from '@/types';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Car,
  DollarSign,
  X,
  Sparkles,
  Layers,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminActionButton,
  AdminActionGroup,
} from '@/components/admin/AdminUIComponents';
import { CardGridSkeleton, EmptyStateView } from '@/components/ui/DataStateSkeletons';

export default function AdminServicesPage() {
  const { services, addService, updateService, deleteService, toggleServiceActive, settings, isDataLoading } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [basePrice, setBasePrice] = useState<number>(300);
  const [vehicleType, setVehicleType] = useState<VehicleType>('vip_gmc');
  const [features, setFeatures] = useState<string>('Direct Haram Access\nComplimentary Zamzam\nMultilingual Captain');

  // Metrics
  const metrics = useMemo(() => {
    const total = services.length;
    const published = services.filter((s) => s.is_active).length;
    const hidden = total - published;
    return { total, published, hidden };
  }, [services]);

  const openAddModal = () => {
    setEditingServiceId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80');
    setBasePrice(350);
    setVehicleType('vip_gmc');
    setFeatures('Direct Haram Access\nComplimentary Zamzam\nMultilingual Captain');
    setModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setTitle(service.title);
    setSlug(service.slug);
    setDescription(service.description);
    setImageUrl(service.image_url || '');
    setBasePrice(service.base_price);
    setVehicleType(service.vehicle_type);
    setFeatures((service.features || []).join('\n'));
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    const featureList = features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const generatedSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (editingServiceId) {
      await updateService(editingServiceId, {
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        image_url: imageUrl.trim(),
        base_price: basePrice,
        vehicle_type: vehicleType,
        features: featureList,
      });
    } else {
      await addService({
        title: title.trim(),
        slug: generatedSlug,
        description: description.trim(),
        image_url: imageUrl.trim(),
        base_price: basePrice,
        vehicle_type: vehicleType,
        features: featureList,
        is_active: true,
      });
    }

    setModalOpen(false);
  };

  return (
    <div className="page-shell space-y-6">
      {/* ── 1. Page Header ────────────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Marketing & Catalog CMS"
        badge="Live Showcase"
        title="Services & Packages CMS"
        description="Configure public travel services, Umrah transportation bundles, and VIP airport meet-and-assist packages presented on the landing portal."
      >
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Service</span>
        </button>
      </AdminPageHeader>

      {/* ── 2. Metric Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard
          title="Total Service Packages"
          value={metrics.total}
          subtitle="Catalog offerings"
          icon={<Briefcase className="w-4.5 h-4.5" />}
          tone="neutral"
        />

        <AdminStatCard
          title="Published on Web"
          value={metrics.published}
          subtitle="Active for public bookings"
          icon={<Globe className="w-4.5 h-4.5" />}
          tone="green"
        />

        <AdminStatCard
          title="Hidden / Draft"
          value={metrics.hidden}
          subtitle="Offline packages"
          icon={<EyeOff className="w-4.5 h-4.5" />}
          tone="amber"
        />
      </div>

      {/* ── 3. Services Grid ──────────────────────────────────────────────── */}
      {isDataLoading ? (
        <CardGridSkeleton count={6} heightClass="h-72" />
      ) : services.length === 0 ? (
        <EmptyStateView
          icon={Briefcase}
          title="No Services Configured"
          description="No pilgrimage or executive chauffeur services configured in the system yet."
          actionLabel="+ Create Service"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s.id}
              className={`p-5 sm:p-6 rounded-3xl bg-card border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                s.is_active ? 'border-base hover:border-strong' : 'border-rose-500/30 opacity-75'
              }`}
            >
              <div className="space-y-4">
                <div className="relative h-44 rounded-2xl overflow-hidden bg-surface">
                  <img
                    src={
                      s.image_url ||
                      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-slate-950/85 text-xs font-black text-amber-400 border border-amber-400/30 shadow-md">
                    {s.base_price} {settings.currency}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-[10.5px] uppercase font-bold text-emerald-300 border border-emerald-500/30">
                    {s.vehicle_type?.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-primary truncate" title={s.title}>
                      {s.title}
                    </h3>
                    <AdminStatusBadge status={s.is_active ? 'published' : 'hidden'} size="sm" />
                  </div>
                  <p className="text-xs text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-base/70">
                  <span className="text-[10.5px] uppercase tracking-wider text-muted font-bold block">
                    Key Highlights:
                  </span>
                  {s.features &&
                    s.features.slice(0, 3).map((feat, idx) => (
                      <div key={idx} className="text-xs text-secondary flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons: View/Toggle -> Edit -> Delete */}
              <div className="pt-4 mt-4 border-t border-base flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleServiceActive(s.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors px-2.5 py-1.5 rounded-xl border ${
                    s.is_active
                      ? 'text-amber-950 bg-amber-100 border-amber-300 hover:bg-amber-200'
                      : 'text-emerald-900 bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
                  }`}
                >
                  {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{s.is_active ? 'Deactivate' : 'Publish to Web'}</span>
                </button>

                <AdminActionGroup>
                  <AdminActionButton
                    variant="edit"
                    tooltip="Edit service package"
                    onClick={() => openEditModal(s)}
                  />
                  <AdminActionButton
                    variant="delete"
                    tooltip="Delete service package"
                    onClick={() => deleteService(s.id)}
                  />
                </AdminActionGroup>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Add / Edit Service Modal ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-card border border-base rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-base pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">
                    {editingServiceId ? 'Edit Service Package' : 'Add New Public Service'}
                  </h3>
                  <p className="text-xs text-muted">Marketing catalog item configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="type-label block mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jeddah Airport to Makkah VIP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="type-label block mb-1">Slug URL Identifier</label>
                <input
                  type="text"
                  placeholder="auto-generated-from-title"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary font-mono placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="type-label block mb-1">Marketing Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Comprehensive description of the ride experience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1">Base Starting Price ({settings.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="type-label block mb-1">Vehicle Category</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="vip_gmc">VIP GMC Yukon</option>
                    <option value="sedan">Luxury Sedan</option>
                    <option value="suv">Family SUV</option>
                    <option value="van">Executive Van</option>
                    <option value="bus">Coach Bus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="type-label block mb-1">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary font-mono placeholder:text-muted focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="type-label block mb-1">Key Feature Highlights (One per line)</label>
                <textarea
                  rows={3}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-base">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                {editingServiceId ? 'Update Service' : 'Publish Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
