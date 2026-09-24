import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  Building2,
  Plus,
  Check,
  User,
  LogOut,
  Settings,
  Shield,
  ExternalLink,
  CircleDot,
  Bell,
  Sparkles,
  Search,
  ArrowRightLeft,
  History,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useCrm } from '../../lib/crm-context';
import { CreateBusinessModal } from './CreateBusinessModal';
import { ProfileModal } from './ProfileModal';
import { NotificationsPopover } from '../common/NotificationsPopover';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { ActiveNavSection } from '../../types';

interface TopNavProps {
  onToggleMobileSidebar: () => void;
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleMobileSidebar,
  activeSection,
  onSelectSection,
}) => {
  const { user, activeBusiness, businesses, switchBusiness, logout, isSupabaseConnected } = useAuth();
  const { unreadNotificationsCount } = useCrm();

  const [isBizMenuOpen, setIsBizMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateBizModalOpen, setIsCreateBizModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Common Modals & Popovers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);

  const bizMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bizMenuRef.current && !bizMenuRef.current.contains(e.target as Node)) {
        setIsBizMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header
        id="app-top-nav"
        className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6"
      >
        {/* Left Side: Mobile Menu Button & Business Switcher */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleMobileSidebar}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg lg:hidden transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Business Switcher Dropdown */}
          <div className="relative" ref={bizMenuRef}>
            <button
              id="business-switcher-btn"
              onClick={() => setIsBizMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFC] transition-all text-left"
            >
              <div className="w-6 h-6 rounded bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                {activeBusiness?.name ? activeBusiness.name.charAt(0).toUpperCase() : 'B'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-[#0F172A] max-w-[130px] sm:max-w-[180px] truncate">
                    {activeBusiness?.name || 'Select Business'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                </div>
              </div>
              {activeBusiness && (
                <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-[#F1F5F9] text-[#475569] rounded border border-[#E2E8F0]">
                  {activeBusiness.role}
                </span>
              )}
            </button>

            {/* Business Switcher Menu */}
            {isBizMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Organizations & Workspaces
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Data is isolated per business instance.
                  </p>
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {businesses.map((biz) => {
                    const isSelected = biz.id === activeBusiness?.id;
                    return (
                      <button
                        key={biz.id}
                        id={`switch-to-biz-${biz.id}`}
                        onClick={() => {
                          switchBusiness(biz.id);
                          setIsBizMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                          isSelected
                            ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-[#4F46E5] text-white'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {biz.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[#0F172A]">
                              {biz.name}
                            </p>
                            <p className="text-[10px] text-[#64748B] flex items-center gap-1">
                              <span>Role: {biz.role}</span>
                              <span>•</span>
                              <span>{biz.default_currency}</span>
                            </p>
                          </div>
                        </div>

                        {isSelected && <Check className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-[#E2E8F0]">
                  <button
                    id="create-new-business-btn"
                    onClick={() => {
                      setIsBizMenuOpen(false);
                      setIsCreateBizModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Business</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Search Shortcut Bar */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[#64748B] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Search leads, clients, records...</span>
            <kbd className="ml-2 font-mono text-[10px] bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded text-[#64748B]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Side: Status Badge, Currency Converter, Quick Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Currency Converter Quick Trigger */}
          <button
            onClick={() => setIsConverterOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl transition-colors shadow-2xs"
            title="Open Live USD / PKR Currency Exchange Calculator"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>PKR / USD</span>
          </button>

          {/* Search Button for Mobile */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg md:hidden transition-colors"
            title="Global Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Popover Trigger */}
          <div className="relative">
            <button
              ref={notificationsBtnRef}
              id="topnav-notifications-btn"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#4F46E5] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onNavigate={(section) => {
                onSelectSection(section);
                setIsNotificationsOpen(false);
              }}
            />
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-medium text-xs border border-[#E2E8F0]">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-[#0F172A] leading-tight max-w-[120px] truncate">
                  {user?.full_name || user?.email || 'Account'}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {activeBusiness?.role || 'Member'}
                </span>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {/* Profile Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Identity Details */}
                <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#0F172A] truncate">
                    {user?.full_name || 'Business User'}
                  </p>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                    <span className="text-[#64748B]">Current Business:</span>
                    <span className="font-medium text-[#0F172A] truncate max-w-[110px]">
                      {activeBusiness?.name || 'None'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                    <span className="text-[#64748B]">Assigned Role:</span>
                    <span className="font-semibold text-[#4F46E5]">
                      {activeBusiness?.role || 'Viewer'}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    id="menu-profile-settings-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left"
                  >
                    <User className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    id="menu-business-settings-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectSection('business-settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Business Settings</span>
                  </button>

                  <button
                    id="menu-team-roles-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectSection('team-roles');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Team & Roles</span>
                  </button>

                  {(activeBusiness?.role === 'Owner' || activeBusiness?.role === 'Admin') && (
                    <button
                      id="menu-login-history-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSelectSection('login-history');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left"
                    >
                      <History className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Login History</span>
                    </button>
                  )}
                </div>

                <div className="p-1 border-t border-[#E2E8F0]">
                  <button
                    id="menu-logout-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(section) => onSelectSection(section)}
      />

      {/* Currency Converter Modal */}
      <CurrencyConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />

      {/* Modals */}
      <CreateBusinessModal
        isOpen={isCreateBizModalOpen}
        onClose={() => setIsCreateBizModalOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
