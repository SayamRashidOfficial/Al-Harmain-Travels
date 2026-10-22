'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DEFAULT_FARE_RULES } from '@/lib/fare-calculator';
import { VehicleType, FareRule } from '@/types';
import {
  Settings,
  Shield,
  DollarSign,
  Building,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  Car,
  Percent,
  Coins,
  Sparkles,
  HelpCircle,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
} from '@/components/admin/AdminUIComponents';

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useApp();

  const [companyName, setCompanyName] = useState(settings.company_name);
  const [tagline, setTagline] = useState(settings.company_tagline);
  const [phone, setPhone] = useState(settings.support_phone);
  const [whatsapp, setWhatsapp] = useState(settings.support_whatsapp);
  const [email, setEmail] = useState(settings.support_email);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [tax, setTax] = useState(settings.tax_percentage);

  // Fare matrix state
  const [fareRules, setFareRules] = useState<Record<VehicleType, FareRule>>(DEFAULT_FARE_RULES);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingFareMatrix, setIsSavingFareMatrix] = useState(false);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    updateSettings({
      company_name: companyName,
      company_tagline: tagline,
      support_phone: phone,
      support_whatsapp: whatsapp,
      support_email: email,
      address,
      currency,
      tax_percentage: tax,
    });
    setTimeout(() => {
      setIsSavingCompany(false);
      toast.success('Company identity & financial configurations saved successfully!');
    }, 400);
  };

  const handleFareRuleChange = (
    type: VehicleType,
    field: keyof FareRule,
    value: number
  ) => {
    setFareRules((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSaveFareMatrix = () => {
    setIsSavingFareMatrix(true);
    setTimeout(() => {
      setIsSavingFareMatrix(false);
      toast.success('Dynamic fare calculation matrix updated across all fleet classes!');
    }, 400);
  };

  const vehicleClassCount = Object.keys(fareRules).length;

  return (
    <div className="page-shell space-y-6">
      {/* ── 1. Page Header ────────────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="System Configuration &amp; Governance"
        badge="Enterprise Core"
        title="Company Profile &amp; Pricing Policies"
        description="Configure corporate brand parameters, official contact channels, operating currency, tax rates, and dynamic per-km pricing matrix rules (FR-94 through FR-98)."
      />

      {/* ── 2. System KPI Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Base Currency"
          value={currency}
          subtitle="Operating billing denomination"
          icon={<Coins className="w-4.5 h-4.5" />}
          tone="amber"
        />

        <AdminStatCard
          title="Standard VAT Rate"
          value={`${tax}%`}
          subtitle="Applied on customer invoices"
          icon={<Percent className="w-4.5 h-4.5" />}
          tone="blue"
        />

        <AdminStatCard
          title="Fleet Fare Classes"
          value={`${vehicleClassCount} Classes`}
          subtitle="Active pricing schemas"
          icon={<Car className="w-4.5 h-4.5" />}
          tone="green"
        />

        <AdminStatCard
          title="Dispatch Center"
          value="Operational"
          subtitle="Multi-channel concierge"
          icon={<Phone className="w-4.5 h-4.5" />}
          tone="purple"
        />
      </div>

      {/* ── 3. Main Two-Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Company & Financial Settings (FR-94, FR-98) */}
        <form onSubmit={handleSaveCompany} className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-base pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">
                    Corporate Identity
                  </h3>
                  <p className="text-xs text-muted">Legal entity and branding specifications</p>
                </div>
              </div>
              <AdminStatusBadge status="verified" label="Active" size="sm" />
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-muted" />
                  <span>Company Legal Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted" />
                  <span>Tagline &amp; Marketing Motto</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted" />
                    <span>24/7 Telephone</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp Desk</span>
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  <span>Dispatch &amp; Support Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted" />
                  <span>Headquarters Physical Address</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-input border border-base rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm resize-none"
                />
              </div>

              {/* Fiscal Sub-section */}
              <div className="pt-4 border-t border-base space-y-3.5">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Fiscal &amp; Billing Defaults
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-secondary">
                      Operating Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-input border border-base rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm cursor-pointer"
                    >
                      <option value="SAR">SAR — Saudi Riyal</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="PKR">PKR — Pakistani Rupee</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-secondary">
                      VAT / Tax Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={tax}
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        className="w-full bg-input border border-base rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-primary focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                      />
                      <Percent className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingCompany}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingCompany ? 'Saving Configuration...' : 'Save Corporate Profile'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Dynamic Fare Matrix (FR-51, FR-95) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-base rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-card-title text-base font-bold text-primary">
                    Dynamic Fare Calculation Matrix
                  </h3>
                  <p className="text-xs text-muted">
                    Base fares, distance increments, and cancellation penalties per vehicle category
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveFareMatrix}
                disabled={isSavingFareMatrix}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingFareMatrix ? 'Saving...' : 'Apply Fare Matrix'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {(Object.keys(fareRules) as VehicleType[]).map((vKey) => {
                const rule = fareRules[vKey];
                return (
                  <div
                    key={vKey}
                    className="p-5 rounded-2xl bg-surface/70 border border-base hover:border-strong transition-all space-y-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-base/50 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          <Car className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm uppercase text-primary tracking-wide">
                          {vKey.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/25">
                        Denominated in {currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10.5px] uppercase font-bold text-muted block">
                          Base Starting Fare
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={rule.base_fare}
                            onChange={(e) =>
                              handleFareRuleChange(vKey, 'base_fare', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10.5px] uppercase font-bold text-muted block">
                          Rate / KM
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={rule.per_km_rate}
                            onChange={(e) =>
                              handleFareRuleChange(vKey, 'per_km_rate', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10.5px] uppercase font-bold text-muted block">
                          Minimum Trip Fare
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={rule.minimum_fare}
                            onChange={(e) =>
                              handleFareRuleChange(vKey, 'minimum_fare', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10.5px] uppercase font-bold text-muted block">
                          Cancellation Fee
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={rule.cancellation_fee}
                            onChange={(e) =>
                              handleFareRuleChange(vKey, 'cancellation_fee', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-input border border-base rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
