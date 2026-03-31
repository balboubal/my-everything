import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      // Check if guest mode
      const guestMode = localStorage.getItem('guestMode');
      if (guestMode === 'true') {
        setIsGuest(true);
      }
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.removeItem('guestMode');
    setToken(data.token);
    setUser(data.user);
    setIsGuest(false);

    return data;
  };

  const register = async (email, password, name) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.removeItem('guestMode');
    setToken(data.token);
    setUser(data.user);
    setIsGuest(false);

    return data;
  };

  const continueAsGuest = () => {
    localStorage.setItem('guestMode', 'true');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsGuest(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guestMode');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const updatePreferences = async (preferences) => {
    if (isGuest) {
      // Save to localStorage for guests
      localStorage.setItem('preferences', JSON.stringify(preferences));
      return;
    }

    await fetch(`${API_URL}/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ preferences })
    });
  };

  const value = {
    user,
    token,
    loading,
    isGuest,
    isAuthenticated: !!token || isGuest,
    login,
    register,
    logout,
    continueAsGuest,
    updatePreferences
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
