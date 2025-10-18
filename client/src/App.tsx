import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Layout components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Page components
import Dashboard from './pages/Dashboard/Dashboard';
import Orders from './pages/Orders/Orders';
import Inventory from './pages/Inventory/Inventory';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import Login from './pages/Auth/Login';

// Station-specific pages
import FrontCounter from './pages/Stations/FrontCounter';
import Kitchen from './pages/Stations/Kitchen';
import Management from './pages/Stations/Management';

function App() {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      touchAction: 'manipulation'
    }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes with layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Main dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Core functionality */}
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Station-specific interfaces */}
          <Route path="station/front-counter" element={<FrontCounter />} />
          <Route path="station/kitchen" element={<Kitchen />} />
          <Route path="station/management" element={<Management />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  );
}

export default App;
