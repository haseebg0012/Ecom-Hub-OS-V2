import React, { useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Target, Building2, Calendar, AlertCircle } from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { ActiveNavSection, NotificationItem } from '../../types';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: ActiveNavSection, entityId?: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } = useCrm();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (notif: NotificationItem) => {
    markNotificationAsRead(notif.id);
    onNavigate(notif.link_section, notif.entity_id);
    onClose();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'lead_capture':
        return <Target className="w-4 h-4 text-[#4F46E5]" />;
      case 'followup_due':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'followup_overdue':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'lead_converted':
      case 'client_created':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#64748B]" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">Notifications</h4>
          {unreadNotificationsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF2FF] text-[#4F46E5]">
              {unreadNotificationsCount} unread
            </span>
          )}
        </div>
        {unreadNotificationsCount > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-[11px] text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3 h-3" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            No notifications at this time.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 hover:bg-[#F8FAFC] cursor-pointer transition-colors flex items-start gap-3 ${
                !n.is_read ? 'bg-[#EEF2FF]/30' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs truncate ${!n.is_read ? 'font-bold text-[#0F172A]' : 'font-medium text-[#334155]'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] shrink-0">
                    {formatTime(n.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
              </div>
              {!n.is_read && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center">
        <button
          onClick={() => {
            onNavigate('leads');
            onClose();
          }}
          className="text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          View Leads Pipeline Activity →
        </button>
      </div>
    </div>
  );
};
