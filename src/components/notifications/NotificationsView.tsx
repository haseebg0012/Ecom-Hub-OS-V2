import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface NotificationItem {
  id: string;
  business_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const NotificationsView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.id || 'biz-default';

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(`ecomhub_notifications_${businessId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'notif-001',
        business_id: businessId,
        title: 'New lead assigned',
        message: 'Zainab Ahmed from Apex Retail was assigned to your sales queue.',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-002',
        business_id: businessId,
        title: 'Invoice Payment Received',
        message: 'Client North Star Apparel paid invoice INV-2025-001 ($4,500).',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`ecomhub_notifications_${businessId}`, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications, businessId]);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#4F46E5]" />
            <span>System Notifications</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            System alerts, lead assignments, and payment notices for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] bg-white text-[#0F172A] text-xs font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors shadow-xs self-start"
        >
          <Check className="w-4 h-4 text-[#4F46E5]" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="divide-y divide-[#E2E8F0]">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                notif.read ? 'bg-white' : 'bg-indigo-50/40'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notif.read ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-indigo-100 text-[#4F46E5]'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-[#0F172A] truncate">{notif.title}</h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                    )}
                  </div>
                  <p className="text-xs text-[#475569]">{notif.message}</p>
                  <p className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(notif.created_at).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteNotif(notif.id)}
                className="p-1.5 text-[#94A3B8] hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F172A]">No notifications</p>
              <p className="text-xs text-[#64748B] mt-1">You are all caught up on system updates.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
