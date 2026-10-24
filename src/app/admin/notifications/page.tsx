'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationItem } from '@/context/AppContext';
import { formatDateTime } from '@/lib/utils';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Car,
  X,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  AdminTableCard,
  AdminPagination,
} from '@/components/admin/AdminUIComponents';
import { EmptyStateView } from '@/components/ui/DataStateSkeletons';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-sky-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  ride: <Car className="w-4 h-4 text-purple-500" />,
};

const TYPE_BG: Record<string, string> = {
  info: 'bg-sky-50 border-sky-200',
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  ride: 'bg-purple-50 border-purple-200',
};

function ComposeNotificationModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (title: string, message: string, type: NotificationItem['type']) => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationItem['type']>('info');

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    onSend(title, message, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-600" />
            Compose Notification
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {(['info', 'success', 'warning', 'ride'] as NotificationItem['type'][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    type === t
                      ? TYPE_BG[t] + ' border-current'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {TYPE_ICONS[t]}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Notification title..."
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none"
              placeholder="Notification message..."
            />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-200">
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            Send Notification
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const { notifications, markNotificationAsRead, clearNotifications, addNotification } = useApp();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filtered = notifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.read) return false;
    if (readFilter === 'read' && !n.read) return false;
    return true;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalCount = notifications.length;
  const infoCount = notifications.filter((n) => n.type === 'info').length;
  const warningCount = notifications.filter((n) => n.type === 'warning').length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) markNotificationAsRead(n.id);
    });
    toast.success('All notifications marked as read.');
  };

  const handleSendNotification = (title: string, message: string, type: NotificationItem['type']) => {
    addNotification(title, message, type, 'admin');
    toast.success('Notification added.');
  };

  return (
    <div className="page-shell space-y-6">
      <AdminPageHeader
        eyebrow="System Operations"
        badge="Notification Center"
        title="Notifications"
        description="Review and manage system notifications, booking alerts, and operational messages. Mark items as read or compose new notifications."
      >
        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
          <button
            onClick={() => setShowCompose(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Compose
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AdminStatCard title="Total Notifications" value={totalCount} subtitle="All messages" icon={<Bell className="w-4.5 h-4.5" />} tone="neutral" />
        <AdminStatCard title="Unread" value={unreadCount} subtitle="Pending review" icon={<BellRing className="w-4.5 h-4.5" />} tone="amber" />
        <AdminStatCard title="Informational" value={infoCount} subtitle="Info messages" icon={<Info className="w-4.5 h-4.5" />} tone="blue" />
        <AdminStatCard title="Warnings" value={warningCount} subtitle="Alert messages" icon={<AlertTriangle className="w-4.5 h-4.5" />} tone="red" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'info', 'success', 'warning', 'ride'].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                typeFilter === t
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['all', 'unread', 'read'].map((r) => (
            <button
              key={r}
              onClick={() => { setReadFilter(r); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                readFilter === r
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        {totalCount > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all notifications?')) {
                clearNotifications();
                toast.success('All notifications cleared.');
              }
            }}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {paginated.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <EmptyStateView
              icon={BellOff}
              title="No Notifications"
              description="No notifications match your current filter. System alerts and booking events will appear here."
            />
          </div>
        ) : (
          paginated.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border shadow-xs cursor-pointer transition-all hover:shadow-sm ${
                n.read
                  ? 'bg-white border-slate-200'
                  : TYPE_BG[n.type] || 'bg-sky-50 border-sky-200'
              }`}
              onClick={() => !n.read && markNotificationAsRead(n.id)}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                n.read ? 'bg-slate-100' : TYPE_BG[n.type]?.split(' ')[0] || 'bg-sky-100'
              }`}>
                {TYPE_ICONS[n.type] || <Bell className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-sm text-slate-900">{n.title}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatDateTime(n.timestamp)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                {n.role && (
                  <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 capitalize">
                    {n.role}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
            itemLabel="notifications"
            pageSizeOptions={[15]}
          />
        </div>
      )}

      {showCompose && (
        <ComposeNotificationModal
          onClose={() => setShowCompose(false)}
          onSend={handleSendNotification}
        />
      )}
    </div>
  );
}
