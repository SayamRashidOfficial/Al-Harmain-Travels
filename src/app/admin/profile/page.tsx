'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase/client';
import {
  UserCircle,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  Mail,
  Phone,
  Key,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminUIComponents';
import { toast } from 'sonner';

export default function AdminProfilePage() {
  const { currentUser, updateUserProfile, uploadAvatar, changePassword } = useApp();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const success = await updateUserProfile({
        full_name: fullName,
        phone,
      });
      if (success) {
        toast.success('Profile updated successfully.');
        setIsEditingProfile(false);
      } else {
        toast.error('Failed to update profile.');
      }
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      if (url) {
        toast.success('Avatar updated.');
      } else {
        toast.error('Failed to upload avatar.');
      }
    } catch {
      toast.error('Failed to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setIsSavingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success('Password changed successfully.');
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Failed to change password.');
      }
    } catch {
      toast.error('Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCancelProfileEdit = () => {
    setFullName(currentUser.full_name || '');
    setPhone(currentUser.phone || '');
    setEmail(currentUser.email || '');
    setIsEditingProfile(false);
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="Account Management"
        badge="Admin Profile"
        title="Admin Profile"
        description="Manage your administrator account details, update profile information, and change your security credentials."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Avatar & Identity */}
        <div className="space-y-4">
          {/* Avatar Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center">
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-500/50 shadow-lg flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                {currentUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentUser.full_name || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md cursor-pointer transition-colors disabled:opacity-50"
                title="Change avatar"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              {currentUser.full_name || 'Admin User'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                <Shield className="w-3 h-3 text-amber-500" />
                System Administrator
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email Verified</span>
                <span className={`font-bold flex items-center gap-1 ${currentUser.email_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {currentUser.email_verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {currentUser.email_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              {currentUser.created_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Member Since</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(currentUser.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-800">Single Authority Account</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                This account has unrestricted administrative access to all system modules and data.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — Profile Details & Password */}
        <div className="lg:col-span-2 space-y-4">
          {/* Profile Information */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Profile Information</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Update your name and contact details.</p>
              </div>
              {!isEditingProfile ? (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelProfileEdit}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    Full Name
                  </label>
                  {isEditingProfile ? (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{currentUser.full_name || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <p className="text-sm font-semibold text-slate-700">{currentUser.email || '—'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Email cannot be changed here.</p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  {isEditingProfile ? (
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{currentUser.phone || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Role</label>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{currentUser.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  Change Password
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Update your login credentials for security.</p>
              </div>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Change
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="Current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <p className="text-[10px] text-amber-600 mt-1">Password must be at least 8 characters.</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-rose-600 mt-1">Passwords do not match.</p>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={isSavingPassword}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSavingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-xs text-slate-500">
                  Your password was last changed on{' '}
                  <span className="font-semibold text-slate-700">your last update</span>. Keep your credentials
                  secure and change your password regularly.
                </p>
              </div>
            )}
          </div>

          {/* Session Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Session Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">User ID</span>
                <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5 truncate">{currentUser.id?.slice(0, 16)}…</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Role</span>
                <p className="text-xs font-semibold text-slate-900 capitalize mt-0.5">{currentUser.role}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Account Status</span>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">{currentUser.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
