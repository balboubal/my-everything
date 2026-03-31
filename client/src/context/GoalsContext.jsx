import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from './DataContext';

const GoalsContext = createContext(null);

const GOALS_STORAGE_KEY = 'me_goals';

const DEFAULT_GOALS = {
  dailyTarget: 4 * 3600,      // 4 hours in seconds
  weeklyTarget: 20 * 3600,    // 20 hours in seconds
  monthlyTarget: 80 * 3600,   // 80 hours in seconds
  dailySessionTarget: 0,      // 0 = disabled
  weeklySessionTarget: 0,
  streakGoal: 7,              // days
  categoryTargets: {},        // { categoryId: { daily: seconds, weekly: seconds } }
  milestones: [],             // [{ id, title, targetHours, achieved, achievedAt }]
  enableDailyGoal: true,
  enableWeeklyGoal: true,
  enableMonthlyGoal: false,
  enableStreakGoal: true
};

export function GoalsProvider({ children }) {
  const { sessions, categories } = useData();
  
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem(GOALS_STORAGE_KEY);
    return saved ? { ...DEFAULT_GOALS, ...JSON.parse(saved) } : DEFAULT_GOALS;
  });

  // Save goals when changed
  useEffect(() => {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  // Calculate current stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekStart = startOfWeek.toISOString().slice(0, 10);
    const monthStart = now.toISOString().slice(0, 7);

    // Today's stats
    const todaySessions = sessions.filter(s => s.date === today);
    const todayTime = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const todayCount = todaySessions.length;

    // This week's stats
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const weekTime = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const weekCount = weekSessions.length;

    // This month's stats
    const monthSessions = sessions.filter(s => s.date?.startsWith(monthStart));
    const monthTime = monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const monthCount = monthSessions.length;

    // Calculate streak
    let streak = 0;
    let checkDate = new Date(now);
    
    // Check if today has activity, if not start from yesterday
    if (todaySessions.length === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const hasActivity = sessions.some(s => s.date === dateStr);
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Category-specific stats
    const categoryStats = {};
    categories.forEach(cat => {
      const catTodaySessions = todaySessions.filter(s => s.category_id === cat.id);
      const catWeekSessions = weekSessions.filter(s => s.category_id === cat.id);
      categoryStats[cat.id] = {
        todayTime: catTodaySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        weekTime: catWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        todayCount: catTodaySessions.length,
        weekCount: catWeekSessions.length
      };
    });

    // Total all-time hours
    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      today: { time: todayTime, count: todayCount },
      week: { time: weekTime, count: weekCount },
      month: { time: monthTime, count: monthCount },
      streak,
      totalTime,
      categoryStats
    };
  }, [sessions, categories]);

  // Calculate goal progress
  const progress = useMemo(() => {
    const dailyProgress = goals.dailyTarget > 0 
      ? Math.min(100, (stats.today.time / goals.dailyTarget) * 100)
      : 0;
    
    const weeklyProgress = goals.weeklyTarget > 0
      ? Math.min(100, (stats.week.time / goals.weeklyTarget) * 100)
      : 0;
    
    const monthlyProgress = goals.monthlyTarget > 0
      ? Math.min(100, (stats.month.time / goals.monthlyTarget) * 100)
      : 0;

    const streakProgress = goals.streakGoal > 0
      ? Math.min(100, (stats.streak / goals.streakGoal) * 100)
      : 0;

    // Category progress
    const categoryProgress = {};
    Object.entries(goals.categoryTargets).forEach(([catId, targets]) => {
      const catStats = stats.categoryStats[catId] || { todayTime: 0, weekTime: 0 };
      categoryProgress[catId] = {
        daily: targets.daily > 0 ? Math.min(100, (catStats.todayTime / targets.daily) * 100) : 0,
        weekly: targets.weekly > 0 ? Math.min(100, (catStats.weekTime / targets.weekly) * 100) : 0
      };
    });

    // Check milestones
    const totalHours = stats.totalTime / 3600;
    const milestoneProgress = goals.milestones.map(m => ({
      ...m,
      progress: Math.min(100, (totalHours / m.targetHours) * 100),
      achieved: m.achieved || totalHours >= m.targetHours
    }));

    return {
      daily: dailyProgress,
      weekly: weeklyProgress,
      monthly: monthlyProgress,
      streak: streakProgress,
      categories: categoryProgress,
      milestones: milestoneProgress
    };
  }, [goals, stats]);

  // Update goals
  const updateGoals = useCallback((updates) => {
    setGoals(prev => ({ ...prev, ...updates }));
  }, []);

  // Set daily target
  const setDailyTarget = useCallback((hours) => {
    setGoals(prev => ({ ...prev, dailyTarget: hours * 3600 }));
  }, []);

  // Set weekly target
  const setWeeklyTarget = useCallback((hours) => {
    setGoals(prev => ({ ...prev, weeklyTarget: hours * 3600 }));
  }, []);

  // Set monthly target
  const setMonthlyTarget = useCallback((hours) => {
    setGoals(prev => ({ ...prev, monthlyTarget: hours * 3600 }));
  }, []);

  // Set streak goal
  const setStreakGoal = useCallback((days) => {
    setGoals(prev => ({ ...prev, streakGoal: days }));
  }, []);

  // Set category target
  const setCategoryTarget = useCallback((categoryId, type, hours) => {
    setGoals(prev => ({
      ...prev,
      categoryTargets: {
        ...prev.categoryTargets,
        [categoryId]: {
          ...(prev.categoryTargets[categoryId] || {}),
          [type]: hours * 3600
        }
      }
    }));
  }, []);

  // Remove category target
  const removeCategoryTarget = useCallback((categoryId) => {
    setGoals(prev => {
      const newTargets = { ...prev.categoryTargets };
      delete newTargets[categoryId];
      return { ...prev, categoryTargets: newTargets };
    });
  }, []);

  // Add milestone
  const addMilestone = useCallback((title, targetHours) => {
    const milestone = {
      id: `milestone-${Date.now()}`,
      title,
      targetHours,
      achieved: false,
      achievedAt: null,
      createdAt: new Date().toISOString()
    };
    setGoals(prev => ({
      ...prev,
      milestones: [...prev.milestones, milestone]
    }));
    return milestone;
  }, []);

  // Remove milestone
  const removeMilestone = useCallback((milestoneId) => {
    setGoals(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId)
    }));
  }, []);

  // Toggle goal enabled
  const toggleGoal = useCallback((goalType, enabled) => {
    const key = `enable${goalType.charAt(0).toUpperCase() + goalType.slice(1)}Goal`;
    setGoals(prev => ({ ...prev, [key]: enabled }));
  }, []);

  // Check and mark achieved milestones
  useEffect(() => {
    const totalHours = stats.totalTime / 3600;
    let updated = false;
    
    const updatedMilestones = goals.milestones.map(m => {
      if (!m.achieved && totalHours >= m.targetHours) {
        updated = true;
        return { ...m, achieved: true, achievedAt: new Date().toISOString() };
      }
      return m;
    });

    if (updated) {
      setGoals(prev => ({ ...prev, milestones: updatedMilestones }));
    }
  }, [stats.totalTime, goals.milestones]);

  // Format duration helper
  const formatDuration = useCallback((seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  }, []);

  const value = {
    goals,
    stats,
    progress,
    updateGoals,
    setDailyTarget,
    setWeeklyTarget,
    setMonthlyTarget,
    setStreakGoal,
    setCategoryTarget,
    removeCategoryTarget,
    addMilestone,
    removeMilestone,
    toggleGoal,
    formatDuration
  };

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within GoalsProvider');
  }
  return context;
}
