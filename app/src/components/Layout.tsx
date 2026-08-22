import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard,
  Users,
  Activity,
  FlaskConical,
  Pill,
  Calendar,
  UserCog,
  BarChart3,
  UserCircle,
  LogOut,
  Menu,
  X,
  Droplets,
  Thermometer,
  ClipboardList,
} from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * One delegated pointermove listener powers the 3D tilt + cursor-glare
   * effect for every `.card` / `.card-flat` / `.card-static` / `.tilt` /
   * `.btn-*` / `.nav-tile` element across the whole app — no per-page
   * wiring needed. It writes CSS custom properties (--rx/--ry for tilt
   * angle, --mx/--my for glare position) directly onto the hovered
   * element; the actual transform only activates via the `:hover` rules
   * in index.css, so this stays cheap (no React re-renders, just a
   * handful of style writes per frame).
   */
  useEffect(() => {
    let raf = 0;
    // .card-static is intentionally excluded: it's used for data tables and
    // filter bars, and a whole-surface 3D tilt there makes rows of text
    // skew/swim as the cursor moves — see the .card-static comment in
    // index.css for the full rationale.
    const TILT_SELECTOR =
      '.card, .card-flat, .tilt, .btn-primary, .btn-secondary, .btn-danger, .btn-success, .btn-warning, .nav-tile, .icon-btn';
    const handleMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = e.target as HTMLElement | null;
        const el = target?.closest?.(TILT_SELECTOR) as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        // Small controls (buttons, nav chips) get a punchier tilt than large
        // cards — a 6deg tilt reads as "floating" on a card but is barely
        // visible on a 40px-tall button, so scale the angle by size.
        const isSmall = rect.width < 220;
        const maxDeg = isSmall ? 14 : 7;
        el.style.setProperty('--rx', `${(py * -maxDeg).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(px * maxDeg).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    };
    document.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handleMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /**
   * Role-specific navigation
   * - Admin: full system ops (users, reports, all clinical modules)
   * - Doctor: clinical care (patients, prescribe, labs, reports, review symptoms)
   * - Nurse: floor care (sessions, vitals, patients, review symptoms) — no reports / user mgmt
   * - Patient: personal portal (own sessions, labs, meds, appointments, symptom log)
   */
  const getNavItems = () => {
    const role = user?.role;

    if (role === 'admin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/patients', label: 'Patients', icon: Users },
        { path: '/dialysis', label: 'Dialysis Sessions', icon: Droplets },
        { path: '/lab-results', label: 'Lab Results', icon: FlaskConical },
        { path: '/prescriptions', label: 'Prescriptions', icon: Pill },
        { path: '/appointments', label: 'Appointments', icon: Calendar },
        { path: '/symptoms', label: 'Symptom Reports', icon: Thermometer },
        { path: '/handoffs', label: 'Shift Handoffs', icon: ClipboardList },
        { path: '/users', label: 'User Management', icon: UserCog },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ];
    }

    if (role === 'doctor') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/patients', label: 'My Patients', icon: Users },
        { path: '/dialysis', label: 'Dialysis Sessions', icon: Droplets },
        { path: '/lab-results', label: 'Lab Results', icon: FlaskConical },
        { path: '/prescriptions', label: 'Prescriptions', icon: Pill },
        { path: '/appointments', label: 'Appointments', icon: Calendar },
        { path: '/symptoms', label: 'Symptom Reports', icon: Thermometer },
        { path: '/handoffs', label: 'Shift Handoffs', icon: ClipboardList },
        { path: '/reports', label: 'Clinical Reports', icon: BarChart3 },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ];
    }

    if (role === 'nurse') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/dialysis', label: 'Session Floor', icon: Droplets },
        { path: '/handoffs', label: 'Shift Handoff', icon: ClipboardList },
        { path: '/patients', label: 'Patients', icon: Users },
        { path: '/lab-results', label: 'Lab Results', icon: FlaskConical },
        { path: '/prescriptions', label: 'Medications', icon: Pill },
        { path: '/appointments', label: 'Appointments', icon: Calendar },
        { path: '/symptoms', label: 'Symptom Reports', icon: Thermometer },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ];
    }

    // Patient portal
    return [
      { path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { path: '/dialysis', label: 'My Sessions', icon: Droplets },
      { path: '/lab-results', label: 'My Labs', icon: FlaskConical },
      { path: '/prescriptions', label: 'My Medications', icon: Pill },
      { path: '/appointments', label: 'My Appointments', icon: Calendar },
      { path: '/symptoms', label: 'Symptom Log', icon: Thermometer },
      { path: '/profile', label: 'My Profile', icon: UserCircle },
    ];
  };

  const navItems = getNavItems();

  const getRoleStyle = () => {
    switch (user?.role) {
      case 'admin': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200';
      case 'doctor': return 'bg-skyglow-50 text-skyglow-700 ring-1 ring-inset ring-skyglow-200';
      case 'nurse': return 'bg-leaf-50 text-leaf-700 ring-1 ring-inset ring-leaf-200';
      case 'patient': return 'bg-sunbeam-50 text-sunbeam-700 ring-1 ring-inset ring-sunbeam-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAvatarColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-purple-800';
      case 'doctor': return 'bg-skyglow-800';
      case 'nurse': return 'bg-leaf-800';
      case 'patient': return 'bg-sunbeam-800';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex p-3 gap-3">
      <aside className={`
        fixed inset-y-3 left-3 z-50 w-72 rounded-[1.75rem] border border-gray-200 shadow-depth-4 transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col overflow-hidden bg-white
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'}
        lg:translate-x-0 lg:static lg:inset-auto
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gray-900">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-display font-semibold text-gray-900 tracking-tight">CKD System</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  nav-tile group relative flex items-center px-3 py-2.5 rounded-2xl text-sm font-medium
                  ${isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-nav-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 bg-gray-900 rounded-2xl"
                  />
                )}
                {!isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                )}
                <motion.span
                  className="relative flex items-center justify-center mr-3"
                  whileHover={{ scale: 1.12, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 14 }}
                >
                  <Icon className={`h-5 w-5 transition-colors duration-150 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                </motion.span>
                <span className="relative">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="active-nav-dot"
                    className="relative ml-auto h-1.5 w-1.5 rounded-full bg-white"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden gap-3">
        <header className="rounded-[1.5rem] border border-gray-200 shadow-depth-2 sticky top-0 z-30 bg-white">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden lg:block" />

            <div className="flex items-center space-x-3 sm:space-x-4">
              <NotificationBell />

              <div className="h-8 w-px bg-gray-200 hidden sm:block" />

              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <div className={`relative h-10 w-10 rounded-full ${getAvatarColor()} flex items-center justify-center ring-2 ring-white shadow-depth-2 transition-transform duration-200 ease-out hover:scale-105 hover:shadow-depth-hover`}>
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className={`hidden md:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getRoleStyle()}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.99, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden animate-fade-in-up"
          style={{ animationDuration: '150ms' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
