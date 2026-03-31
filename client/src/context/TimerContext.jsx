import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const TimerContext = createContext(null);

const STORAGE_KEY = 'me_timer_state';
const SETTINGS_KEY = 'me_timer_settings';

const DEFAULT_SETTINGS = {
  // Pomodoro settings
  workDuration: 25 * 60,      // 25 minutes
  shortBreakDuration: 5 * 60,  // 5 minutes
  longBreakDuration: 15 * 60,  // 15 minutes
  pomodorosUntilLongBreak: 4,
  
  // Behavior settings
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  soundVolume: 0.7,
  browserNotifications: true,
  keepScreenAwake: false,
  showTimeInTitle: true,
  
  // Display settings
  showSeconds: true,
  use24HourFormat: true,
  showProgressRing: true,
  tickingSound: false
};

export function TimerProvider({ children }) {
  const { token, isGuest } = useAuth();
  
  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('stopwatch'); // 'stopwatch', 'countdown', or 'pomodoro'
  const [targetSeconds, setTargetSeconds] = useState(25 * 60); // For countdown mode
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Pomodoro state
  const [pomodoroPhase, setPomodoroPhase] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalPomodorosToday, setTotalPomodorosToday] = useState(0);
  
  // Settings
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  
  // Timer metadata
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = settings.soundVolume;
  }, []);

  // Update audio volume when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.soundVolume;
    }
  }, [settings.soundVolume]);

  // Request notification permission
  useEffect(() => {
    if (settings.browserNotifications && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [settings.browserNotifications]);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setSeconds(state.seconds || 0);
        setMode(state.mode || 'stopwatch');
        setTargetSeconds(state.targetSeconds || 25 * 60);
        setSelectedCategory(state.selectedCategory || null);
        setSessionTitle(state.sessionTitle || '');
        setSessionNotes(state.sessionNotes || '');
        setPomodoroPhase(state.pomodoroPhase || 'work');
        setCompletedPomodoros(state.completedPomodoros || 0);
        
        // Check if it's a new day for pomodoro count
        const today = new Date().toDateString();
        if (state.pomodoroDate === today) {
          setTotalPomodorosToday(state.totalPomodorosToday || 0);
        }
        
        // Resume if was running
        if (state.isRunning && state.lastTick) {
          const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
          if (state.mode === 'stopwatch') {
            setSeconds(s => s + elapsed);
          } else {
            setSeconds(s => Math.max(0, s - elapsed));
          }
          setIsRunning(true);
          setStartTime(state.startTime);
        }
      } catch (e) {
        console.error('Failed to load timer state:', e);
      }
    }
  }, []);

  // Save state on changes
  useEffect(() => {
    const state = {
      seconds,
      isRunning,
      mode,
      targetSeconds,
      selectedCategory,
      sessionTitle,
      sessionNotes,
      startTime,
      pomodoroPhase,
      completedPomodoros,
      totalPomodorosToday,
      pomodoroDate: new Date().toDateString(),
      lastTick: isRunning ? Date.now() : null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [seconds, isRunning, mode, targetSeconds, selectedCategory, sessionTitle, sessionNotes, startTime, pomodoroPhase, completedPomodoros, totalPomodorosToday]);

  // Play sound and show notification
  const playNotification = useCallback((message) => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    
    if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('My Everything', { body: message, icon: '/favicon.ico' });
    }
  }, [settings.soundEnabled, settings.browserNotifications]);

  // Get current phase duration for pomodoro
  const getPhaseDuration = useCallback((phase) => {
    switch (phase) {
      case 'work': return settings.workDuration;
      case 'shortBreak': return settings.shortBreakDuration;
      case 'longBreak': return settings.longBreakDuration;
      default: return settings.workDuration;
    }
  }, [settings]);

  // Handle pomodoro phase completion
  const handlePomodoroComplete = useCallback(() => {
    if (pomodoroPhase === 'work') {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);
      setTotalPomodorosToday(prev => prev + 1);
      
      // Determine next phase
      if (newCompleted % settings.pomodorosUntilLongBreak === 0) {
        setPomodoroPhase('longBreak');
        setSeconds(settings.longBreakDuration);
        playNotification('Great work! Time for a long break.');
        if (settings.autoStartBreaks) {
          setIsRunning(true);
        } else {
          setIsRunning(false);
        }
      } else {
        setPomodoroPhase('shortBreak');
        setSeconds(settings.shortBreakDuration);
        playNotification('Good job! Take a short break.');
        if (settings.autoStartBreaks) {
          setIsRunning(true);
        } else {
          setIsRunning(false);
        }
      }
    } else {
      // Break completed, back to work
      setPomodoroPhase('work');
      setSeconds(settings.workDuration);
      playNotification('Break over! Ready to focus?');
      if (settings.autoStartWork) {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    }
  }, [pomodoroPhase, completedPomodoros, settings, playNotification]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (mode === 'stopwatch') {
            return prev + 1;
          } else if (mode === 'countdown') {
            if (prev <= 1) {
              setIsRunning(false);
              playNotification('Timer complete!');
              return 0;
            }
            return prev - 1;
          } else if (mode === 'pomodoro') {
            if (prev <= 1) {
              // Will be handled by effect
              setTimeout(() => handlePomodoroComplete(), 0);
              return 0;
            }
            return prev - 1;
          }
          return prev;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode, playNotification, handlePomodoroComplete]);

  // Update document title
  useEffect(() => {
    if (!settings.showTimeInTitle) {
      document.title = 'My Everything';
      return;
    }
    const formatted = formatTime(seconds);
    const modeIcon = mode === 'pomodoro' 
      ? (pomodoroPhase === 'work' ? '🍅' : '☕') 
      : (mode === 'countdown' ? '⏳' : '⏱️');
    document.title = isRunning 
      ? `${formatted} ${modeIcon} ME`
      : 'My Everything';
  }, [seconds, isRunning, mode, pomodoroPhase, settings.showTimeInTitle]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (settings.showSeconds) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const start = useCallback(() => {
    if (!isRunning) {
      if (!startTime) {
        setStartTime(new Date().toISOString());
      }
      setIsRunning(true);
    }
  }, [isRunning, startTime]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (mode === 'countdown') {
      setSeconds(targetSeconds);
    } else if (mode === 'pomodoro') {
      setSeconds(getPhaseDuration(pomodoroPhase));
    } else {
      setSeconds(0);
    }
    setStartTime(null);
  }, [mode, targetSeconds, pomodoroPhase, getPhaseDuration]);

  const adjustTime = useCallback((delta) => {
    setSeconds(prev => Math.max(0, prev + delta));
  }, []);

  const setTime = useCallback((newSeconds) => {
    setSeconds(Math.max(0, newSeconds));
  }, []);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setIsRunning(false);
    if (newMode === 'countdown') {
      setSeconds(targetSeconds);
    } else if (newMode === 'pomodoro') {
      setPomodoroPhase('work');
      setCompletedPomodoros(0);
      setSeconds(settings.workDuration);
    } else {
      setSeconds(0);
    }
    setStartTime(null);
  }, [targetSeconds, settings.workDuration]);

  const skipPomodoroPhase = useCallback(() => {
    if (mode !== 'pomodoro') return;
    handlePomodoroComplete();
  }, [mode, handlePomodoroComplete]);

  const resetPomodoro = useCallback(() => {
    setPomodoroPhase('work');
    setCompletedPomodoros(0);
    setSeconds(settings.workDuration);
    setIsRunning(false);
    setStartTime(null);
  }, [settings.workDuration]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const setCountdownTarget = useCallback((secs) => {
    setTargetSeconds(secs);
    if (mode === 'countdown' && !isRunning) {
      setSeconds(secs);
    }
  }, [mode, isRunning]);

  const getSessionData = useCallback(() => {
    let duration;
    if (mode === 'stopwatch') {
      duration = seconds;
    } else if (mode === 'countdown') {
      duration = targetSeconds - seconds;
    } else {
      // Pomodoro - calculate work time completed
      duration = getPhaseDuration(pomodoroPhase) - seconds;
    }
    
    return {
      duration,
      title: sessionTitle || 'Untitled Session',
      notes: sessionNotes,
      categoryId: selectedCategory?.id || null,
      timerMode: mode,
      pomodoroPhase: mode === 'pomodoro' ? pomodoroPhase : null,
      startTime,
      endTime: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10)
    };
  }, [seconds, mode, targetSeconds, sessionTitle, sessionNotes, selectedCategory, startTime, pomodoroPhase, getPhaseDuration]);

  const clearSession = useCallback(() => {
    if (mode === 'countdown') {
      setSeconds(targetSeconds);
    } else if (mode === 'pomodoro') {
      setSeconds(getPhaseDuration(pomodoroPhase));
    } else {
      setSeconds(0);
    }
    setIsRunning(false);
    setStartTime(null);
    setSessionTitle('');
    setSessionNotes('');
  }, [mode, targetSeconds, pomodoroPhase, getPhaseDuration]);

  const value = {
    // State
    seconds,
    isRunning,
    mode,
    targetSeconds,
    selectedCategory,
    sessionTitle,
    sessionNotes,
    startTime,
    
    // Pomodoro state
    pomodoroPhase,
    completedPomodoros,
    totalPomodorosToday,
    
    // Settings
    settings,
    updateSettings,
    
    // Computed
    formattedTime: formatTime(seconds),
    progress: mode === 'countdown' 
      ? ((targetSeconds - seconds) / targetSeconds) * 100 
      : mode === 'pomodoro'
        ? ((getPhaseDuration(pomodoroPhase) - seconds) / getPhaseDuration(pomodoroPhase)) * 100
        : 0,
    
    // Actions
    start,
    pause,
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
    formatTime,
    
    // Pomodoro actions
    skipPomodoroPhase,
    resetPomodoro,
    getPhaseDuration
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}
