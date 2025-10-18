import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Storefront as FrontCounterIcon,
  Restaurant as KitchenIcon,
  Business as ManagementIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import NavigationItem from './NavigationItem';
import UserMenu from './UserMenu';

const drawerWidth = 280;

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { isConnected } = useSocket();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Navigation items based on user role and permissions
  const getNavigationItems = () => {
    const baseItems = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        permission: 'dashboard',
        badge: undefined,
        color: undefined,
      },
    ];

    const roleBasedItems = [
      {
        text: 'Orders',
        icon: <OrdersIcon />,
        path: '/orders',
        permission: 'orders',
        badge: 3, // Mock notification count
        color: undefined,
      },
      {
        text: 'Inventory',
        icon: <InventoryIcon />,
        path: '/inventory',
        permission: 'inventory',
        badge: undefined,
        color: undefined,
      },
      {
        text: 'Analytics',
        icon: <AnalyticsIcon />,
        path: '/analytics',
        permission: 'analytics',
        badge: undefined,
        color: undefined,
      },
      {
        text: 'Settings',
        icon: <SettingsIcon />,
        path: '/settings',
        permission: 'settings',
        badge: undefined,
        color: undefined,
      },
    ];

    // Station-specific items
    const stationItems = [
      {
        text: 'Front Counter',
        icon: <FrontCounterIcon />,
        path: '/station/front-counter',
        permission: 'orders',
        color: '#4caf50',
        badge: undefined,
      },
      {
        text: 'Kitchen',
        icon: <KitchenIcon />,
        path: '/station/kitchen',
        permission: 'orders',
        color: '#ff9800',
        badge: undefined,
      },
      {
        text: 'Management',
        icon: <ManagementIcon />,
        path: '/station/management',
        permission: 'all',
        color: '#2196f3',
        badge: undefined,
      },
    ];

    // Filter items based on user permissions
    const hasPermission = (permission: string) => {
      if (!user) return false;
      return user.permissions.includes('all') || user.permissions.includes(permission);
    };

    const filteredRoleItems = roleBasedItems.filter(item => hasPermission(item.permission));
    const filteredStationItems = stationItems.filter(item => hasPermission(item.permission));

    return [
      ...baseItems,
      ...filteredRoleItems,
      ...filteredStationItems,
    ];
  };

  const navigationItems = getNavigationItems();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Header */}
      <Box
        sx={{
          p: 3,
          backgroundColor: '#8B4513',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          CafeSync
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Smart Coffee Management
        </Typography>
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4caf50' : '#f44336',
            }}
          />
          <Typography variant="caption">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ pt: 2 }}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.path}
              text={item.text}
              icon={item.icon}
              path={item.path}
              badge={item.badge}
              color={item.color}
              isActive={location.pathname === item.path}
            />
          ))}
        </List>
      </Box>

      {/* User Menu */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <UserMenu />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {navigationItems.find(item => item.path === location.pathname)?.text || 'CafeSync'}
          </Typography>

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={5} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e0e0e0',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Account for AppBar height
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
