import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  Close,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
  DoneAll,
  Refresh,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { API_ENDPOINTS } from '../../config/api';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  standalone?: boolean;
  onClose?: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Order Completed',
    message: 'Order #1001 has been completed successfully',
    timestamp: '2024-01-20T14:30:00Z',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Whole Milk is running low (3 remaining)',
    timestamp: '2024-01-20T14:15:00Z',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'New Order',
    message: 'Order #1002 has been placed',
    timestamp: '2024-01-20T14:00:00Z',
    read: true,
  },
  {
    id: '4',
    type: 'error',
    title: 'Payment Issue',
    message: 'Failed to process payment for Order #1003',
    timestamp: '2024-01-20T13:45:00Z',
    read: true,
  },
  {
    id: '5',
    type: 'success',
    title: 'Restock Completed',
    message: 'Coffee beans have been restocked',
    timestamp: '2024-01-20T13:30:00Z',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle sx={{ color: '#4caf50' }} />;
    case 'warning':
      return <Warning sx={{ color: '#ff9800' }} />;
    case 'info':
      return <Info sx={{ color: '#2196f3' }} />;
    case 'error':
      return <ErrorIcon sx={{ color: '#f44336' }} />;
    default:
      return <Notifications />;
  }
};

const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    error: '#f44336',
  };
  return colors[type] || '#666';
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ standalone = false, onClose }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from Firestore
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Notifications API response:', result);
        
        if (result.success && result.data) {
          const fetchedNotifications = (result.data || []).map((n: any) => ({
            id: n.id,
            type: n.type || 'info',
            title: n.title || 'Notification',
            message: n.message || '',
            timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
            read: n.read || false,
          }));
          console.log(`Loaded ${fetchedNotifications.length} notifications`);
          setNotifications(fetchedNotifications);
        } else {
          console.warn('Notifications API returned no data:', result);
          setNotifications([]);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch notifications:', response.status, errorText);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.MARK_NOTIFICATION_READ(notificationId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MARK_ALL_READ, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Fetch notifications on mount and when dialog opens
  useEffect(() => {
    if (open || standalone) {
      fetchNotifications();
    }
  }, [open, standalone]);

  // Listen for custom notification refresh events (triggered after order actions)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Notification refresh event triggered');
      // Add small delay to ensure backend has processed the notification
      setTimeout(() => {
        fetchNotifications();
      }, 1500); // Increased delay to ensure Firestore write completes
    };
    
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => window.removeEventListener('refresh-notifications', handleRefresh);
  }, []);

  // Always update badge count every 5 seconds (even when closed)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000); // Refresh every 5 seconds to update badge count
    
    return () => clearInterval(interval);
  }, []);

  // Refresh notifications every 3 seconds when dialog is open (real-time updates)
  useEffect(() => {
    if (!open && !standalone) return;
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 3000); // Refresh every 3 seconds when open for real-time updates
    
    return () => clearInterval(interval);
  }, [open, standalone]);
  
  // Also refresh when window regains focus (user comes back to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (open || standalone) {
        fetchNotifications();
      } else {
        // Even if closed, refresh to update badge count
        fetchNotifications();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [open, standalone]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const groupedNotifications = {
    unread: notifications.filter(n => !n.read),
    read: notifications.filter(n => n.read),
  };

  const dialogOpen = standalone ? true : open;
  const handleDialogClose = () => {
    if (standalone && onClose) {
      onClose();
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      {!standalone && (
        <IconButton color="inherit" onClick={() => setOpen(true)}>
          {unreadCount > 0 ? (
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Notifications />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  border: '2px solid white',
                }}
              />
            </Box>
          ) : (
            <Notifications />
          )}
        </IconButton>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications />
              <Typography variant="h6">Notifications</Typography>
              {unreadCount > 0 && (
                <Chip label={unreadCount} size="small" color="error" sx={{ ml: 1 }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={fetchNotifications}
                sx={{ color: 'white' }}
                title="Refresh notifications"
              >
                <Refresh />
              </IconButton>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<DoneAll />}
                  onClick={markAllAsRead}
                  sx={{ color: 'white', textTransform: 'none' }}
                >
                  Mark all read
                </Button>
              )}
              <IconButton onClick={handleDialogClose} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}
          
          {!loading && unreadCount > 0 && (
            <>
              <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Unread ({unreadCount})
                </Typography>
              </Box>
              <List>
                {groupedNotifications.unread.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem 
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      sx={{ 
                        py: 2,
                        cursor: !notification.read ? 'pointer' : 'default',
                        '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {notification.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                          </Box>
                        }
                        secondary={formatTimestamp(notification.timestamp)}
                      />
                    </ListItem>
                    {index < groupedNotifications.unread.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              <Divider />
            </>
          )}

          {!loading && groupedNotifications.read.length > 0 && (
            <>
              <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Earlier
                </Typography>
              </Box>
              <List>
                {groupedNotifications.read.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem 
                      sx={{ 
                        py: 1.5,
                        opacity: 0.7,
                        '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {notification.message}
                            </Typography>
                          </Box>
                        }
                        secondary={formatTimestamp(notification.timestamp)}
                      />
                    </ListItem>
                    {index < groupedNotifications.read.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </>
          )}

          {!loading && notifications.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You're all caught up!
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationCenter;

