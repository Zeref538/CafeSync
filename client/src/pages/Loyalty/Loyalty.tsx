import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Search,
  Person,
  Star,
  LocalOffer,
  Add,
  Edit,
  MoreVert,
} from '@mui/icons-material';

const Loyalty: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock loyalty data
  const customers = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1234567890',
      loyaltyPoints: 150,
      tier: 'gold',
      totalSpent: 450.75,
      visitCount: 25,
      lastVisit: '2024-01-20T14:30:00Z',
      rewards: [
        { id: '1', type: 'free_drink', description: 'Free Medium Drink', pointsRequired: 100, redeemed: false },
      ],
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+1987654321',
      loyaltyPoints: 75,
      tier: 'silver',
      totalSpent: 225.50,
      visitCount: 15,
      lastVisit: '2024-01-19T09:15:00Z',
      rewards: [],
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@email.com',
      phone: '+1555123456',
      loyaltyPoints: 200,
      tier: 'platinum',
      totalSpent: 650.25,
      visitCount: 35,
      lastVisit: '2024-01-20T16:45:00Z',
      rewards: [
        { id: '2', type: 'free_pastry', description: 'Free Pastry', pointsRequired: 150, redeemed: false },
        { id: '3', type: 'free_drink', description: 'Free Large Drink', pointsRequired: 200, redeemed: false },
      ],
    },
  ];

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
    };
    return colors[tier] || '#666';
  };

  const getTierIcon = (tier: string) => {
    return <Star sx={{ color: getTierColor(tier) }} />;
  };

  const loyaltyStats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.visitCount > 0).length,
    totalPointsIssued: customers.reduce((sum, c) => sum + c.loyaltyPoints, 0),
    averagePointsPerCustomer: customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / customers.length,
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Customer Loyalty Program
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {loyaltyStats.totalCustomers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                {loyaltyStats.activeCustomers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {loyaltyStats.totalPointsIssued}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Points Issued
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                {loyaltyStats.averagePointsPerCustomer.toFixed(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Points/Customer
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{ textTransform: 'none' }}
            >
              Add Customer
            </Button>
          </Box>

          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Customers" />
            <Tab label="Gold Members" />
            <Tab label="Silver Members" />
            <Tab label="Bronze Members" />
          </Tabs>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardContent>
          <List sx={{ p: 0 }}>
            {customers.map((customer, index) => (
              <React.Fragment key={customer.id}>
                <ListItem sx={{ px: 0, py: 2 }}>
                  <Avatar
                    sx={{
                      backgroundColor: getTierColor(customer.tier),
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {getTierIcon(customer.tier)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {customer.name}
                        </Typography>
                        <Chip
                          label={customer.tier}
                          size="small"
                          sx={{
                            backgroundColor: `${getTierColor(customer.tier)}20`,
                            color: getTierColor(customer.tier),
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {customer.email} • {customer.phone}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{customer.loyaltyPoints}</strong> points
                          </Typography>
                          <Typography variant="body2">
                            <strong>{customer.visitCount}</strong> visits
                          </Typography>
                          <Typography variant="body2">
                            <strong>₱{customer.totalSpent.toFixed(2)}</strong> spent
                          </Typography>
                        </Box>
                        {customer.rewards.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {customer.rewards.map((reward) => (
                              <Chip
                                key={reward.id}
                                label={reward.description}
                                size="small"
                                color="primary"
                                variant="outlined"
                                icon={<LocalOffer />}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        sx={{ textTransform: 'none' }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Star />}
                        sx={{ textTransform: 'none' }}
                      >
                        Add Points
                      </Button>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < customers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Loyalty;
