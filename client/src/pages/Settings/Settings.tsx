import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Save,
  Notifications,
  Security,
  Store,
  Person,
  Edit,
  Delete,
} from '@mui/icons-material';
import UserManagement from '../../components/Admin/UserManagement';
import { useAuth } from '../../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: {
      orderAlerts: true,
      inventoryAlerts: true,
      lowStockWarnings: true,
      weatherUpdates: false,
    },
    business: {
      storeName: 'CafeSync Coffee',
      storeAddress: '123 Main Street, City, State 12345',
      storePhone: '+1 (555) 123-4567',
      storeEmail: 'info@cafesync.com',
      operatingHours: '6:00 AM - 10:00 PM',
    },
    system: {
      autoBackup: true,
      dataRetention: '1 year',
      apiIntegrations: true,
      analyticsTracking: true,
    },
  });

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    console.log('Settings saved:', settings);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications />
                Notifications
              </Typography>
              
              <List sx={{ p: 0 }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Order Alerts"
                    secondary="Get notified when new orders are placed"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.orderAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'orderAlerts', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Inventory Alerts"
                    secondary="Get notified about inventory changes"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.inventoryAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'inventoryAlerts', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Low Stock Warnings"
                    secondary="Get notified when items are running low"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.lowStockWarnings}
                      onChange={(e) => handleSettingChange('notifications', 'lowStockWarnings', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Weather Updates"
                    secondary="Get weather-based demand predictions"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.weatherUpdates}
                      onChange={(e) => handleSettingChange('notifications', 'weatherUpdates', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Store />
                Business Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Name"
                    value={settings.business.storeName}
                    onChange={(e) => handleSettingChange('business', 'storeName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={settings.business.storeAddress}
                    onChange={(e) => handleSettingChange('business', 'storeAddress', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={settings.business.storePhone}
                    onChange={(e) => handleSettingChange('business', 'storePhone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={settings.business.storeEmail}
                    onChange={(e) => handleSettingChange('business', 'storeEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Operating Hours"
                    value={settings.business.operatingHours}
                    onChange={(e) => handleSettingChange('business', 'operatingHours', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security />
                System Settings
              </Typography>
              
              <List sx={{ p: 0 }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Auto Backup"
                    secondary="Automatically backup data daily"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.autoBackup}
                      onChange={(e) => handleSettingChange('system', 'autoBackup', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="API Integrations"
                    secondary="Enable external API connections"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.apiIntegrations}
                      onChange={(e) => handleSettingChange('system', 'apiIntegrations', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Analytics Tracking"
                    secondary="Collect usage analytics for improvements"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.analyticsTracking}
                      onChange={(e) => handleSettingChange('system', 'analyticsTracking', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person />
                User Management
              </Typography>
              
              <List sx={{ p: 0 }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Sarah Johnson"
                    secondary="Manager • sarah.johnson@cafesync.com"
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Mike Chen"
                    secondary="Barista • mike.chen@cafesync.com"
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Alex Rodriguez"
                    secondary="Kitchen Staff • alex.rodriguez@cafesync.com"
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Person />}
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Add New User
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management - Only for Managers */}
        {user?.role === 'manager' && (
          <Grid item xs={12}>
            <UserManagement />
          </Grid>
        )}

        {/* Save Button */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Changes will be applied immediately. Some settings may require a system restart.
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                >
                  Save Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
