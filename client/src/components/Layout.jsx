import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Timer, 
  Calendar, 
  BarChart3, 
  FolderTree, 
  Settings, 
  LogOut,
  User,
  Clock,
  Target,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

export default function Layout() {
  const { user, isGuest, logout } = useAuth();
  const { isRunning, formattedTime } = useTimer();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Timer, label: 'Timer' },
    { path: '/my-everything', icon: FolderTree, label: 'My Everything' },
    { path: '/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  // Main nav items for bottom bar (limit to 5)
  const bottomNavItems = navItems.slice(0, 5);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <Clock className="brand-icon" />
          <span className="brand-name">My Everything</span>
          {isRunning && location.pathname !== '/' && (
            <span className="mini-timer">{formattedTime}</span>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-links desktop-only">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="navbar-user">
          <button 
            className="btn btn-ghost btn-icon theme-toggle" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="user-info desktop-only">
            <User size={18} />
            <span>{isGuest ? 'Guest' : user?.name || user?.email}</span>
            {isGuest && <span className="badge badge-warning">Guest</span>}
          </div>
          <button className="btn btn-ghost btn-icon desktop-only" onClick={logout} title={isGuest ? "Sign in" : "Sign out"}>
            <LogOut size={18} />
          </button>
          
          {/* Mobile menu button */}
          <button 
            className="btn btn-ghost btn-icon mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="mobile-dropdown mobile-only">
          <div className="mobile-user-info">
            <User size={18} />
            <span>{isGuest ? 'Guest' : user?.name || user?.email}</span>
            {isGuest && <span className="badge badge-warning">Guest</span>}
          </div>
          <button className="mobile-logout" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav mobile-only">
        {bottomNavItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
