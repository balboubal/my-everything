import { useState, useEffect } from 'react';
import { useTimer } from '../context/TimerContext';
import { useData } from '../context/DataContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  Save,
  ChevronDown,
  Clock,
  Timer as TimerIcon,
  Folder,
  Check,
  X,
  Edit3,
  Settings,
  SkipForward,
  Coffee,
  Target,
  Volume2,
  VolumeX,
  Bell,
  BellOff
} from 'lucide-react';
import './TimerPage.css';

export default function TimerPage() {
  const {
    seconds,
    isRunning,
    mode,
    targetSeconds,
    selectedCategory,
    sessionTitle,
    sessionNotes,
    formattedTime,
    progress,
    pomodoroPhase,
    completedPomodoros,
    totalPomodorosToday,
    settings,
    updateSettings,
    toggle,
    reset,
    adjustTime,
    setTime,
    switchMode,
    setCountdownTarget,
    setSelectedCategory,
    setSessionTitle,
    setSessionNotes,
    getSessionData,
    clearSession,
    skipPomodoroPhase,
    resetPomodoro
  } = useTimer();

  const { categories, createSession } = useData();

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'r' || e.key === 'R') {
        reset();
      } else if (e.key === 's' || e.key === 'S') {
        if (seconds > 0 || (mode !== 'stopwatch')) setShowSaveModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, reset, seconds, mode]);

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      const data = getSessionData();
      await createSession(data);
      clearSession();
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setSaving(false);
    }
  };

  const openTimeEdit = () => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    setEditHours(h);
    setEditMinutes(m);
    setEditSeconds(s);
    setShowTimeEdit(true);
  };

  const applyTimeEdit = () => {
    const newSeconds = editHours * 3600 + editMinutes * 60 + editSeconds;
    setTime(newSeconds);
    setShowTimeEdit(false);
  };

  const presetTimes = [
    { label: '15m', seconds: 15 * 60 },
    { label: '25m', seconds: 25 * 60 },
    { label: '45m', seconds: 45 * 60 },
    { label: '1h', seconds: 60 * 60 },
    { label: '2h', seconds: 120 * 60 }
  ];

  const adjustButtons = [
    { label: '-5m', delta: -300 },
    { label: '-1m', delta: -60 },
    { label: '-10s', delta: -10 },
    { label: '+10s', delta: 10 },
    { label: '+1m', delta: 60 },
    { label: '+5m', delta: 300 }
  ];

  const getPhaseLabel = () => {
    switch (pomodoroPhase) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Focus Time';
    }
  };

  const getPhaseColor = () => {
    switch (pomodoroPhase) {
      case 'work': return 'var(--accent-primary)';
      case 'shortBreak': return 'var(--success)';
      case 'longBreak': return 'var(--warning)';
      default: return 'var(--accent-primary)';
    }
  };

  return (
    <div className="timer-page">
      <div className="timer-main">
        {/* Mode switcher */}
        <div className="mode-switcher">
          <button 
            className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`}
            onClick={() => switchMode('stopwatch')}
          >
            <Clock size={18} />
            Stopwatch
          </button>
          <button 
            className={`mode-btn ${mode === 'countdown' ? 'active' : ''}`}
            onClick={() => switchMode('countdown')}
          >
            <TimerIcon size={18} />
            Countdown
          </button>
          <button 
            className={`mode-btn ${mode === 'pomodoro' ? 'active' : ''}`}
            onClick={() => switchMode('pomodoro')}
          >
            <Target size={18} />
            Pomodoro
          </button>
          <button 
            className="settings-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Timer Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Pomodoro phase indicator */}
        {mode === 'pomodoro' && (
          <div className="pomodoro-info">
            <div className="phase-indicator" style={{ color: getPhaseColor() }}>
              {pomodoroPhase === 'work' ? <Target size={20} /> : <Coffee size={20} />}
              <span>{getPhaseLabel()}</span>
            </div>
            <div className="pomodoro-stats">
              <span className="pomodoro-count">
                🍅 {completedPomodoros} / {settings.pomodorosUntilLongBreak}
              </span>
              <span className="pomodoro-today">
                Today: {totalPomodorosToday}
              </span>
            </div>
          </div>
        )}

        {/* Category selector */}
        <div className="category-selector">
          <button 
            className="category-btn"
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            {selectedCategory ? (
              <>
                <span 
                  className="category-dot" 
                  style={{ background: selectedCategory.color }}
                />
                {selectedCategory.name}
              </>
            ) : (
              <>
                <Folder size={16} />
                Select Category
              </>
            )}
            <ChevronDown size={16} />
          </button>

          {showCategoryPicker && (
            <div className="category-dropdown">
              <button 
                className="category-option"
                onClick={() => { setSelectedCategory(null); setShowCategoryPicker(false); }}
              >
                <span className="category-dot" style={{ background: 'var(--text-tertiary)' }} />
                No Category
                {!selectedCategory && <Check size={16} />}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className="category-option"
                  onClick={() => { setSelectedCategory(cat); setShowCategoryPicker(false); }}
                >
                  <span className="category-dot" style={{ background: cat.color }} />
                  {cat.name}
                  {selectedCategory?.id === cat.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timer display */}
        <div className="timer-container">
          {(mode === 'countdown' || mode === 'pomodoro') && settings.showProgressRing && (
            <svg className="progress-ring" viewBox="0 0 200 200">
              <circle 
                className="progress-ring-bg"
                cx="100" 
                cy="100" 
                r="90"
              />
              <circle 
                className="progress-ring-fill"
                cx="100" 
                cy="100" 
                r="90"
                style={{ 
                  strokeDasharray: 2 * Math.PI * 90,
                  strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100),
                  stroke: mode === 'pomodoro' ? getPhaseColor() : 'var(--accent-primary)'
                }}
              />
            </svg>
          )}
          <div 
            className={`timer-display ${isRunning ? 'running' : ''}`}
            onClick={openTimeEdit}
            title="Click to edit time"
          >
            {formattedTime}
          </div>
          <button className="edit-time-btn" onClick={openTimeEdit}>
            <Edit3 size={16} />
          </button>
        </div>

        {/* Countdown presets */}
        {mode === 'countdown' && !isRunning && (
          <div className="preset-times">
            {presetTimes.map(preset => (
              <button
                key={preset.label}
                className={`preset-btn ${targetSeconds === preset.seconds ? 'active' : ''}`}
                onClick={() => setCountdownTarget(preset.seconds)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Main controls */}
        <div className="timer-controls">
          <button className="btn btn-secondary btn-lg" onClick={mode === 'pomodoro' ? resetPomodoro : reset}>
            <RotateCcw size={20} />
            Reset
          </button>
          <button 
            className={`btn btn-lg play-btn ${isRunning ? 'pause' : 'play'}`}
            onClick={toggle}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          {mode === 'pomodoro' ? (
            <button 
              className="btn btn-secondary btn-lg"
              onClick={skipPomodoroPhase}
              title="Skip to next phase"
            >
              <SkipForward size={20} />
              Skip
            </button>
          ) : (
            <button 
              className="btn btn-success btn-lg"
              onClick={() => setShowSaveModal(true)}
              disabled={seconds === 0 && mode === 'stopwatch'}
            >
              <Save size={20} />
              Save
            </button>
          )}
        </div>

        {/* Pomodoro save button */}
        {mode === 'pomodoro' && (
          <button 
            className="btn btn-success pomodoro-save-btn"
            onClick={() => setShowSaveModal(true)}
          >
            <Save size={18} />
            Save Session
          </button>
        )}

        {/* Time adjustments */}
        <div className="time-adjustments">
          {adjustButtons.map(btn => (
            <button
              key={btn.label}
              className="adjust-btn"
              onClick={() => adjustTime(btn.delta)}
            >
              {btn.delta < 0 ? <Minus size={14} /> : <Plus size={14} />}
              {btn.label.replace('+', '').replace('-', '')}
            </button>
          ))}
        </div>

        {/* Quick settings */}
        <div className="quick-settings">
          <button 
            className={`quick-setting-btn ${settings.soundEnabled ? 'active' : ''}`}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            title={settings.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button 
            className={`quick-setting-btn ${settings.browserNotifications ? 'active' : ''}`}
            onClick={() => updateSettings({ browserNotifications: !settings.browserNotifications })}
            title={settings.browserNotifications ? 'Disable notifications' : 'Enable notifications'}
          >
            {settings.browserNotifications ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="keyboard-hints">
          <span><kbd>Space</kbd> Start/Pause</span>
          <span><kbd>R</kbd> Reset</span>
          <span><kbd>S</kbd> Save</span>
        </div>
      </div>

      {/* Session info sidebar */}
      <div className="session-info">
        <h3>Session Details</h3>
        
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            placeholder="What are you working on?"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            placeholder="Add any notes about this session..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            rows={4}
          />
        </div>

        {selectedCategory && (
          <div className="selected-category-info">
            <span 
              className="category-dot large" 
              style={{ background: selectedCategory.color }}
            />
            <div>
              <strong>{selectedCategory.name}</strong>
              <span className="category-stats">
                {Math.floor((selectedCategory.total_time || 0) / 3600)}h {Math.floor(((selectedCategory.total_time || 0) % 3600) / 60)}m total
              </span>
            </div>
          </div>
        )}

        {/* Today's summary */}
        {mode === 'pomodoro' && totalPomodorosToday > 0 && (
          <div className="today-summary">
            <h4>Today's Progress</h4>
            <div className="pomodoro-visual">
              {Array.from({ length: totalPomodorosToday }).map((_, i) => (
                <span key={i} className="tomato">🍅</span>
              ))}
            </div>
            <p>{totalPomodorosToday} pomodoro{totalPomodorosToday !== 1 ? 's' : ''} completed</p>
          </div>
        )}
      </div>

      {/* Time edit modal */}
      {showTimeEdit && (
        <div className="modal-overlay" onClick={() => setShowTimeEdit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Edit Time</h2>
            <div className="time-edit-inputs">
              <div className="form-group">
                <label>Hours</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={editHours}
                  onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <span className="time-separator">:</span>
              <div className="form-group">
                <label>Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
              <span className="time-separator">:</span>
              <div className="form-group">
                <label>Seconds</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editSeconds}
                  onChange={(e) => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowTimeEdit(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={applyTimeEdit}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save session modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Save Session</h2>
            
            <div className="save-preview">
              <div className="save-time">{formattedTime}</div>
              {selectedCategory && (
                <div className="save-category">
                  <span className="category-dot" style={{ background: selectedCategory.color }} />
                  {selectedCategory.name}
                </div>
              )}
              {mode === 'pomodoro' && (
                <div className="save-pomodoro-info">
                  🍅 {completedPomodoros} pomodoro{completedPomodoros !== 1 ? 's' : ''} in this session
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                placeholder="Session title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                placeholder="Any notes?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>
                <X size={18} />
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSession}
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                ) : (
                  <>
                    <Save size={18} />
                    Save Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <h2><Settings size={24} /> Timer Settings</h2>
            
            <div className="settings-section">
              <h3>Pomodoro Durations</h3>
              
              <div className="settings-row">
                <label>Work Duration</label>
                <div className="duration-input">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={Math.floor(settings.workDuration / 60)}
                    onChange={(e) => updateSettings({ workDuration: Math.max(1, parseInt(e.target.value) || 25) * 60 })}
                  />
                  <span>minutes</span>
                </div>
              </div>

              <div className="settings-row">
                <label>Short Break</label>
                <div className="duration-input">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={Math.floor(settings.shortBreakDuration / 60)}
                    onChange={(e) => updateSettings({ shortBreakDuration: Math.max(1, parseInt(e.target.value) || 5) * 60 })}
                  />
                  <span>minutes</span>
                </div>
              </div>

              <div className="settings-row">
                <label>Long Break</label>
                <div className="duration-input">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={Math.floor(settings.longBreakDuration / 60)}
                    onChange={(e) => updateSettings({ longBreakDuration: Math.max(1, parseInt(e.target.value) || 15) * 60 })}
                  />
                  <span>minutes</span>
                </div>
              </div>

              <div className="settings-row">
                <label>Pomodoros until long break</label>
                <div className="duration-input">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.pomodorosUntilLongBreak}
                    onChange={(e) => updateSettings({ pomodorosUntilLongBreak: Math.max(1, Math.min(10, parseInt(e.target.value) || 4)) })}
                  />
                  <span>🍅</span>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Auto-Start</h3>
              
              <div className="settings-row toggle-row">
                <label>Auto-start breaks</label>
                <button 
                  className={`toggle-btn ${settings.autoStartBreaks ? 'active' : ''}`}
                  onClick={() => updateSettings({ autoStartBreaks: !settings.autoStartBreaks })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="settings-row toggle-row">
                <label>Auto-start work sessions</label>
                <button 
                  className={`toggle-btn ${settings.autoStartWork ? 'active' : ''}`}
                  onClick={() => updateSettings({ autoStartWork: !settings.autoStartWork })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Notifications</h3>
              
              <div className="settings-row toggle-row">
                <label>Sound notifications</label>
                <button 
                  className={`toggle-btn ${settings.soundEnabled ? 'active' : ''}`}
                  onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              {settings.soundEnabled && (
                <div className="settings-row">
                  <label>Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                    className="volume-slider"
                  />
                </div>
              )}

              <div className="settings-row toggle-row">
                <label>Browser notifications</label>
                <button 
                  className={`toggle-btn ${settings.browserNotifications ? 'active' : ''}`}
                  onClick={() => updateSettings({ browserNotifications: !settings.browserNotifications })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Display</h3>
              
              <div className="settings-row toggle-row">
                <label>Show seconds</label>
                <button 
                  className={`toggle-btn ${settings.showSeconds ? 'active' : ''}`}
                  onClick={() => updateSettings({ showSeconds: !settings.showSeconds })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="settings-row toggle-row">
                <label>Show progress ring</label>
                <button 
                  className={`toggle-btn ${settings.showProgressRing ? 'active' : ''}`}
                  onClick={() => updateSettings({ showProgressRing: !settings.showProgressRing })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="settings-row toggle-row">
                <label>Show time in browser tab</label>
                <button 
                  className={`toggle-btn ${settings.showTimeInTitle ? 'active' : ''}`}
                  onClick={() => updateSettings({ showTimeInTitle: !settings.showTimeInTitle })}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
