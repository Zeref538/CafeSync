import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';

// Layout components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Page components
import Dashboard from './pages/Dashboard/Dashboard';
import Inventory from './pages/Inventory/Inventory';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';

// Additional pages
import Orders from './pages/Orders/Orders';
import Loyalty from './pages/Loyalty/Loyalty';

// Station-specific pages
import FrontCounter from './pages/Stations/FrontCounter';
import KitchenOrders from './pages/Stations/Kitchen';
import Management from './pages/Stations/Management';

function App() {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      touchAction: 'manipulation'
    }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
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
          <Route path="inventory" element={<Inventory />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="orders" element={<Orders />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Station-specific interfaces */}
          <Route path="station/front-counter" element={<FrontCounter />} />
          <Route path="station/orders" element={<KitchenOrders />} />
          <Route path="station/kitchen" element={<KitchenOrders />} />
          <Route path="station/management" element={<Management />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Box>
  );
}

export default App;
