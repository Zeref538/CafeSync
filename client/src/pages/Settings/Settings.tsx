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
  useTheme,
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
import EmployeeInvitation from '../../components/Admin/EmployeeInvitation';
import AuthDebugger from '../../components/Admin/AuthDebugger';
import AccountPasswordSection from '../../components/Settings/AccountPasswordSection';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';

const Settings: React.FC = () => {
  const { user } = useAuth();
  
  // Load settings from localStorage on mount
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('cafesync_settings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    // Default settings
    return {
    notifications: {
      orderAlerts: true,
      inventoryAlerts: true,
      lowStockWarnings: true,
        weatherUpdates: true,
      soundEnabled: true,
    },
    business: {
      storeName: 'CafeSync Coffee',
      storeAddress: '14 Kumintang Street, Caloocan City, Philippines',
      storePhone: '+63 (2) 123-4567',
      storeEmail: 'info@cafesync.com',
      operatingHours: '1:00 PM - 12:00 AM',
    },
    system: {
      autoBackup: true,
      dataRetention: '1 year',
      apiIntegrations: true,
      analyticsTracking: true,
    },
    };
  };

  const [settings, setSettings] = useState(loadSettings);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings((prev: ReturnType<typeof loadSettings>) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const handleSave = () => {
    localStorage.setItem('cafesync_settings', JSON.stringify(settings));
    notify.success('Settings saved successfully!');
    // Trigger a custom event to notify other components that settings changed
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
  };

  // Listen for settings updates from other tabs/windows
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cafesync_settings' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error updating settings from storage:', error);
        }
      }
    };

    const handleSettingsUpdate = (e: CustomEvent) => {
      setSettings(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
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
        Settings
      </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your application preferences and configurations
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #2196f3 0%, #42a5f5 50%, #64b5f6 100%)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Notifications sx={{ color: 'primary.main', fontSize: 24 }} />
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
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Sound Notifications"
                    secondary="Play sound for alerts and notifications"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.soundEnabled}
                      onChange={(e) => handleSettingChange('notifications', 'soundEnabled', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Information */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #6B4423 0%, #8B5A3C 50%, #C17D4A 100%)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Store sx={{ color: 'primary.main', fontSize: 24 }} />
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
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #ff9800 0%, #ffb74d 50%, #ffcc80 100%)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Security sx={{ color: 'warning.main', fontSize: 24 }} />
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

        {/* Account Security */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #4caf50 0%, #66bb6a 50%, #81c784 100%)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Person sx={{ color: 'success.main', fontSize: 24 }} />
                Account Security
              </Typography>
              
              <AccountPasswordSection />
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
              
              <Alert severity="info">
                <Typography variant="body2">
                  Use the Employee Management section below to invite and manage employees.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Invitation & Management - Only for Managers */}
        {user?.role === 'manager' && (
          <>
            <Grid item xs={12}>
              <AuthDebugger />
            </Grid>
            <Grid item xs={12}>
              <EmployeeInvitation />
            </Grid>
            <Grid item xs={12}>
              <UserManagement />
            </Grid>
          </>
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
