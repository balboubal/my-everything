import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useTimer } from '../context/TimerContext';
import { 
  Settings as SettingsIcon,
  User,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Bell,
  Clock,
  Shield,
  LogOut,
  AlertTriangle,
  Check,
  Cloud,
  HardDrive,
  Palette,
  Monitor,
  Calendar,
  Target,
  Volume2
} from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, isGuest, logout } = useAuth();
  const { exportData, importData, sessions, categories, clearAllData } = useData();
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings } = useTimer();
  
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const fileInputRef = useRef(null);

  const handleExport = () => {
    exportData();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setImportSuccess(false);
    
    try {
      await importData(file);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error) {
      alert('Failed to import data: ' + error.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    try {
      if (clearAllData) {
        await clearAllData();
      } else {
        // Fallback for guest mode - clear localStorage
        localStorage.removeItem('me_guest_sessions');
        localStorage.removeItem('me_guest_categories');
        window.location.reload();
      }
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch (error) {
      alert('Failed to delete data: ' + error.message);
    }
  };

  const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>
          <SettingsIcon size={28} />
          Settings
        </h1>
      </div>

      <div className="settings-grid">
        {/* Appearance section */}
        <section className="settings-section">
          <h2>
            <Palette size={20} />
            Appearance
          </h2>
          
          <div className="settings-card">
            <div className="preference-item">
              <div className="preference-info">
                <strong>Theme</strong>
                <p>Choose between light and dark mode</p>
              </div>
              <div className="theme-toggle-group">
                <button 
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  <Sun size={18} />
                  Light
                </button>
                <button 
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  <Moon size={18} />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account section */}
        <section className="settings-section">
          <h2>
            <User size={20} />
            Account
          </h2>
          
          <div className="settings-card">
            {isGuest ? (
              <div className="guest-notice">
                <HardDrive size={24} />
                <div>
                  <strong>Guest Mode</strong>
                  <p>Your data is stored locally in this browser. Create an account to sync across devices.</p>
                </div>
              </div>
            ) : (
              <div className="account-info">
                <Cloud size={24} />
                <div>
                  <strong>{user?.name || user?.email}</strong>
                  <p>{user?.email}</p>
                  <span className="badge badge-success">Synced</span>
                </div>
              </div>
            )}
            
            <button className="btn btn-secondary" onClick={logout}>
              <LogOut size={18} />
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </button>
          </div>
        </section>

        {/* Data section */}
        <section className="settings-section">
          <h2>
            <Shield size={20} />
            Data Management
          </h2>

          <div className="settings-card">
            <div className="data-stats">
              <div className="data-stat">
                <span className="data-stat-value">{sessions.length}</span>
                <span className="data-stat-label">Sessions</span>
              </div>
              <div className="data-stat">
                <span className="data-stat-value">{categories.length}</span>
                <span className="data-stat-label">Categories</span>
              </div>
              <div className="data-stat">
                <span className="data-stat-value">{formatTotalTime(totalTime)}</span>
                <span className="data-stat-label">Total Time</span>
              </div>
            </div>

            <div className="data-actions">
              <button className="btn btn-secondary" onClick={handleExport}>
                <Download size={18} />
                Export Data
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={handleImportClick}
                disabled={importing}
              >
                {importing ? (
                  <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid var(--text-tertiary)', borderTopColor: 'var(--text-primary)', borderRadius: '50%' }} />
                ) : importSuccess ? (
                  <Check size={18} />
                ) : (
                  <Upload size={18} />
                )}
                {importing ? 'Importing...' : importSuccess ? 'Imported!' : 'Import Data'}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
            </div>

            <p className="settings-hint">
              Export your data as JSON for backup or to transfer to another device. 
              Import will merge with existing data.
            </p>
          </div>
        </section>

        {/* Timer Preferences section */}
        <section className="settings-section">
          <h2>
            <Clock size={20} />
            Timer Preferences
          </h2>

          <div className="settings-card">
            <div className="preference-item">
              <div className="preference-info">
                <strong>Show Seconds</strong>
                <p>Display seconds in timer</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.showSeconds ?? true}
                  onChange={(e) => updateSettings?.({ showSeconds: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Show Progress Ring</strong>
                <p>Display circular progress indicator</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.showProgressRing ?? true}
                  onChange={(e) => updateSettings?.({ showProgressRing: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Show Time in Tab</strong>
                <p>Display timer in browser tab title</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.showTimeInTitle ?? true}
                  onChange={(e) => updateSettings?.({ showTimeInTitle: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Sound Notifications</strong>
                <p>Play sound when timer completes</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.soundEnabled ?? true}
                  onChange={(e) => updateSettings?.({ soundEnabled: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Browser Notifications</strong>
                <p>Show desktop notifications</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.browserNotifications ?? false}
                  onChange={(e) => updateSettings?.({ browserNotifications: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Pomodoro Settings */}
        <section className="settings-section">
          <h2>
            <Target size={20} />
            Pomodoro Settings
          </h2>

          <div className="settings-card">
            <div className="preference-item">
              <div className="preference-info">
                <strong>Work Duration</strong>
                <p>Length of focus sessions</p>
              </div>
              <select 
                value={settings?.workDuration ? settings.workDuration / 60 : 25}
                onChange={(e) => updateSettings?.({ workDuration: parseInt(e.target.value) * 60 })}
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="25">25 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Short Break</strong>
                <p>Duration between work sessions</p>
              </div>
              <select 
                value={settings?.shortBreakDuration ? settings.shortBreakDuration / 60 : 5}
                onChange={(e) => updateSettings?.({ shortBreakDuration: parseInt(e.target.value) * 60 })}
              >
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Long Break</strong>
                <p>Duration after completing cycles</p>
              </div>
              <select 
                value={settings?.longBreakDuration ? settings.longBreakDuration / 60 : 15}
                onChange={(e) => updateSettings?.({ longBreakDuration: parseInt(e.target.value) * 60 })}
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Auto-start Breaks</strong>
                <p>Automatically start break timer</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.autoStartBreaks ?? false}
                  onChange={(e) => updateSettings?.({ autoStartBreaks: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <strong>Auto-start Work</strong>
                <p>Automatically start next work session</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={settings?.autoStartWork ?? false}
                  onChange={(e) => updateSettings?.({ autoStartWork: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Timetable Preferences */}
        <section className="settings-section">
          <h2>
            <Calendar size={20} />
            Timetable Preferences
          </h2>

          <div className="settings-card">
            <div className="preference-item">
              <div className="preference-info">
                <strong>Default View</strong>
                <p>Choose between list or calendar view</p>
              </div>
              <select defaultValue="calendar">
                <option value="list">List View</option>
                <option value="calendar">Calendar View</option>
              </select>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="settings-section danger">
          <h2>
            <AlertTriangle size={20} />
            Danger Zone
          </h2>

          <div className="settings-card">
            <div className="danger-item">
              <div>
                <strong>Delete All Data</strong>
                <p>Permanently delete all your sessions and categories. This cannot be undone.</p>
              </div>
              <button 
                className="btn btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={18} />
                Delete All
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <p>My Everything v1.0.0</p>
        <p>Made with focus and determination</p>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content danger-modal" onClick={e => e.stopPropagation()}>
            <div className="danger-modal-icon">
              <AlertTriangle size={48} />
            </div>
            <h2>Delete All Data?</h2>
            <p>
              This will permanently delete all {sessions.length} sessions and {categories.length} categories.
              This action cannot be undone.
            </p>
            <div className="confirm-input">
              <label>Type <strong>DELETE</strong> to confirm:</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={handleDeleteAll}
              >
                <Trash2 size={18} />
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
