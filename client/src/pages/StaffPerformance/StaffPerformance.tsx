import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  AttachMoney,
  Person,
  Schedule,
  Cancel,
  CheckCircle,
  Search,
  Refresh,
  Assignment,
  Store,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { API_ENDPOINTS } from '../../config/api';
import { useTheme } from '@mui/material/styles';

interface StaffPerformance {
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSales: number;
  averageOrderValue: number;
  totalItems: number;
  completionRate: number;
  cancellationRate: number;
  ordersPerHour: number;
  stationsArray: Array<{
    station: string;
    orders: number;
    sales: number;
    averageOrderValue: number;
  }>;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
}

interface AuditRecord {
  orderId: string;
  orderNumber: number;
  staffId: string;
  staffName: string;
  staffEmail?: string;
  station: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  customer: string;
  paymentMethod: string;
  createdAt: string;
  completedAt: string | null;
}

const StaffPerformancePage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffPerformance | null>(null);

  useEffect(() => {
    fetchStaffPerformance();
  }, [selectedPeriod]);

  const fetchStaffPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_STAFF}?period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStaffPerformance(result.data.staffPerformance || []);
        setAuditTrail(result.data.auditTrail || []);
      } else {
        throw new Error(result.error || 'Failed to fetch staff performance');
      }
    } catch (err) {
      console.error('Error fetching staff performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff performance');
    } finally {
      setLoading(false);
    }
  };

  // Function to seed sample orders (1 month)
  const seedSampleOrders = async () => {
    if (!window.confirm('Generate sample data for 1 month? This will create realistic order data for testing.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_DASHBOARD.replace('/dashboard', '/seed-orders')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully created ${result.ordersCreated} sample orders for 1 month! Refreshing...`);
        // Refresh staff performance data after seeding
        setTimeout(() => {
          fetchStaffPerformance();
        }, 1000);
      } else {
        alert(`Error: ${result.error || 'Failed to seed orders'}`);
      }
    } catch (error) {
      console.error('Error seeding orders:', error);
      alert('Failed to seed sample orders');
    }
  };

  // Function to delete sample orders
  const deleteSampleOrders = async () => {
    if (!window.confirm('Delete all sample data? This will permanently delete all orders marked as sample data.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_DASHBOARD.replace('/dashboard', '/seed-orders')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully deleted ${result.ordersDeleted} sample orders! Refreshing...`);
        // Refresh staff performance data after deletion
        setTimeout(() => {
          fetchStaffPerformance();
        }, 1000);
      } else {
        alert(`Error: ${result.error || 'Failed to delete sample orders'}`);
      }
    } catch (error) {
      console.error('Error deleting sample orders:', error);
      alert('Failed to delete sample orders');
    }
  };

  const filteredStaff = staffPerformance.filter(staff =>
    staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staffEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAudit = auditTrail.filter(audit =>
    audit.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.orderNumber.toString().includes(searchTerm) ||
    audit.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = filteredStaff.slice(0, 10).map(staff => ({
    name: staff.staffName.length > 15 ? staff.staffName.substring(0, 15) + '...' : staff.staffName,
    orders: staff.totalOrders,
    sales: staff.totalSales,
    avgOrder: staff.averageOrderValue,
  }));

  const statusColors = {
    completed: '#4caf50',
    pending: '#ff9800',
    preparing: '#2196f3',
    ready: '#9c27b0',
    cancelled: '#f44336',
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || '#757575';
  };

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Staff Performance & Audit
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={seedSampleOrders}
            sx={{ textTransform: 'none' }}
          >
            Generate Sample Data (1 Month)
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={deleteSampleOrders}
            sx={{ textTransform: 'none' }}
          >
            Delete Sample Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchStaffPerformance}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Period Selector */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
        {(['today', 'week', 'month'] as const).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'contained' : 'outlined'}
            onClick={() => setSelectedPeriod(period)}
            sx={{ textTransform: 'capitalize' }}
          >
            {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#4caf50' }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {staffPerformance.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Staff
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#2196f3' }}>
                  <Receipt />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {staffPerformance.reduce((sum, s) => sum + s.totalOrders, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    ₱{staffPerformance.reduce((sum, s) => sum + s.totalSales, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sales
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#9c27b0' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {staffPerformance.length > 0
                      ? Math.round(
                          staffPerformance.reduce((sum, s) => sum + s.averageOrderValue, 0) /
                            staffPerformance.length
                        )
                      : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Order Value
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Performance Overview" />
          <Tab label="Staff Details" />
          <Tab label="Audit Trail" />
        </Tabs>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search staff or orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {/* Performance Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Top Staff by Sales
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill="#4caf50" name="Total Sales (₱)" />
                    <Bar dataKey="orders" fill="#2196f3" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Completion Rate Chart */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Top 5 by Orders
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={filteredStaff.slice(0, 5).map(s => ({
                        name: s.staffName.length > 15 ? s.staffName.substring(0, 15) + '...' : s.staffName,
                        value: s.totalOrders,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {filteredStaff.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Staff</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Completed</TableCell>
                <TableCell align="right">Sales (₱)</TableCell>
                <TableCell align="right">Avg Order</TableCell>
                <TableCell align="right">Completion Rate</TableCell>
                <TableCell align="right">Orders/Hr</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow
                  key={staff.staffId}
                  hover
                  onClick={() => setSelectedStaff(staff)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {staff.staffName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.staffEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={staff.staffRole} size="small" />
                  </TableCell>
                  <TableCell align="right">{staff.totalOrders}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                      {staff.completedOrders}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    ₱{staff.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right">
                    ₱{staff.averageOrderValue.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${staff.completionRate}%`}
                      size="small"
                      color={staff.completionRate >= 90 ? 'success' : staff.completionRate >= 70 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="right">{staff.ordersPerHour.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {selectedTab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date/Time</TableCell>
                <TableCell>Staff</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Station</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount (₱)</TableCell>
                <TableCell>Payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAudit.map((audit) => (
                <TableRow key={audit.orderId} hover>
                  <TableCell>
                    {new Date(audit.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{audit.staffName}</TableCell>
                  <TableCell>#{audit.orderNumber}</TableCell>
                  <TableCell>
                    <Chip label={audit.station} size="small" />
                  </TableCell>
                  <TableCell>{audit.customer}</TableCell>
                  <TableCell>
                    <Chip
                      label={audit.status}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(audit.status),
                        color: 'white',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₱{audit.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip label={audit.paymentMethod} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Staff Detail Dialog */}
      {selectedStaff && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedStaff.staffName} - Detailed Performance
              </Typography>
              <IconButton onClick={() => setSelectedStaff(null)}>
                <Cancel />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{selectedStaff.staffEmail}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Role</Typography>
                <Typography variant="body1">{selectedStaff.staffRole}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Total Orders</Typography>
                <Typography variant="h6">{selectedStaff.totalOrders}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Completed</Typography>
                <Typography variant="h6" sx={{ color: '#4caf50' }}>
                  {selectedStaff.completedOrders}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Cancelled</Typography>
                <Typography variant="h6" sx={{ color: '#f44336' }}>
                  {selectedStaff.cancelledOrders}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                <Typography variant="h6">
                  ₱{selectedStaff.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
                  Station Performance
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Station</TableCell>
                        <TableCell align="right">Orders</TableCell>
                        <TableCell align="right">Sales (₱)</TableCell>
                        <TableCell align="right">Avg Order (₱)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedStaff.stationsArray.map((station) => (
                        <TableRow key={station.station}>
                          <TableCell>
                            <Chip label={station.station} size="small" />
                          </TableCell>
                          <TableCell align="right">{station.orders}</TableCell>
                          <TableCell align="right">
                            ₱{station.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">
                            ₱{station.averageOrderValue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StaffPerformancePage;

