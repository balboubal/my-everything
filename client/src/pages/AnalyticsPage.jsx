import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import AdvancedAnalytics from '../components/AdvancedAnalytics';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Calendar,
  Flame,
  Target,
  Award,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './AnalyticsPage.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
  const { sessions, categories } = useData();
  const [timeRange, setTimeRange] = useState('30days'); // 'today', '7days', '30days', 'thisMonth', 'lastMonth', 'thisYear', 'allTime', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonType, setComparisonType] = useState('week'); // 'week', 'month'

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    const days7 = new Date(today);
    days7.setDate(days7.getDate() - 7);
    
    const days30 = new Date(today);
    days30.setDate(days30.getDate() - 30);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    
    return {
      today: { start: todayStr, end: todayStr },
      '7days': { start: days7.toISOString().slice(0, 10), end: todayStr },
      '30days': { start: days30.toISOString().slice(0, 10), end: todayStr },
      thisMonth: { start: thisMonthStart.toISOString().slice(0, 10), end: todayStr },
      lastMonth: { start: lastMonthStart.toISOString().slice(0, 10), end: lastMonthEnd.toISOString().slice(0, 10) },
      thisYear: { start: thisYearStart.toISOString().slice(0, 10), end: todayStr },
      allTime: { start: '2000-01-01', end: todayStr },
      custom: { start: customStart || todayStr, end: customEnd || todayStr }
    };
  }, [customStart, customEnd]);

  // Get active date range
  const activeRange = dateRanges[timeRange];

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.date >= activeRange.start && s.date <= activeRange.end);
  }, [sessions, activeRange]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!comparisonMode) return null;
    
    const today = new Date();
    let currentStart, currentEnd, previousStart, previousEnd, label1, label2;
    
    if (comparisonType === 'week') {
      // This week vs last week
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay());
      currentStart = startOfThisWeek.toISOString().slice(0, 10);
      currentEnd = today.toISOString().slice(0, 10);
      
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
      previousStart = startOfLastWeek.toISOString().slice(0, 10);
      previousEnd = endOfLastWeek.toISOString().slice(0, 10);
      
      label1 = 'This Week';
      label2 = 'Last Week';
    } else {
      // This month vs last month
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      currentStart = startOfThisMonth.toISOString().slice(0, 10);
      currentEnd = today.toISOString().slice(0, 10);
      
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      previousStart = startOfLastMonth.toISOString().slice(0, 10);
      previousEnd = endOfLastMonth.toISOString().slice(0, 10);
      
      label1 = 'This Month';
      label2 = 'Last Month';
    }
    
    const currentSessions = sessions.filter(s => s.date >= currentStart && s.date <= currentEnd);
    const previousSessions = sessions.filter(s => s.date >= previousStart && s.date <= previousEnd);
    
    const currentTotal = currentSessions.reduce((sum, s) => sum + s.duration, 0);
    const previousTotal = previousSessions.reduce((sum, s) => sum + s.duration, 0);
    
    const currentDays = Math.ceil((new Date(currentEnd) - new Date(currentStart)) / (1000 * 60 * 60 * 24)) + 1;
    const previousDays = Math.ceil((new Date(previousEnd) - new Date(previousStart)) / (1000 * 60 * 60 * 24)) + 1;
    
    const currentAvg = currentTotal / currentDays;
    const previousAvg = previousTotal / previousDays;
    
    const percentChange = previousTotal > 0 
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) 
      : currentTotal > 0 ? 100 : 0;
    
    return {
      current: { 
        label: label1, 
        total: currentTotal, 
        sessions: currentSessions.length,
        avgPerDay: currentAvg
      },
      previous: { 
        label: label2, 
        total: previousTotal, 
        sessions: previousSessions.length,
        avgPerDay: previousAvg
      },
      percentChange,
      isImprovement: percentChange > 0
    };
  }, [comparisonMode, comparisonType, sessions]);

  // Calculate number of days in range
  const daysInRange = useMemo(() => {
    const start = new Date(activeRange.start);
    const end = new Date(activeRange.end);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [activeRange]);

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = sessions.filter(s => s.date === today);
    const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    
    const rangeTotal = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
    const avgPerDay = daysInRange > 0 ? rangeTotal / daysInRange : 0;
    
    // Calculate streak
    let streak = 0;
    const sortedDates = [...new Set(sessions.map(s => s.date))].sort((a, b) => b.localeCompare(a));
    let currentDate = new Date(today);
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const diff = Math.floor((currentDate - date) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) {
        streak++;
        currentDate = date;
      } else {
        break;
      }
    }
    
    // Best day
    const dayTotals = {};
    sessions.forEach(s => {
      dayTotals[s.date] = (dayTotals[s.date] || 0) + s.duration;
    });
    const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    
    return {
      todayTotal,
      rangeTotal,
      avgPerDay: Math.round(avgPerDay),
      sessionCount: filteredSessions.length,
      streak,
      bestDay: bestDay ? { date: bestDay[0], duration: bestDay[1] } : null
    };
  }, [sessions, filteredSessions, dateRanges, timeRange]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
    const data = [];
    
    if (timeRange === 'year') {
      // Monthly data for year view
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);
        const monthSessions = sessions.filter(s => s.date.startsWith(monthStr));
        const total = monthSessions.reduce((sum, s) => sum + s.duration, 0);
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short' }),
          hours: Math.round(total / 3600 * 10) / 10,
          sessions: monthSessions.length
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const daySessions = sessions.filter(s => s.date === dateStr);
        const total = daySessions.reduce((sum, s) => sum + s.duration, 0);
        
        data.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
          hours: Math.round(total / 3600 * 10) / 10,
          sessions: daySessions.length
        });
      }
    }
    
    return data;
  }, [sessions, timeRange]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const breakdown = {};
    
    filteredSessions.forEach(s => {
      const catId = s.category_id || 'uncategorized';
      const catName = s.category_name || 'Uncategorized';
      const catColor = s.category_color || '#6366f1';
      
      if (!breakdown[catId]) {
        breakdown[catId] = { name: catName, color: catColor, duration: 0, count: 0 };
      }
      breakdown[catId].duration += s.duration;
      breakdown[catId].count += 1;
    });
    
    return Object.values(breakdown)
      .sort((a, b) => b.duration - a.duration)
      .map(cat => ({
        ...cat,
        hours: Math.round(cat.duration / 3600 * 10) / 10
      }));
  }, [filteredSessions]);

  // Heatmap data (last 52 weeks)
  const heatmapData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    
    // Get the start of the current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Go back 52 weeks
    for (let w = 51; w >= 0; w--) {
      const weekData = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() - (w * 7) + d);
        const dateStr = date.toISOString().slice(0, 10);
        const daySessions = sessions.filter(s => s.date === dateStr);
        const total = daySessions.reduce((sum, s) => sum + s.duration, 0);
        
        weekData.push({
          date: dateStr,
          duration: total,
          level: total === 0 ? 0 : total < 1800 ? 1 : total < 3600 ? 2 : total < 7200 ? 3 : 4
        });
      }
      weeks.push(weekData);
    }
    
    return weeks;
  }, [sessions]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatHeatmapDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      setTimeRange('custom');
      setShowCustomPicker(false);
    }
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>
          <BarChart3 size={28} />
          Analytics
        </h1>

        <div className="time-range-selector">
          <button 
            className={timeRange === 'today' ? 'active' : ''}
            onClick={() => setTimeRange('today')}
          >
            Today
          </button>
          <button 
            className={timeRange === '7days' ? 'active' : ''}
            onClick={() => setTimeRange('7days')}
          >
            7 Days
          </button>
          <button 
            className={timeRange === '30days' ? 'active' : ''}
            onClick={() => setTimeRange('30days')}
          >
            30 Days
          </button>
          <button 
            className={timeRange === 'thisMonth' ? 'active' : ''}
            onClick={() => setTimeRange('thisMonth')}
          >
            This Month
          </button>
          <button 
            className={timeRange === 'thisYear' ? 'active' : ''}
            onClick={() => setTimeRange('thisYear')}
          >
            This Year
          </button>
          <button 
            className={timeRange === 'allTime' ? 'active' : ''}
            onClick={() => setTimeRange('allTime')}
          >
            All Time
          </button>
          <button 
            className={`custom-range-btn ${timeRange === 'custom' ? 'active' : ''}`}
            onClick={() => setShowCustomPicker(!showCustomPicker)}
          >
            <CalendarDays size={16} />
            Custom
          </button>
        </div>

        {showCustomPicker && (
          <div className="custom-date-picker">
            <div className="date-inputs">
              <div className="form-group">
                <label>From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <span className="date-separator">→</span>
              <div className="form-group">
                <label>To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleCustomRange}
                disabled={!customStart || !customEnd}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Comparison Mode Toggle */}
        <div className="comparison-toggle">
          <button 
            className={`btn ${comparisonMode ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            <TrendingUp size={16} />
            Compare
          </button>
          {comparisonMode && (
            <div className="comparison-options">
              <button 
                className={`btn btn-sm ${comparisonType === 'week' ? 'btn-secondary active' : 'btn-ghost'}`}
                onClick={() => setComparisonType('week')}
              >
                Week vs Week
              </button>
              <button 
                className={`btn btn-sm ${comparisonType === 'month' ? 'btn-secondary active' : 'btn-ghost'}`}
                onClick={() => setComparisonType('month')}
              >
                Month vs Month
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Panel */}
      {comparisonMode && comparisonData && (
        <div className="comparison-panel">
          <h2>
            <TrendingUp size={20} />
            {comparisonData.current.label} vs {comparisonData.previous.label}
          </h2>
          
          <div className="comparison-grid">
            <div className="comparison-card current">
              <span className="comparison-label">{comparisonData.current.label}</span>
              <span className="comparison-total">{formatDuration(comparisonData.current.total)}</span>
              <div className="comparison-meta">
                <span>{comparisonData.current.sessions} sessions</span>
                <span>{formatDuration(comparisonData.current.avgPerDay)}/day avg</span>
              </div>
            </div>
            
            <div className="comparison-vs">
              <div className={`comparison-change ${comparisonData.isImprovement ? 'positive' : 'negative'}`}>
                {comparisonData.isImprovement ? '+' : ''}{comparisonData.percentChange}%
              </div>
              <span>{comparisonData.isImprovement ? 'increase' : 'decrease'}</span>
            </div>
            
            <div className="comparison-card previous">
              <span className="comparison-label">{comparisonData.previous.label}</span>
              <span className="comparison-total">{formatDuration(comparisonData.previous.total)}</span>
              <div className="comparison-meta">
                <span>{comparisonData.previous.sessions} sessions</span>
                <span>{formatDuration(comparisonData.previous.avgPerDay)}/day avg</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today</span>
            <span className="stat-value">{formatDuration(stats.todayTotal)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">This {timeRange}</span>
            <span className="stat-value">{formatDuration(stats.rangeTotal)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-yellow-dim)', color: 'var(--accent-yellow)' }}>
            <Target size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Daily Average</span>
            <span className="stat-value">{formatDuration(stats.avgPerDay)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}>
            <Flame size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value">{stats.streak} days</span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row">
        {/* Activity chart */}
        <div className="chart-card large">
          <h3>Activity Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  unit="h"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHours)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="chart-card">
          <h3>By Category</h3>
          {categoryData.length > 0 ? (
            <>
              <div className="pie-chart-container">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="hours"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}h`, 'Time']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="category-legend">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="legend-item">
                    <span className="legend-color" style={{ background: cat.color }} />
                    <span className="legend-name">{cat.name}</span>
                    <span className="legend-value">{cat.hours}h</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-chart">
              <p>No data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="chart-card full-width">
        <h3>
          <Calendar size={18} />
          Activity Heatmap
        </h3>
        <div className="heatmap-container">
          <div className="heatmap-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <span key={i} className="weekday-label">{day}</span>
            ))}
          </div>
          <div className="heatmap-grid">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="heatmap-week">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`heatmap-day level-${day.level}`}
                    data-tooltip={`${formatHeatmapDate(day.date)}\n${day.duration > 0 ? formatDuration(day.duration) : 'No activity'}`}
                  >
                    <span className="heatmap-tooltip">
                      <strong>{formatHeatmapDate(day.date)}</strong>
                      <span>{day.duration > 0 ? formatDuration(day.duration) : 'No activity'}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-months">
            {MONTH_NAMES.map((month, i) => (
              <span key={i} className="month-label">{month}</span>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-day level-0" />
            <div className="heatmap-day level-1" />
            <div className="heatmap-day level-2" />
            <div className="heatmap-day level-3" />
            <div className="heatmap-day level-4" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Additional insights */}
      {stats.bestDay && (
        <div className="insight-card">
          <Award size={24} />
          <div>
            <strong>Best Day</strong>
            <p>You tracked {formatDuration(stats.bestDay.duration)} on {new Date(stats.bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      )}

      {/* Advanced Analytics */}
      <AdvancedAnalytics 
        sessions={sessions}
        categories={categories}
        dateRange={activeRange}
      />
    </div>
  );
}
