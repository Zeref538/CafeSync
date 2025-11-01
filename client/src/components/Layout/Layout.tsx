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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  Storefront as FrontCounterIcon,
  Restaurant as KitchenIcon,
  Business as ManagementIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import NavigationItem from './NavigationItem';
import UserMenu from './UserMenu';
import DarkModeToggle from './DarkModeToggle';
import CafeSyncLogo from './CafeSyncLogo';
import NotificationHistoryButton from './NotificationHistoryButton';

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
        text: 'Order Station',
        icon: <KitchenIcon />,
        path: '/station/orders',
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
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(107, 68, 35, 0.15) 0%, rgba(139, 69, 19, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(107, 68, 35, 0.08) 0%, rgba(139, 69, 19, 0.12) 100%)',
          borderBottom: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.08)' 
            : '1px solid rgba(107, 68, 35, 0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, transparent 0%, rgba(139, 69, 19, 0.5) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(107, 68, 35, 0.3) 50%, transparent 100%)',
          },
        }}
      >
        <CafeSyncLogo variant="full" size="medium" />
        <Box
          sx={{
            mt: 2,
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
          <Typography 
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.7rem',
            }}
          >
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
      <Box sx={{ 
        p: 2, 
        borderTop: theme.palette.mode === 'dark' 
          ? '1px solid rgba(255,255,255,0.12)' 
          : '1px solid #e0e0e0' 
      }}>
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
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white',
          color: 'text.primary',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 2px 4px rgba(255,255,255,0.1)' 
            : '0 2px 4px rgba(0,0,0,0.1)',
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
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CafeSyncLogo variant="icon-only" size="small" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {navigationItems.find(item => item.path === location.pathname)?.text || 'CafeSync'}
          </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationHistoryButton />
          <DarkModeToggle />
          </Box>
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
              borderRight: theme.palette.mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.12)' 
                : '1px solid #e0e0e0',
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
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
