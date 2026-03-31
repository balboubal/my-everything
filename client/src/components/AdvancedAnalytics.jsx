import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  TrendingUp, 
  Calendar,
  Zap,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Award,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import './AdvancedAnalytics.css';

// Time of day helper
const getTimeOfDay = (timestamp) => {
  if (!timestamp) return 'unknown';
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const TIME_OF_DAY_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon
};

const TIME_OF_DAY_LABELS = {
  morning: 'Morning (5am-12pm)',
  afternoon: 'Afternoon (12pm-5pm)',
  evening: 'Evening (5pm-9pm)',
  night: 'Night (9pm-5am)'
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdvancedAnalytics({ sessions, categories, dateRange }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  // Simulate lazy loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [dateRange]);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.date >= dateRange.start && s.date <= dateRange.end
    );
  }, [sessions, dateRange]);

  // Time of day analysis
  const timeOfDayData = useMemo(() => {
    const data = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const counts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    
    filteredSessions.forEach(s => {
      const tod = getTimeOfDay(s.startTime || s.created_at);
      if (tod !== 'unknown') {
        data[tod] += s.duration || 0;
        counts[tod] += 1;
      }
    });

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    
    return Object.entries(data).map(([key, duration]) => ({
      name: key,
      label: TIME_OF_DAY_LABELS[key],
      duration,
      count: counts[key],
      hours: Math.round(duration / 3600 * 10) / 10,
      percentage: total > 0 ? Math.round(duration / total * 100) : 0
    })).sort((a, b) => b.duration - a.duration);
  }, [filteredSessions]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const data = DAY_NAMES.map((name, i) => ({
      name,
      fullName: FULL_DAY_NAMES[i],
      duration: 0,
      count: 0,
      hours: 0
    }));

    filteredSessions.forEach(s => {
      const dayIndex = new Date(s.date).getDay();
      data[dayIndex].duration += s.duration || 0;
      data[dayIndex].count += 1;
    });

    data.forEach(d => {
      d.hours = Math.round(d.duration / 3600 * 10) / 10;
    });

    return data;
  }, [filteredSessions]);

  // Session length distribution
  const sessionLengthDistribution = useMemo(() => {
    const buckets = [
      { name: '< 30m', min: 0, max: 1800, count: 0 },
      { name: '30m-1h', min: 1800, max: 3600, count: 0 },
      { name: '1-2h', min: 3600, max: 7200, count: 0 },
      { name: '2-4h', min: 7200, max: 14400, count: 0 },
      { name: '4-6h', min: 14400, max: 21600, count: 0 },
      { name: '6h+', min: 21600, max: Infinity, count: 0 }
    ];

    filteredSessions.forEach(s => {
      const bucket = buckets.find(b => s.duration >= b.min && s.duration < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [filteredSessions]);

  // Calculate insights
  const insights = useMemo(() => {
    if (filteredSessions.length === 0) return [];

    const insights = [];
    const totalDuration = filteredSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgSessionLength = totalDuration / filteredSessions.length;

    // Best time of day
    const bestTod = timeOfDayData[0];
    if (bestTod && bestTod.percentage > 30) {
      insights.push({
        icon: TIME_OF_DAY_ICONS[bestTod.name],
        title: `${bestTod.name.charAt(0).toUpperCase() + bestTod.name.slice(1)} person`,
        description: `You're most productive in the ${bestTod.name} with ${bestTod.percentage}% of your focus time`
      });
    }

    // Best day of week
    const bestDay = [...dayOfWeekData].sort((a, b) => b.duration - a.duration)[0];
    if (bestDay && bestDay.duration > 0) {
      insights.push({
        icon: Calendar,
        title: `${bestDay.fullName}s are your day`,
        description: `You've logged ${bestDay.hours}h on ${bestDay.fullName}s - your most productive day`
      });
    }

    // Deep work insight
    const deepWorkSessions = filteredSessions.filter(s => (s.duration || 0) >= 7200);
    if (deepWorkSessions.length > 0) {
      const deepWorkHours = Math.round(deepWorkSessions.reduce((sum, s) => sum + s.duration, 0) / 3600);
      insights.push({
        icon: Zap,
        title: 'Deep work champion',
        description: `${deepWorkSessions.length} sessions over 2 hours for ${deepWorkHours}h of deep focus`
      });
    }

    // Average session length
    insights.push({
      icon: Clock,
      title: 'Average session',
      description: `Your typical session is ${formatDuration(avgSessionLength)}`
    });

    // Longest session
    const longestSession = filteredSessions.reduce((max, s) => 
      (s.duration || 0) > (max?.duration || 0) ? s : max, null);
    if (longestSession) {
      insights.push({
        icon: Award,
        title: 'Longest session',
        description: `${formatDuration(longestSession.duration)} on ${formatDate(longestSession.date)}`
      });
    }

    // Productivity Score (0-100)
    // Based on: consistency, avg session length, deep work ratio, trend
    const uniqueDays = new Set(filteredSessions.map(s => s.date)).size;
    const dateStart = new Date(dateRange.start);
    const dateEnd = new Date(dateRange.end);
    const totalDays = Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24)) + 1;
    
    const consistencyScore = Math.min((uniqueDays / totalDays) * 100, 100) * 0.3; // 30% weight
    const avgSessionScore = Math.min((avgSessionLength / 7200) * 100, 100) * 0.25; // 25% weight, 2h max
    const deepWorkRatio = filteredSessions.length > 0 
      ? (deepWorkSessions.length / filteredSessions.length) * 100 
      : 0;
    const deepWorkScore = Math.min(deepWorkRatio * 2, 100) * 0.25; // 25% weight
    const volumeScore = Math.min((totalDuration / (totalDays * 4 * 3600)) * 100, 100) * 0.2; // 20% weight, 4h/day target
    
    const productivityScore = Math.round(consistencyScore + avgSessionScore + deepWorkScore + volumeScore);
    
    let scoreLabel, scoreColor;
    if (productivityScore >= 80) { scoreLabel = 'Excellent'; scoreColor = 'var(--success)'; }
    else if (productivityScore >= 60) { scoreLabel = 'Good'; scoreColor = 'var(--accent-primary)'; }
    else if (productivityScore >= 40) { scoreLabel = 'Fair'; scoreColor = 'var(--warning)'; }
    else { scoreLabel = 'Needs work'; scoreColor = 'var(--danger)'; }
    
    insights.unshift({
      icon: TrendingUp,
      title: `Productivity: ${productivityScore}`,
      description: `${scoreLabel} - Based on consistency, session depth & volume`,
      highlight: true,
      color: scoreColor
    });

    // Consistency insight (reusing uniqueDays and totalDays from above)
    const consistency = Math.round((uniqueDays / totalDays) * 100);
    
    if (consistency >= 70) {
      insights.push({
        icon: Target,
        title: 'Consistency champion',
        description: `Active ${consistency}% of days in this period (${uniqueDays}/${totalDays} days)`
      });
    } else if (consistency >= 40) {
      insights.push({
        icon: Activity,
        title: 'Room for consistency',
        description: `Active ${consistency}% of days - try to be more consistent!`
      });
    }

    return insights;
  }, [filteredSessions, timeOfDayData, dayOfWeekData, dateRange]);

  // Category trends over time
  const categoryTrends = useMemo(() => {
    // Group sessions by week and category
    const weeklyData = {};
    
    filteredSessions.forEach(s => {
      const date = new Date(s.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { week: weekKey };
      }
      
      const catName = s.category_name || 'Uncategorized';
      weeklyData[weekKey][catName] = (weeklyData[weekKey][catName] || 0) + (s.duration || 0) / 3600;
    });

    return Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
  }, [filteredSessions]);

  if (isLoading) {
    return (
      <div className="advanced-analytics loading">
        <div className="loading-spinner" />
        <p>Calculating insights...</p>
      </div>
    );
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="advanced-analytics empty">
        <p>No sessions in this time period</p>
      </div>
    );
  }

  return (
    <div className="advanced-analytics">
      {/* Insights Cards */}
      <div className="insights-section">
        <h3><Zap size={18} /> Insights</h3>
        <div className="insights-grid">
          {insights.map((insight, i) => (
            <div 
              key={i} 
              className={`insight-card ${insight.highlight ? 'highlight' : ''}`}
              style={insight.color ? { '--highlight-color': insight.color } : {}}
            >
              <div className="insight-icon" style={insight.color ? { color: insight.color } : {}}>
                <insight.icon size={20} />
              </div>
              <div className="insight-content">
                <strong style={insight.color ? { color: insight.color } : {}}>{insight.title}</strong>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time of Day Chart */}
      <div className="analytics-section">
        <h3><Clock size={18} /> Time of Day</h3>
        <div className="time-of-day-grid">
          {timeOfDayData.map(tod => {
            const Icon = TIME_OF_DAY_ICONS[tod.name];
            return (
              <div key={tod.name} className={`tod-card ${tod.percentage > 30 ? 'highlight' : ''}`}>
                <div className="tod-icon">
                  <Icon size={24} />
                </div>
                <div className="tod-info">
                  <span className="tod-name">{tod.name}</span>
                  <span className="tod-hours">{tod.hours}h</span>
                  <span className="tod-percentage">{tod.percentage}%</span>
                </div>
                <div className="tod-bar">
                  <div 
                    className="tod-bar-fill" 
                    style={{ width: `${tod.percentage}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day of Week Chart */}
      <div className="analytics-section">
        <h3><Calendar size={18} /> Day of Week</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}h`, 'Time']}
                labelFormatter={(label) => FULL_DAY_NAMES[DAY_NAMES.indexOf(label)]}
              />
              <Bar dataKey="hours" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session Length Distribution */}
      <div className="analytics-section">
        <h3><BarChart3 size={18} /> Session Length Distribution</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sessionLengthDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value} sessions`, 'Count']}
              />
              <Bar dataKey="count" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Trends */}
      {categoryTrends.length > 1 && (
        <div className="analytics-section">
          <h3><TrendingUp size={18} /> Category Trends</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={categoryTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="week" 
                  stroke="var(--text-tertiary)" 
                  fontSize={12}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value.toFixed(1)}h`, '']}
                />
                {categories.slice(0, 5).map((cat, i) => (
                  <Line 
                    key={cat.id}
                    type="monotone"
                    dataKey={cat.name}
                    stroke={cat.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="trend-legend">
              {categories.slice(0, 5).map(cat => (
                <span key={cat.id} className="trend-legend-item">
                  <span className="legend-dot" style={{ background: cat.color }} />
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
