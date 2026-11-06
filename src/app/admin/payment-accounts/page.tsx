'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import type { PaymentAccount, PaymentAccountMethodType } from '@/types';
import {
  Building2,
  Smartphone,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  RefreshCw,
  Star,
  Copy,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Layers,
  ArrowUpDown,
  Power,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeletonRows, EmptyStateView } from '@/components/ui/DataStateSkeletons';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
  AdminTableCard,
} from '@/components/admin/AdminUIComponents';
import {
  normalizeIBAN,
  isValidSaudiIBAN,
  normalizePhoneNumber,
  isValidMobileWalletNumber,
} from '@/lib/payment-accounts';

interface AccountFormData {
  payment_method_type: PaymentAccountMethodType;
  provider_name: string;
  account_holder_name: string;
  account_number: string;
  iban: string;
  wallet_number: string;
  instructions: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

const INITIAL_FORM: AccountFormData = {
  payment_method_type: 'bank_transfer',
  provider_name: '',
  account_holder_name: '',
  account_number: '',
  iban: '',
  wallet_number: '',
  instructions: '',
  is_active: true,
  is_default: false,
  display_order: 0,
};

const PROVIDER_PRESETS: Record<PaymentAccountMethodType, string[]> = {
  bank_transfer: ['Al Rajhi Bank', 'The Saudi National Bank (SNB)', 'Riyad Bank', 'Alinma Bank', 'Banque Saudi Fransi', 'Arab National Bank'],
  stc_pay: ['STC Pay'],
  urpay: ['Urpay'],
  other: ['Apple Pay (Business)', 'Mada Corporate', 'International Wire Transfer'],
};

export default function AdminPaymentAccountsPage() {
  const {
    paymentAccounts,
    isPaymentAccountsLoading,
    refreshPaymentAccounts,
    createPaymentAccount,
    updatePaymentAccount,
    deletePaymentAccount,
    togglePaymentAccountActive,
    setDefaultPaymentAccount,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentAccountMethodType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deletingAccount, setDeletingAccount] = useState<PaymentAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy state tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (isModalOpen || deletingAccount) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deletingAccount]);

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPaymentAccounts();
      toast.success('Payment accounts refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      ...INITIAL_FORM,
      display_order: paymentAccounts.length,
      is_default: paymentAccounts.length === 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (account: PaymentAccount) => {
    setEditingAccount(account);
    setFormData({
      payment_method_type: account.payment_method_type,
      provider_name: account.provider_name,
      account_holder_name: account.account_holder_name,
      account_number: account.account_number || '',
      iban: account.iban || '',
      wallet_number: account.wallet_number || '',
      instructions: account.instructions || '',
      is_active: account.is_active,
      is_default: account.is_default,
      display_order: account.display_order ?? 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.provider_name.trim()) {
      errors.provider_name = 'Provider or Bank Name is required.';
    }
    if (!formData.account_holder_name.trim()) {
      errors.account_holder_name = 'Account Holder or Business Name is required.';
    }

    if (formData.payment_method_type === 'bank_transfer') {
      if (!formData.account_number.trim() && !formData.iban.trim()) {
        errors.account_number = 'Provide either an Account Number or an IBAN.';
      }
      if (formData.iban.trim()) {
        const normalized = normalizeIBAN(formData.iban);
        if (!isValidSaudiIBAN(normalized)) {
          errors.iban = 'Invalid Saudi IBAN. Must start with SA followed by 22 alphanumeric characters (24 total).';
        }
      }
    } else if (formData.payment_method_type === 'stc_pay' || formData.payment_method_type === 'urpay') {
      if (!formData.wallet_number.trim()) {
        errors.wallet_number = 'Mobile wallet phone number is required.';
      } else {
        const normalizedPhone = normalizePhoneNumber(formData.wallet_number);
        if (!isValidMobileWalletNumber(normalizedPhone)) {
          errors.wallet_number = 'Invalid phone number format. Must be a valid Saudi number (e.g. +9665... or 05...).';
        }
      }
    } else {
      // Other
      if (!formData.account_number.trim() && !formData.iban.trim() && !formData.wallet_number.trim()) {
        errors.account_number = 'Provide at least one identifier (Account #, IBAN, or Wallet phone).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please resolve the highlighted form errors.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PaymentAccount> = {
        payment_method_type: formData.payment_method_type,
        provider_name: formData.provider_name.trim(),
        account_holder_name: formData.account_holder_name.trim(),
        account_number: formData.account_number.trim() || null,
        iban: formData.iban.trim() ? normalizeIBAN(formData.iban) : null,
        wallet_number: formData.wallet_number.trim() ? normalizePhoneNumber(formData.wallet_number) : null,
        instructions: formData.instructions.trim() || null,
        is_active: formData.is_active,
        is_default: formData.is_default,
        display_order: Number(formData.display_order) || 0,
      };

      if (editingAccount) {
        const res = await updatePaymentAccount(editingAccount.id, payload);
        if (res) {
          setIsModalOpen(false);
        }
      } else {
        const res = await createPaymentAccount(payload);
        if (res) {
          setIsModalOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      const success = await deletePaymentAccount(deletingAccount.id);
      if (success) {
        setDeletingAccount(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Computed metrics
  const stats = useMemo(() => {
    const total = paymentAccounts.length;
    const active = paymentAccounts.filter((a) => a.is_active).length;
    const defaultAcc = paymentAccounts.find((a) => a.is_default);
    const bankCount = paymentAccounts.filter((a) => a.payment_method_type === 'bank_transfer').length;
    const walletCount = paymentAccounts.filter(
      (a) => a.payment_method_type === 'stc_pay' || a.payment_method_type === 'urpay'
    ).length;

    return { total, active, defaultAcc, bankCount, walletCount };
  }, [paymentAccounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return paymentAccounts.filter((account) => {
      // Method filter
      if (methodFilter !== 'all' && account.payment_method_type !== methodFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !account.is_active) return false;
      if (statusFilter === 'inactive' && account.is_active) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProvider = account.provider_name.toLowerCase().includes(q);
        const matchesHolder = account.account_holder_name.toLowerCase().includes(q);
        const matchesIban = account.iban?.toLowerCase().includes(q) || false;
        const matchesAcc = account.account_number?.toLowerCase().includes(q) || false;
        const matchesWallet = account.wallet_number?.toLowerCase().includes(q) || false;
        return matchesProvider || matchesHolder || matchesIban || matchesAcc || matchesWallet;
      }

      return true;
    });
  }, [paymentAccounts, methodFilter, statusFilter, searchQuery]);

  const getMethodBadge = (type: PaymentAccountMethodType) => {
    switch (type) {
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            Bank Transfer
          </span>
        );
      case 'stc_pay':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
            STC Pay
          </span>
        );
      case 'urpay':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            Urpay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
            <Wallet className="w-3.5 h-3.5 text-slate-600" />
            Other Payment
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Payment Accounts Management"
        description="Configure the official business bank accounts and mobile wallets presented to pilgrims & customers during checkout."
        eyebrow="Tariff & Finance"
        badge="Active Channels"
      >
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Account
        </button>
      </AdminPageHeader>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Configured Accounts"
          value={stats.total}
          subtitle="All business payment channels"
          icon={<Layers className="w-5 h-5 text-sky-600" />}
        />
        <AdminStatCard
          title="Active for Customers"
          value={stats.active}
          subtitle={`${stats.total - stats.active} inactive / archived`}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
          tone={stats.active > 0 ? 'green' : 'amber'}
        />
        <AdminStatCard
          title="Primary Default Account"
          value={stats.defaultAcc ? stats.defaultAcc.provider_name : 'None Set'}
          subtitle={stats.defaultAcc ? stats.defaultAcc.account_holder_name : 'Customer sees first active'}
          icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
          tone={stats.defaultAcc ? 'amber' : 'neutral'}
        />
        <AdminStatCard
          title="Provider Breakdown"
          value={`${stats.bankCount} Banks · ${stats.walletCount} Wallets`}
          subtitle="Multi-channel corporate treasury"
          icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <AdminTableCard>
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bank name, IBAN, account #, holder..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
            >
              <option value="all">All Payment Types</option>
              <option value="bank_transfer">Bank Transfers Only</option>
              <option value="stc_pay">STC Pay Only</option>
              <option value="urpay">Urpay Only</option>
              <option value="other">Other Methods</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Payment Accounts Table */}
        <div className="overflow-x-auto">
          {isPaymentAccountsLoading ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Provider &amp; Method</th>
                  <th className="py-3 px-4">Account Holder</th>
                  <th className="py-3 px-4">Account &amp; IBAN / Wallet #</th>
                  <th className="py-3 px-4">Instructions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Default</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <TableSkeletonRows rows={4} cols={7} />
              </tbody>
            </table>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-12">
              <EmptyStateView
                icon={Building2}
                title={paymentAccounts.length === 0 ? 'No Payment Accounts Created Yet' : 'No Matching Accounts'}
                description={
                  paymentAccounts.length === 0
                    ? 'Add your verified corporate Saudi bank or mobile wallet details so customers can pay during ride bookings.'
                    : 'No payment accounts match your active search and filter criteria.'
                }
                actionLabel={paymentAccounts.length === 0 ? 'Add First Account' : 'Clear Filters'}
                onAction={
                  paymentAccounts.length === 0
                    ? handleOpenAdd
                    : () => {
                      setSearchQuery('');
                      setMethodFilter('all');
                      setStatusFilter('all');
                    }
                }
              />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Provider &amp; Method</th>
                  <th className="py-3 px-4">Account Holder</th>
                  <th className="py-3 px-4">Account &amp; IBAN / Wallet #</th>
                  <th className="py-3 px-4">Instructions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Default</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAccounts.map((account) => {
                  const isCurrentDefault = account.is_default;
                  return (
                    <tr
                      key={account.id}
                      className={`hover:bg-slate-50/60 transition-colors ${!account.is_active ? 'opacity-65 bg-slate-50/30' : ''
                        }`}
                    >
                      {/* Provider & Method */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-bold text-sm">
                              {account.provider_name}
                            </strong>
                            {isCurrentDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                <Star className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                                Preferred
                              </span>
                            )}
                          </div>
                          <div>{getMethodBadge(account.payment_method_type)}</div>
                        </div>
                      </td>

                      {/* Account Holder */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {account.account_holder_name}
                        </span>
                        <span className="text-[10px] text-slate-400">Official Business Entity</span>
                      </td>

                      {/* Account Numbers / IBAN */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="space-y-1">
                          {account.iban && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-950 font-bold bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200 w-fit">
                              <span className="text-slate-500 font-sans text-[10px] uppercase font-semibold">IBAN:</span>
                              <span className="tracking-wide">{account.iban}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(account.iban!, `iban-${account.id}`, 'IBAN')}
                                className="p-0.5 hover:text-emerald-700 text-slate-500 transition-colors"
                                title="Copy IBAN"
                              >
                                {copiedKey === `iban-${account.id}` ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {account.account_number && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                              <span className="text-slate-500 font-sans text-[10px] uppercase font-semibold">Acc #:</span>
                              <span>{account.account_number}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(account.account_number!, `acc-${account.id}`, 'Account Number')}
                                className="p-0.5 hover:text-emerald-700 text-slate-500 transition-colors"
                                title="Copy Account Number"
                              >
                                {copiedKey === `acc-${account.id}` ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {account.wallet_number && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-950 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                              <span className="text-emerald-700 font-sans text-[10px] uppercase font-semibold">Wallet:</span>
                              <span>{account.wallet_number}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(account.wallet_number!, `wal-${account.id}`, 'Wallet Number')}
                                className="p-0.5 hover:text-emerald-700 text-slate-500 transition-colors"
                                title="Copy Wallet Phone"
                              >
                                {copiedKey === `wal-${account.id}` ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Instructions */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        {account.instructions ? (
                          <span className="text-slate-600 text-[11px] line-clamp-2" title={account.instructions}>
                            {account.instructions}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No custom notes</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePaymentAccountActive(account.id, !account.is_active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${account.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          title={account.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <Power className="w-3 h-3" />
                          {account.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Default Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setDefaultPaymentAccount(account.id)}
                          disabled={isCurrentDefault}
                          className={`p-1.5 rounded-xl transition-all ${isCurrentDefault
                            ? 'text-amber-500 bg-amber-50 cursor-default ring-1 ring-amber-300'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100 cursor-pointer'
                            }`}
                          title={isCurrentDefault ? 'Current Preferred Default Account' : 'Click to make preferred default'}
                        >
                          <Star className={`w-4 h-4 ${isCurrentDefault ? 'fill-amber-500' : ''}`} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(account)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Edit account details"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAccount(account)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Permanently remove account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </AdminTableCard>

      {/* MODAL: ADD / EDIT PAYMENT ACCOUNT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-700" />
                  {editingAccount ? 'Edit Payment Account' : 'Add New Business Payment Account'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This official account will be dynamically displayed to customers upon ride booking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Payment Method Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Payment Method Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                    { id: 'stc_pay', label: 'STC Pay', icon: Smartphone },
                    { id: 'urpay', label: 'Urpay', icon: Smartphone },
                    { id: 'other', label: 'Other', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = formData.payment_method_type === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const newType = m.id as PaymentAccountMethodType;
                          setFormData((prev) => ({
                            ...prev,
                            payment_method_type: newType,
                            provider_name:
                              newType === 'stc_pay'
                                ? 'STC Pay'
                                : newType === 'urpay'
                                  ? 'Urpay'
                                  : prev.provider_name === 'STC Pay' || prev.provider_name === 'Urpay'
                                    ? ''
                                    : prev.provider_name,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${isSelected
                          ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-700' : 'text-slate-400'}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider / Bank Name */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Provider or Bank Name <span className="text-rose-500">*</span>
                  </label>
                  {PROVIDER_PRESETS[formData.payment_method_type]?.length > 0 && (
                    <span className="text-[10px] text-slate-400">Suggestions available</span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="e.g. Al Rajhi Bank, SNB, STC Pay..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 ${formErrors.provider_name ? 'border-rose-300' : 'border-slate-200'
                    }`}
                />
                {/* Preset Chips */}
                {PROVIDER_PRESETS[formData.payment_method_type]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PROVIDER_PRESETS[formData.payment_method_type].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({ ...formData, provider_name: preset })}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-medium transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
                {formErrors.provider_name && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.provider_name}</p>
                )}
              </div>

              {/* Account Holder / Business Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Account Holder / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="e.g. Al Harmain VIP Transport Co."
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 ${formErrors.account_holder_name ? 'border-rose-300' : 'border-slate-200'
                    }`}
                />
                {formErrors.account_holder_name && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.account_holder_name}</p>
                )}
              </div>

              {/* Bank-Specific Fields */}
              {(formData.payment_method_type === 'bank_transfer' || formData.payment_method_type === 'other') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Account Number {formData.payment_method_type === 'bank_transfer' && <span className="text-slate-400 font-normal">(if IBAN not used)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="e.g. 8000045660801012"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                    />
                    {formErrors.account_number && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.account_number}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Saudi IBAN <span className="text-slate-400 font-normal">(SA + 22 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                      placeholder="e.g. SA44 8000 0000 0000 0000 0000"
                      className={`w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 ${formErrors.iban ? 'border-rose-300' : 'border-slate-200'
                        }`}
                    />
                    {formErrors.iban && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.iban}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Wallet Number */}
              {(formData.payment_method_type === 'stc_pay' ||
                formData.payment_method_type === 'urpay' ||
                formData.payment_method_type === 'other') && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-800">
                      Mobile Wallet Phone Number{' '}
                      {formData.payment_method_type !== 'other' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.wallet_number}
                      onChange={(e) => setFormData({ ...formData, wallet_number: e.target.value })}
                      placeholder="e.g. +966 53 190 7430 or 966531907430"
                      className={`w-full px-3 py-2 text-xs font-mono rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 ${formErrors.wallet_number ? 'border-rose-300' : 'border-slate-200'
                        }`}
                    />
                    {formErrors.wallet_number && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.wallet_number}</p>
                    )}
                  </div>
                )}

              {/* Payment Instructions / Remark */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Special Payment Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="e.g. Please include your Booking Reference in the transfer memo / remarks for instant reconciliation."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 resize-none"
                />
              </div>

              {/* Order and Status Toggles */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="account-is-active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="account-is-active" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Active for Booking
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="account-is-default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="account-is-default" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Set as Default
                  </label>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingAccount ? 'Update Account' : 'Save Account'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Payment Account?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="text-slate-800 font-semibold">
                Provider: <strong className="text-slate-950 font-bold">{deletingAccount.provider_name}</strong>
              </p>
              <p className="text-slate-600">
                Holder: <span>{deletingAccount.account_holder_name}</span>
              </p>
              {deletingAccount.iban && (
                <p className="text-slate-600 font-mono text-[11px]">
                  IBAN: {deletingAccount.iban}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Historical bookings that previously completed payments to this account will preserve their recorded payment snapshots. However, this account will immediately stop appearing in customer booking options.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
