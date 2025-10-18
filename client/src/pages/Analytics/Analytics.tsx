import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  People,
  AttachMoney,
} from '@mui/icons-material';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';

const Analytics: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const analyticsData = {
    totalSales: 1247.50,
    totalOrders: 89,
    averageOrderValue: 14.02,
    topSellingItems: [
      { name: 'Latte', sales: 45, revenue: 202.50 },
      { name: 'Cappuccino', sales: 32, revenue: 136.00 },
      { name: 'Americano', sales: 28, revenue: 98.00 },
    ],
    hourlySales: [
      { hour: '6AM', sales: 120 },
      { hour: '8AM', sales: 280 },
      { hour: '10AM', sales: 450 },
      { hour: '12PM', sales: 680 },
      { hour: '2PM', sales: 520 },
      { hour: '4PM', sales: 380 },
      { hour: '6PM', sales: 220 },
    ],
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
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                +{trend}% from yesterday
              </Typography>
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
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Analytics Dashboard
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Sales"
            value={`₱${analyticsData.totalSales.toFixed(2)}`}
            icon={<AttachMoney />}
            color="#4caf50"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={analyticsData.totalOrders}
            icon={<Receipt />}
            color="#2196f3"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Order Value"
            value={`₱${analyticsData.averageOrderValue.toFixed(2)}`}
            icon={<TrendingUp />}
            color="#ff9800"
            trend={5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value={156}
            icon={<People />}
            color="#9c27b0"
            trend={15}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
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

        {/* Top Selling Items */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Top Selling Items
              </Typography>
              {analyticsData.topSellingItems.map((item, index) => (
                <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mr: 2, minWidth: 24 }}>
                    {index + 1}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.sales} sales • ₱{item.revenue.toFixed(2)} revenue
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Performance Metrics
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Order Completion Rate
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                    <Box sx={{ width: '94%', height: '100%', backgroundColor: '#4caf50', borderRadius: 4 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    94%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Average Prep Time
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                    <Box sx={{ width: '64%', height: '100%', backgroundColor: '#2196f3', borderRadius: 4 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    3.2min
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Customer Satisfaction
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                    <Box sx={{ width: '96%', height: '100%', backgroundColor: '#ff9800', borderRadius: 4 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    4.8/5
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
