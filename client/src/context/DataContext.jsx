import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const GUEST_CATEGORIES_KEY = 'me_guest_categories';
const GUEST_SESSIONS_KEY = 'me_guest_sessions';

export function DataProvider({ children }) {
  const { token, isGuest } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data on auth change
  useEffect(() => {
    if (token) {
      loadServerData();
    } else if (isGuest) {
      loadGuestData();
    } else {
      setCategories([]);
      setSessions([]);
      setLoading(false);
    }
  }, [token, isGuest]);

  const loadServerData = async () => {
    setLoading(true);
    try {
      const [catRes, sessRes] = await Promise.all([
        fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const catData = await catRes.json();
      const sessData = await sessRes.json();
      
      setCategories(catData.categories || []);
      setSessions(sessData.sessions || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuestData = () => {
    try {
      const savedCats = localStorage.getItem(GUEST_CATEGORIES_KEY);
      const savedSess = localStorage.getItem(GUEST_SESSIONS_KEY);
      
      if (savedCats) {
        setCategories(JSON.parse(savedCats));
      } else {
        // Default categories for guests
        const defaults = [
          { id: 'cat-1', name: 'Work', color: '#3b82f6', icon: 'briefcase', parent_id: null, total_time: 0, session_count: 0 },
          { id: 'cat-2', name: 'Study', color: '#8b5cf6', icon: 'book', parent_id: null, total_time: 0, session_count: 0 },
          { id: 'cat-3', name: 'Personal', color: '#10b981', icon: 'user', parent_id: null, total_time: 0, session_count: 0 }
        ];
        setCategories(defaults);
        localStorage.setItem(GUEST_CATEGORIES_KEY, JSON.stringify(defaults));
      }
      
      if (savedSess) {
        setSessions(JSON.parse(savedSess));
      }
    } catch (error) {
      console.error('Failed to load guest data:', error);
    }
    setLoading(false);
  };

  const saveGuestCategories = (cats) => {
    localStorage.setItem(GUEST_CATEGORIES_KEY, JSON.stringify(cats));
  };

  const saveGuestSessions = (sess) => {
    localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sess));
  };

  // Category operations
  const createCategory = async ({ name, color, icon, parentId }) => {
    // Generate random color if not provided
    const PRESET_COLORS = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#ef4444', '#f97316',
      '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6'
    ];
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const finalColor = color || randomColor;

    if (isGuest) {
      const newCat = {
        id: `cat-${Date.now()}`,
        name,
        color: finalColor,
        icon: icon || 'folder',
        parent_id: parentId || null,
        total_time: 0,
        session_count: 0
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      saveGuestCategories(updated);
      return newCat;
    }

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, color: finalColor, icon, parentId })
    });
    const data = await res.json();
    if (data.category) {
      setCategories(prev => [...prev, { ...data.category, total_time: 0, session_count: 0 }]);
    }
    return data.category;
  };

  const updateCategory = async (id, updates) => {
    if (isGuest) {
      const updated = categories.map(c => c.id === id ? { ...c, ...updates } : c);
      setCategories(updated);
      saveGuestCategories(updated);
      return;
    }

    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.category) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data.category } : c));
    }
  };

  const deleteCategory = async (id) => {
    if (isGuest) {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      saveGuestCategories(updated);
      // Update sessions that had this category
      const updatedSessions = sessions.map(s => 
        s.category_id === id ? { ...s, category_id: null, category_name: null, category_color: null } : s
      );
      setSessions(updatedSessions);
      saveGuestSessions(updatedSessions);
      return;
    }

    await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setCategories(prev => prev.filter(c => c.id !== id));
    setSessions(prev => prev.map(s => 
      s.category_id === id ? { ...s, category_id: null, category_name: null, category_color: null } : s
    ));
  };

  // Session operations
  const createSession = async (sessionData) => {
    if (isGuest) {
      const category = categories.find(c => c.id === sessionData.categoryId);
      const newSession = {
        id: `sess-${Date.now()}`,
        ...sessionData,
        category_id: sessionData.categoryId,
        category_name: category?.name || null,
        category_color: category?.color || null,
        created_at: new Date().toISOString()
      };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      saveGuestSessions(updated);
      
      // Update category stats
      if (category) {
        const updatedCats = categories.map(c => 
          c.id === category.id 
            ? { ...c, total_time: (c.total_time || 0) + sessionData.duration, session_count: (c.session_count || 0) + 1 }
            : c
        );
        setCategories(updatedCats);
        saveGuestCategories(updatedCats);
      }
      
      return newSession;
    }

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(sessionData)
    });
    const data = await res.json();
    if (data.session) {
      setSessions(prev => [data.session, ...prev]);
      // Refresh categories to get updated stats
      loadServerData();
    }
    return data.session;
  };

  const updateSession = async (id, updates) => {
    if (isGuest) {
      const updated = sessions.map(s => s.id === id ? { ...s, ...updates } : s);
      setSessions(updated);
      saveGuestSessions(updated);
      return;
    }

    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.session) {
      setSessions(prev => prev.map(s => s.id === id ? data.session : s));
    }
  };

  const deleteSession = async (id) => {
    if (isGuest) {
      const session = sessions.find(s => s.id === id);
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      saveGuestSessions(updated);
      
      // Update category stats
      if (session?.category_id) {
        const updatedCats = categories.map(c => 
          c.id === session.category_id 
            ? { ...c, total_time: Math.max(0, (c.total_time || 0) - session.duration), session_count: Math.max(0, (c.session_count || 0) - 1) }
            : c
        );
        setCategories(updatedCats);
        saveGuestCategories(updatedCats);
      }
      return;
    }

    await fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setSessions(prev => prev.filter(s => s.id !== id));
    loadServerData(); // Refresh to update category stats
  };

  const bulkDeleteSessions = async (ids) => {
    if (isGuest) {
      const toDelete = new Set(ids);
      const deleted = sessions.filter(s => toDelete.has(s.id));
      const updated = sessions.filter(s => !toDelete.has(s.id));
      setSessions(updated);
      saveGuestSessions(updated);
      
      // Update category stats
      const statUpdates = {};
      deleted.forEach(s => {
        if (s.category_id) {
          if (!statUpdates[s.category_id]) {
            statUpdates[s.category_id] = { time: 0, count: 0 };
          }
          statUpdates[s.category_id].time += s.duration;
          statUpdates[s.category_id].count += 1;
        }
      });
      
      const updatedCats = categories.map(c => {
        if (statUpdates[c.id]) {
          return {
            ...c,
            total_time: Math.max(0, (c.total_time || 0) - statUpdates[c.id].time),
            session_count: Math.max(0, (c.session_count || 0) - statUpdates[c.id].count)
          };
        }
        return c;
      });
      setCategories(updatedCats);
      saveGuestCategories(updatedCats);
      return;
    }

    await fetch('/api/sessions/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ids })
    });
    setSessions(prev => prev.filter(s => !ids.includes(s.id)));
    loadServerData();
  };

  // Export/Import
  const exportData = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories,
      sessions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `me_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Calculate category stats from sessions
          const calculateCategoryStats = (cats, sessions) => {
            const stats = {};
            cats.forEach(c => {
              stats[c.id] = { total_time: 0, session_count: 0 };
            });
            
            sessions.forEach(s => {
              if (s.category_id && stats[s.category_id]) {
                stats[s.category_id].total_time += s.duration || 0;
                stats[s.category_id].session_count += 1;
              }
            });
            
            return cats.map(c => ({
              ...c,
              total_time: stats[c.id]?.total_time || 0,
              session_count: stats[c.id]?.session_count || 0
            }));
          };
          
          if (isGuest) {
            let importedCategories = data.categories || [];
            let importedSessions = data.sessions || [];
            
            // Recalculate stats
            if (importedCategories.length > 0 && importedSessions.length > 0) {
              importedCategories = calculateCategoryStats(importedCategories, importedSessions);
            }
            
            if (importedCategories.length > 0) {
              setCategories(importedCategories);
              saveGuestCategories(importedCategories);
            }
            if (importedSessions.length > 0) {
              setSessions(importedSessions);
              saveGuestSessions(importedSessions);
            }
          } else {
            await fetch('/api/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(data)
            });
            await loadServerData();
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Clear all data
  const clearAllData = async () => {
    if (isGuest) {
      localStorage.removeItem('me_guest_sessions');
      localStorage.removeItem('me_guest_categories');
      setCategories([]);
      setSessions([]);
    } else {
      // For authenticated users, call API
      await fetch('/api/data/clear', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCategories([]);
      setSessions([]);
    }
  };

  // Helpers
  const getCategoryTree = useCallback(() => {
    const rootCategories = categories.filter(c => !c.parent_id);
    const getChildren = (parentId) => {
      return categories.filter(c => c.parent_id === parentId).map(child => ({
        ...child,
        children: getChildren(child.id)
      }));
    };
    
    return rootCategories.map(cat => ({
      ...cat,
      children: getChildren(cat.id)
    }));
  }, [categories]);

  const getSessionsByDate = useCallback((date) => {
    return sessions.filter(s => s.date === date);
  }, [sessions]);

  const getSessionsByCategory = useCallback((categoryId) => {
    return sessions.filter(s => s.category_id === categoryId);
  }, [sessions]);

  const value = {
    categories,
    sessions,
    loading,
    
    // Category operations
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryTree,
    
    // Session operations
    createSession,
    updateSession,
    deleteSession,
    bulkDeleteSessions,
    getSessionsByDate,
    getSessionsByCategory,
    
    // Data operations
    exportData,
    importData,
    clearAllData,
    refresh: token ? loadServerData : loadGuestData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
