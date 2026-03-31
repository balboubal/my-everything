import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import { 
  Calendar,
  Clock,
  Filter,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Check,
  MoreVertical,
  Folder
} from 'lucide-react';
import './TimetablePage.css';

export default function TimetablePage() {
  const { sessions, categories, deleteSession, bulkDeleteSessions, updateSession } = useData();
  const { formatTime } = useTimer();

  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterCategory, setFilterCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [editingSession, setEditingSession] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (filterCategory && session.category_id !== filterCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!session.title?.toLowerCase().includes(query) && 
            !session.notes?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, filterCategory, searchQuery]);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    filteredSessions.forEach(session => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });
    return grouped;
  }, [filteredSessions]);

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a));
  }, [sessionsByDate]);

  // Calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days = [];
    
    // Padding for previous month
    for (let i = 0; i < startPadding; i++) {
      const date = new Date(year, month, -startPadding + i + 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Padding for next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [currentMonth]);

  const toggleSessionSelection = (id) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSessions(newSelected);
  };

  const selectAllVisible = () => {
    setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return;
    if (!confirm(`Delete ${selectedSessions.size} session(s)?`)) return;
    
    await bulkDeleteSessions(Array.from(selectedSessions));
    setSelectedSessions(new Set());
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    await deleteSession(id);
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().slice(0, 10)) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().slice(0, 10)) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDayTotal = (dateStr) => {
    const daySessions = sessionsByDate[dateStr] || [];
    return daySessions.reduce((sum, s) => sum + s.duration, 0);
  };

  return (
    <div className="timetable-page">
      <div className="timetable-header">
        <h1>
          <Calendar size={28} />
          Timetable
        </h1>

        <div className="timetable-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-dropdown">
            <button className="btn btn-secondary">
              <Filter size={18} />
              {filterCategory ? categories.find(c => c.id === filterCategory)?.name : 'All Categories'}
            </button>
            <div className="filter-menu">
              <button onClick={() => setFilterCategory(null)}>
                All Categories
                {!filterCategory && <Check size={16} />}
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setFilterCategory(cat.id)}>
                  <span className="category-dot" style={{ background: cat.color }} />
                  {cat.name}
                  {filterCategory === cat.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="view-toggle">
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button 
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {selectedSessions.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedSessions.size} selected</span>
          <button className="btn btn-ghost btn-sm" onClick={selectAllVisible}>
            Select All
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>
            Clear
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="sessions-list">
          {sortedDates.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>No sessions yet</p>
              <span>Start tracking your time to see it here</span>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <h3>{formatDateHeader(date)}</h3>
                  <span className="date-total">{formatDuration(getDayTotal(date))}</span>
                </div>
                
                <div className="sessions-for-date">
                  {sessionsByDate[date].map(session => (
                    <div 
                      key={session.id} 
                      className={`session-card ${selectedSessions.has(session.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.id)}
                        onChange={() => toggleSessionSelection(session.id)}
                        className="session-checkbox"
                      />
                      
                      <div 
                        className="session-category-bar"
                        style={{ background: session.category_color || 'var(--text-tertiary)' }}
                      />
                      
                      <div className="session-content">
                        <div className="session-main">
                          <h4>{session.title}</h4>
                          {session.category_name && (
                            <span className="session-category">
                              <Folder size={12} />
                              {session.category_name}
                            </span>
                          )}
                        </div>
                        {session.notes && (
                          <p className="session-notes">{session.notes}</p>
                        )}
                      </div>

                      <div className="session-duration">
                        {formatDuration(session.duration)}
                      </div>

                      <div className="session-actions">
                        <button 
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setEditingSession(session)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="calendar-view">
          <div className="calendar-header">
            <button 
              className="btn btn-ghost btn-icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            >
              <ChevronLeft size={20} />
            </button>
            <h2>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              className="btn btn-ghost btn-icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            
            <div className="calendar-days">
              {calendarData.map(({ date, isCurrentMonth }, idx) => {
                const dateStr = date.toISOString().slice(0, 10);
                const daySessions = sessionsByDate[dateStr] || [];
                const dayTotal = daySessions.reduce((sum, s) => sum + s.duration, 0);
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                
                return (
                  <div 
                    key={idx}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${daySessions.length > 0 ? 'has-sessions' : ''}`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    {dayTotal > 0 && (
                      <span className="day-total">{formatDuration(dayTotal)}</span>
                    )}
                    {daySessions.length > 0 && (
                      <div className="day-dots">
                        {daySessions.slice(0, 3).map((s, i) => (
                          <span 
                            key={i} 
                            className="day-dot"
                            style={{ background: s.category_color || 'var(--accent-primary)' }}
                          />
                        ))}
                        {daySessions.length > 3 && (
                          <span className="day-dot more">+{daySessions.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Edit Session</h2>
            
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editingSession.title}
                onChange={(e) => setEditingSession({...editingSession, title: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={editingSession.notes || ''}
                onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={editingSession.date}
                onChange={(e) => setEditingSession({...editingSession, date: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Duration</label>
              <input
                type="number"
                value={Math.floor(editingSession.duration / 60)}
                onChange={(e) => setEditingSession({...editingSession, duration: parseInt(e.target.value) * 60})}
                min="0"
              />
              <span className="input-hint">minutes</span>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingSession(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  await updateSession(editingSession.id, {
                    title: editingSession.title,
                    notes: editingSession.notes,
                    date: editingSession.date,
                    duration: editingSession.duration
                  });
                  setEditingSession(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
