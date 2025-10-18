import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  Inventory,
  People,
  Coffee,
  Refresh,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import SalesChart from '../../components/Charts/SalesChart';
import QuickActions from '../../components/Dashboard/QuickActions';
import RecentOrders from '../../components/Dashboard/RecentOrders';
import InventoryAlerts from '../../components/Dashboard/InventoryAlerts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket();

  // Mock data - in production, this would come from API
  const stats = {
    todaySales: 1247.50,
    todayOrders: 89,
    activeCustomers: 156,
    inventoryAlerts: 3,
    completionRate: 94,
    averageOrderTime: 3.2,
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" color="success.main">
                  +{trend}% from yesterday
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: 1.5,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome back, {user?.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's what's happening at your coffee shop today
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<Notifications />}
              label={`${stats.inventoryAlerts} alerts`}
              color="warning"
              variant="outlined"
            />
            <IconButton color="primary">
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? 'success.main' : 'error.main',
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {isConnected ? 'Connected to CafeSync server' : 'Disconnected from server'}
          </Typography>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={`₱${stats.todaySales.toFixed(2)}`}
            icon={<TrendingUp />}
            color="#4caf50"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Orders Today"
            value={stats.todayOrders}
            icon={<Receipt />}
            color="#2196f3"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value={stats.activeCustomers}
            icon={<People />}
            color="#ff9800"
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
                <Chip label="Excellent" color="success" size="small" />
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                sx={{ height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Target: 90% • Above target by 4%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Average Order Time
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mr: 2 }}>
                  {stats.averageOrderTime}m
                </Typography>
                <Chip label="Good" color="primary" size="small" />
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.averageOrderTime / 5) * 100}
                sx={{ height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Target: 5m • 36% faster than target
              </Typography>
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
                Sales Overview
              </Typography>
              <SalesChart />
            </CardContent>
          </Card>
        </Grid>

        {/* Weather Widget */}
        <Grid item xs={12} lg={4}>
          <WeatherWidget />
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <QuickActions />
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12} md={6}>
          <RecentOrders />
        </Grid>

        {/* Inventory Alerts */}
        <Grid item xs={12}>
          <InventoryAlerts />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
