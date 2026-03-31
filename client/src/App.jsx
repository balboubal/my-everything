import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { DataProvider } from './context/DataContext';
import { GoalsProvider } from './context/GoalsContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import TimerPage from './pages/TimerPage';
import TimetablePage from './pages/TimetablePage';
import AnalyticsPage from './pages/AnalyticsPage';
import MyEverythingPage from './pages/MyEverythingPage';
import GoalsPage from './pages/GoalsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="animate-spin" style={{ 
          width: 40, 
          height: 40, 
          border: '3px solid var(--bg-tertiary)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div className="animate-spin" style={{ 
          width: 40, 
          height: 40, 
          border: '3px solid var(--bg-tertiary)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={
        isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <DataProvider>
            <TimerProvider>
              <GoalsProvider>
                <Layout />
              </GoalsProvider>
            </TimerProvider>
          </DataProvider>
        </ProtectedRoute>
      }>
        <Route index element={<TimerPage />} />
        <Route path="my-everything" element={<MyEverythingPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
