import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <Clock size={48} />
          </div>
          <h1>Chronos</h1>
          <p>Track your time, master your productivity</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div className="form-group">
                <label>Name</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="btn btn-secondary btn-lg auth-guest" onClick={continueAsGuest}>
            Continue as Guest
          </button>
          <p className="auth-guest-note">
            Guest data is stored locally and can be exported/imported
          </p>
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="feature-icon">⏱️</span>
            <span>Flexible Timer</span>
          </div>
          <div className="auth-feature">
            <span className="feature-icon">📊</span>
            <span>Analytics</span>
          </div>
          <div className="auth-feature">
            <span className="feature-icon">📁</span>
            <span>Categories</span>
          </div>
          <div className="auth-feature">
            <span className="feature-icon">☁️</span>
            <span>Cloud Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
