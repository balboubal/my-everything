import { useState } from 'react';
import { useGoals } from '../context/GoalsContext';
import { useData } from '../context/DataContext';
import {
  Target,
  Calendar,
  CalendarDays,
  CalendarRange,
  Flame,
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';
import './GoalsPage.css';

export default function GoalsPage() {
  const {
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
  } = useGoals();

  const { categories } = useData();

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', targetHours: 100 });
  const [categoryForm, setCategoryForm] = useState({ categoryId: '', daily: 0, weekly: 0 });

  const handleAddMilestone = () => {
    if (milestoneForm.title && milestoneForm.targetHours > 0) {
      addMilestone(milestoneForm.title, milestoneForm.targetHours);
      setMilestoneForm({ title: '', targetHours: 100 });
      setShowMilestoneModal(false);
    }
  };

  const handleAddCategoryTarget = () => {
    if (categoryForm.categoryId && (categoryForm.daily > 0 || categoryForm.weekly > 0)) {
      if (categoryForm.daily > 0) {
        setCategoryTarget(categoryForm.categoryId, 'daily', categoryForm.daily);
      }
      if (categoryForm.weekly > 0) {
        setCategoryTarget(categoryForm.categoryId, 'weekly', categoryForm.weekly);
      }
      setCategoryForm({ categoryId: '', daily: 0, weekly: 0 });
      setShowCategoryModal(false);
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'var(--success)';
    if (percent >= 75) return 'var(--accent-primary)';
    if (percent >= 50) return 'var(--warning)';
    return 'var(--text-tertiary)';
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '💪';
    return '🌱';
  };

  const getMedalForToday = () => {
    const hours = stats.today.time / 3600;
    if (hours >= 4) return { emoji: '🥇', label: 'Gold', color: '#ffd700' };
    if (hours >= 3) return { emoji: '🥈', label: 'Silver', color: '#c0c0c0' };
    if (hours >= 2) return { emoji: '🥉', label: 'Bronze', color: '#cd7f32' };
    return null;
  };

  const medal = getMedalForToday();

  return (
    <div className="goals-page">
      <div className="goals-header">
        <h1>
          <Target size={28} />
          Goals & Progress
        </h1>
      </div>

      {/* Today's Overview */}
      <div className="today-overview">
        <div className="overview-card highlight">
          <div className="overview-icon">
            <Zap size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-label">Today</span>
            <span className="overview-value">{formatDuration(stats.today.time)}</span>
            <span className="overview-sub">{stats.today.count} session{stats.today.count !== 1 ? 's' : ''}</span>
          </div>
          {medal && (
            <div className="daily-medal" style={{ color: medal.color }}>
              <span className="medal-emoji">{medal.emoji}</span>
              <span className="medal-label">{medal.label}</span>
            </div>
          )}
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Flame size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-label">Current Streak</span>
            <span className="overview-value">
              {getStreakEmoji(stats.streak)} {stats.streak} day{stats.streak !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Trophy size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-label">All Time</span>
            <span className="overview-value">{Math.floor(stats.totalTime / 3600)}h</span>
          </div>
        </div>
      </div>

      {/* Main Goals */}
      <div className="goals-grid">
        {/* Daily Goal */}
        <div className={`goal-card ${!goals.enableDailyGoal ? 'disabled' : ''}`}>
          <div className="goal-header">
            <div className="goal-title">
              <Calendar size={20} />
              <span>Daily Goal</span>
            </div>
            <button
              className={`toggle-btn small ${goals.enableDailyGoal ? 'active' : ''}`}
              onClick={() => toggleGoal('daily', !goals.enableDailyGoal)}
            >
              <span className="toggle-slider" />
            </button>
          </div>
          
          {goals.enableDailyGoal && (
            <>
              <div className="goal-progress">
                <div className="progress-circle">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="progress-fill"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDasharray: 2 * Math.PI * 45,
                        strokeDashoffset: 2 * Math.PI * 45 * (1 - progress.daily / 100),
                        stroke: getProgressColor(progress.daily)
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="progress-percent">{Math.round(progress.daily)}%</span>
                  </div>
                </div>
                <div className="progress-details">
                  <span className="progress-current">{formatDuration(stats.today.time)}</span>
                  <span className="progress-target">of {formatDuration(goals.dailyTarget)}</span>
                </div>
              </div>

              <div className="goal-edit">
                <label>Target:</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={goals.dailyTarget / 3600}
                  onChange={(e) => setDailyTarget(parseFloat(e.target.value) || 0)}
                />
                <span>hours/day</span>
              </div>
            </>
          )}
        </div>

        {/* Weekly Goal */}
        <div className={`goal-card ${!goals.enableWeeklyGoal ? 'disabled' : ''}`}>
          <div className="goal-header">
            <div className="goal-title">
              <CalendarDays size={20} />
              <span>Weekly Goal</span>
            </div>
            <button
              className={`toggle-btn small ${goals.enableWeeklyGoal ? 'active' : ''}`}
              onClick={() => toggleGoal('weekly', !goals.enableWeeklyGoal)}
            >
              <span className="toggle-slider" />
            </button>
          </div>
          
          {goals.enableWeeklyGoal && (
            <>
              <div className="goal-progress">
                <div className="progress-circle">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="progress-fill"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDasharray: 2 * Math.PI * 45,
                        strokeDashoffset: 2 * Math.PI * 45 * (1 - progress.weekly / 100),
                        stroke: getProgressColor(progress.weekly)
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="progress-percent">{Math.round(progress.weekly)}%</span>
                  </div>
                </div>
                <div className="progress-details">
                  <span className="progress-current">{formatDuration(stats.week.time)}</span>
                  <span className="progress-target">of {formatDuration(goals.weeklyTarget)}</span>
                </div>
              </div>

              <div className="goal-edit">
                <label>Target:</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  value={goals.weeklyTarget / 3600}
                  onChange={(e) => setWeeklyTarget(parseFloat(e.target.value) || 0)}
                />
                <span>hours/week</span>
              </div>
            </>
          )}
        </div>

        {/* Monthly Goal */}
        <div className={`goal-card ${!goals.enableMonthlyGoal ? 'disabled' : ''}`}>
          <div className="goal-header">
            <div className="goal-title">
              <CalendarRange size={20} />
              <span>Monthly Goal</span>
            </div>
            <button
              className={`toggle-btn small ${goals.enableMonthlyGoal ? 'active' : ''}`}
              onClick={() => toggleGoal('monthly', !goals.enableMonthlyGoal)}
            >
              <span className="toggle-slider" />
            </button>
          </div>
          
          {goals.enableMonthlyGoal && (
            <>
              <div className="goal-progress">
                <div className="progress-circle">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="progress-fill"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDasharray: 2 * Math.PI * 45,
                        strokeDashoffset: 2 * Math.PI * 45 * (1 - progress.monthly / 100),
                        stroke: getProgressColor(progress.monthly)
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="progress-percent">{Math.round(progress.monthly)}%</span>
                  </div>
                </div>
                <div className="progress-details">
                  <span className="progress-current">{formatDuration(stats.month.time)}</span>
                  <span className="progress-target">of {formatDuration(goals.monthlyTarget)}</span>
                </div>
              </div>

              <div className="goal-edit">
                <label>Target:</label>
                <input
                  type="number"
                  min="1"
                  max="744"
                  step="1"
                  value={goals.monthlyTarget / 3600}
                  onChange={(e) => setMonthlyTarget(parseFloat(e.target.value) || 0)}
                />
                <span>hours/month</span>
              </div>
            </>
          )}
        </div>

        {/* Streak Goal */}
        <div className={`goal-card ${!goals.enableStreakGoal ? 'disabled' : ''}`}>
          <div className="goal-header">
            <div className="goal-title">
              <Flame size={20} />
              <span>Streak Goal</span>
            </div>
            <button
              className={`toggle-btn small ${goals.enableStreakGoal ? 'active' : ''}`}
              onClick={() => toggleGoal('streak', !goals.enableStreakGoal)}
            >
              <span className="toggle-slider" />
            </button>
          </div>
          
          {goals.enableStreakGoal && (
            <>
              <div className="goal-progress">
                <div className="progress-circle">
                  <svg viewBox="0 0 100 100">
                    <circle className="progress-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="progress-fill"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDasharray: 2 * Math.PI * 45,
                        strokeDashoffset: 2 * Math.PI * 45 * (1 - progress.streak / 100),
                        stroke: getProgressColor(progress.streak)
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="progress-percent">{getStreakEmoji(stats.streak)}</span>
                  </div>
                </div>
                <div className="progress-details">
                  <span className="progress-current">{stats.streak} days</span>
                  <span className="progress-target">goal: {goals.streakGoal} days</span>
                </div>
              </div>

              <div className="goal-edit">
                <label>Target:</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={goals.streakGoal}
                  onChange={(e) => setStreakGoal(parseInt(e.target.value) || 7)}
                />
                <span>days</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Targets */}
      <div className="section">
        <div className="section-header">
          <h2>
            <TrendingUp size={22} />
            Category Targets
          </h2>
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
            <Plus size={18} />
            Add Target
          </button>
        </div>

        {Object.keys(goals.categoryTargets).length === 0 ? (
          <div className="empty-state small">
            <p>No category targets set</p>
            <span>Set targets for specific categories to track focused progress</span>
          </div>
        ) : (
          <div className="category-targets-list">
            {Object.entries(goals.categoryTargets).map(([catId, targets]) => {
              const category = categories.find(c => c.id === catId);
              if (!category) return null;
              
              const catStats = stats.categoryStats[catId] || { todayTime: 0, weekTime: 0 };
              const dailyProg = targets.daily > 0 ? (catStats.todayTime / targets.daily) * 100 : 0;
              const weeklyProg = targets.weekly > 0 ? (catStats.weekTime / targets.weekly) * 100 : 0;

              return (
                <div key={catId} className="category-target-card">
                  <div className="category-target-header">
                    <span className="category-dot" style={{ background: category.color }} />
                    <span className="category-name">{category.name}</span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeCategoryTarget(catId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="category-target-progress">
                    {targets.daily > 0 && (
                      <div className="mini-progress">
                        <div className="mini-progress-header">
                          <span>Daily</span>
                          <span>{formatDuration(catStats.todayTime)} / {formatDuration(targets.daily)}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(100, dailyProg)}%`,
                              background: getProgressColor(dailyProg)
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {targets.weekly > 0 && (
                      <div className="mini-progress">
                        <div className="mini-progress-header">
                          <span>Weekly</span>
                          <span>{formatDuration(catStats.weekTime)} / {formatDuration(targets.weekly)}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(100, weeklyProg)}%`,
                              background: getProgressColor(weeklyProg)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="section">
        <div className="section-header">
          <h2>
            <Award size={22} />
            Milestones
          </h2>
          <button className="btn btn-secondary" onClick={() => setShowMilestoneModal(true)}>
            <Plus size={18} />
            Add Milestone
          </button>
        </div>

        {goals.milestones.length === 0 ? (
          <div className="empty-state small">
            <Trophy size={32} />
            <p>No milestones set</p>
            <span>Create milestones to celebrate your achievements</span>
          </div>
        ) : (
          <div className="milestones-list">
            {progress.milestones.map(milestone => (
              <div key={milestone.id} className={`milestone-card ${milestone.achieved ? 'achieved' : ''}`}>
                <div className="milestone-icon">
                  {milestone.achieved ? '🏆' : '🎯'}
                </div>
                <div className="milestone-content">
                  <span className="milestone-title">{milestone.title}</span>
                  <span className="milestone-target">{milestone.targetHours} hours</span>
                  {!milestone.achieved && (
                    <div className="milestone-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                      <span className="milestone-percent">{Math.round(milestone.progress)}%</span>
                    </div>
                  )}
                  {milestone.achieved && milestone.achievedAt && (
                    <span className="milestone-achieved-date">
                      Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => removeMilestone(milestone.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <div className="modal-overlay" onClick={() => setShowMilestoneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add Milestone</h2>
            
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                placeholder="e.g., 100 hours of coding"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Target Hours</label>
              <input
                type="number"
                min="1"
                value={milestoneForm.targetHours}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, targetHours: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="milestone-presets">
              {[10, 50, 100, 250, 500, 1000].map(hours => (
                <button
                  key={hours}
                  className={`preset-chip ${milestoneForm.targetHours === hours ? 'active' : ''}`}
                  onClick={() => setMilestoneForm({ ...milestoneForm, targetHours: hours })}
                >
                  {hours}h
                </button>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowMilestoneModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddMilestone}>
                Add Milestone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Target Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add Category Target</h2>
            
            <div className="form-group">
              <label>Category</label>
              <select
                value={categoryForm.categoryId}
                onChange={(e) => setCategoryForm({ ...categoryForm, categoryId: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories
                  .filter(c => !goals.categoryTargets[c.id])
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="form-group">
              <label>Daily Target (hours)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={categoryForm.daily}
                onChange={(e) => setCategoryForm({ ...categoryForm, daily: parseFloat(e.target.value) || 0 })}
                placeholder="0 = no daily target"
              />
            </div>

            <div className="form-group">
              <label>Weekly Target (hours)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={categoryForm.weekly}
                onChange={(e) => setCategoryForm({ ...categoryForm, weekly: parseFloat(e.target.value) || 0 })}
                placeholder="0 = no weekly target"
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddCategoryTarget}>
                Add Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
