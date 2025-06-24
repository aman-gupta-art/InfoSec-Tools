import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import ServerInventory from './pages/ServerInventory.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import AuditLogs from './pages/AuditLogs.tsx';
import Trackers from './pages/Trackers.tsx';
import Layout from './components/Layout.tsx';
import PrivateRoute from './components/PrivateRoute.tsx';
import AdminRoute from './components/AdminRoute.tsx';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/servers" element={<ServerInventory />} />
              <Route path="/trackers" element={<Trackers />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App; 