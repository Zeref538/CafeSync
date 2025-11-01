import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  Inventory,
  Refresh,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import SalesChart from '../../components/Charts/SalesChart';
import { API_ENDPOINTS } from '../../config/api';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    averageDeliveryTime: 0,
    inventoryAlerts: 0,
    completionRate: 0,
    averageOrderTime: 0,
    orderTimePerItem: 0, // New field for average prep time per item
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch menu items to calculate average preparation time
  const fetchMenuItems = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MENU);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const menuItems = result.data;
          // Filter only available items and calculate average preparation time
          const availableItems = menuItems.filter((item: any) => item.isAvailable !== false);
          
          if (availableItems.length > 0) {
            const prepTimes = availableItems
              .map((item: any) => {
                // Handle different formats of preparation time
                if (typeof item.preparationTime === 'number') {
                  return item.preparationTime;
                }
                // If sizes exist, use the first size's prep time or default
                if (item.sizes && item.sizes.length > 0 && item.sizes[0].preparationTime) {
                  return item.sizes[0].preparationTime;
                }
                return 0; // Default if no prep time specified
              })
              .filter((time: number) => time > 0); // Only count items with valid prep times
            
            if (prepTimes.length > 0) {
              const averagePrepTime = prepTimes.reduce((sum: number, time: number) => sum + time, 0) / prepTimes.length;
              setStats(prev => ({ ...prev, orderTimePerItem: Math.round(averagePrepTime * 10) / 10 })); // Round to 1 decimal
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching menu items for prep time:', error);
    }
  };

  // Fetch real data from API
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(API_ENDPOINTS.ANALYTICS_DASHBOARD);
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, ...data, orderTimePerItem: prev.orderTimePerItem })); // Preserve orderTimePerItem
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep stats at 0 if API fails
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchMenuItems(); // Fetch menu items on mount
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, icon, color, trend }) => {
    const theme = useTheme();
    return (
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(30, 30, 30, 0.8) 100%)`
            : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255, 255, 255, 0.9) 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '40%',
            background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(20%, -20%)',
          },
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                color="textSecondary" 
                gutterBottom 
                variant="body2"
                sx={{ 
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: '0.75rem',
                  mb: 1,
                }}
              >
              {title}
            </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color,
                  mb: trend ? 1 : 0,
                  background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                    : `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
              {value}
            </Typography>
            {trend && trend > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TrendingUp sx={{ fontSize: 18, color: 'success.main', mr: 0.5 }} />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  +{trend}% from yesterday
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
                borderRadius: 3,
                p: 2,
              color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 56,
                minHeight: 56,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1) rotate(5deg)',
                  backgroundColor: `${color}30`,
                },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            mb: 3,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(107, 68, 35, 0.15) 0%, rgba(139, 69, 19, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(107, 68, 35, 0.08) 0%, rgba(139, 69, 19, 0.12) 100%)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(107, 68, 35, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '40%',
              height: '100%',
              background: theme.palette.mode === 'dark'
                ? 'radial-gradient(circle, rgba(107, 68, 35, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(107, 68, 35, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            },
          }}
        >
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)'
                      : 'linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Welcome back, {user?.name}! 👋
            </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 400 }}>
              Here's what's happening at your coffee shop today
            </Typography>
          </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {stats.inventoryAlerts > 0 && (
              <Chip
                icon={<Notifications />}
                label={`${stats.inventoryAlerts} alerts`}
                color="warning"
                variant="outlined"
                    sx={{
                      fontWeight: 600,
                      borderWidth: 2,
                      animation: stats.inventoryAlerts > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          opacity: 1,
                        },
                        '50%': {
                          opacity: 0.7,
                        },
                      },
                    }}
              />
            )}
            <IconButton 
              color="primary" 
              onClick={fetchDashboardData}
              disabled={isRefreshing}
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(107, 68, 35, 0.2)' 
                      : 'rgba(107, 68, 35, 0.08)',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(107, 68, 35, 0.3)' 
                        : 'rgba(107, 68, 35, 0.15)',
                      transform: 'rotate(180deg)',
                    },
                    transition: 'all 0.3s ease',
                  }}
            >
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, pt: 2, borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
          <Box
            sx={{
                  width: 10,
                  height: 10,
              borderRadius: '50%',
              backgroundColor: isConnected ? 'success.main' : 'error.main',
                  boxShadow: isConnected 
                    ? '0 0 8px rgba(76, 175, 80, 0.6)' 
                    : '0 0 8px rgba(244, 67, 54, 0.6)',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 1,
                      transform: 'scale(1)',
                    },
                    '50%': {
                      opacity: 0.7,
                      transform: 'scale(1.2)',
                    },
                  },
            }}
          />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {isConnected ? 'Connected to CafeSync server' : 'Disconnected from server'}
          </Typography>
        </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={`₱${stats.todaySales.toFixed(2)}`}
            icon={<TrendingUp />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Orders Today"
            value={stats.todayOrders}
            icon={<Receipt />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inventory Alerts"
            value={stats.inventoryAlerts}
            icon={<Inventory />}
            color="#f44336"
          />
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Order Completion Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mr: 2 }}>
                  {stats.completionRate}%
                </Typography>
                <Chip 
                  label={stats.completionRate >= 90 ? "Excellent" : stats.completionRate >= 70 ? "Good" : "Needs Improvement"} 
                  color={stats.completionRate >= 90 ? "success" : stats.completionRate >= 70 ? "primary" : "warning"} 
                  size="small" 
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                sx={{ 
                  height: 12, 
                  borderRadius: 6, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    background: stats.completionRate >= 90
                      ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'
                      : stats.completionRate >= 70
                      ? 'linear-gradient(90deg, #2196f3 0%, #42a5f5 100%)'
                      : 'linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)',
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Target: 90%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Order Time Per Item
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mr: 2 }}>
                  {stats.orderTimePerItem > 0 ? `${stats.orderTimePerItem}m` : 'N/A'}
                </Typography>
                {stats.orderTimePerItem > 0 && (
                <Chip 
                    label={stats.orderTimePerItem <= 3 ? "Excellent" : stats.orderTimePerItem <= 5 ? "Good" : "Needs Improvement"} 
                    color={stats.orderTimePerItem <= 3 ? "success" : stats.orderTimePerItem <= 5 ? "primary" : "warning"} 
                  size="small" 
                />
                )}
              </Box>
              {stats.orderTimePerItem > 0 && (
                <>
              <LinearProgress
                variant="determinate"
                    value={Math.min((stats.orderTimePerItem / 10) * 100, 100)}
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: stats.orderTimePerItem <= 3
                          ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'
                          : stats.orderTimePerItem <= 5
                          ? 'linear-gradient(90deg, #2196f3 0%, #42a5f5 100%)'
                          : 'linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)',
                      },
                    }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Average prep time across all menu items
                  </Typography>
                </>
              )}
              {stats.orderTimePerItem === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No menu items with prep time data available
              </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Sales Overview (Today)
              </Typography>
              <SalesChart period="today" />
            </CardContent>
          </Card>
        </Grid>

        {/* Weather Widget */}
        <Grid item xs={12} lg={4}>
          <WeatherWidget />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
