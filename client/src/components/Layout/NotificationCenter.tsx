import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Notifications,
  Close,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

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
  const [notifications] = useState<Notification[]>(mockNotifications);

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
            <IconButton onClick={handleDialogClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {unreadCount > 0 && (
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
                      sx={{ 
                        py: 2,
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

          {groupedNotifications.read.length > 0 && (
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

          {notifications.length === 0 && (
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

