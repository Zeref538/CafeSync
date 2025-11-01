import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  Chip,
  IconButton as ActionButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Delete,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNotificationHistory } from '../../contexts/NotificationHistoryContext';

// Simple time formatting function (no external dependency needed)
const formatTimeAgo = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // Format date for older notifications
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
};

const NotificationHistoryButton: React.FC = () => {
  const theme = useTheme();
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotificationHistory();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      case 'info':
        return <Info sx={{ color: '#2196f3' }} />;
      default:
        return <Info sx={{ color: '#666' }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#666';
    }
  };

  const formatTime = (timestamp: string) => formatTimeAgo(timestamp);

  return (
    <>
      <Tooltip title="Notification History">
        <IconButton
          onClick={handleClick}
          color="inherit"
          sx={{
            ml: 1,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1.5,
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.15)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon fontSize="small" />
              Notification History
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <ActionButton
                    size="small"
                    onClick={markAllAsRead}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </ActionButton>
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip title="Clear all">
                  <ActionButton
                    size="small"
                    onClick={clearAll}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <Delete fontSize="small" />
                  </ActionButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 450, overflow: 'auto', p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: notification.read
                        ? 'transparent'
                        : theme.palette.mode === 'dark'
                        ? 'rgba(33, 150, 243, 0.1)'
                        : 'rgba(33, 150, 243, 0.05)',
                      border: notification.read
                        ? 'none'
                        : `1px solid ${getNotificationColor(notification.type)}40`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.02)',
                        transform: 'translateX(4px)',
                      },
                      position: 'relative',
                      '&::before': notification.read
                        ? {}
                        : {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            backgroundColor: getNotificationColor(notification.type),
                            borderRadius: '0 4px 4px 0',
                          },
                    }}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.read ? 400 : 600,
                            color: 'text.primary',
                            mb: 0.5,
                          }}
                        >
                          {notification.message}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {formatTime(notification.timestamp)}
                          {!notification.read && (
                            <Chip
                              label="New"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.65rem',
                                backgroundColor: getNotificationColor(notification.type),
                                color: 'white',
                              }}
                            />
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationHistoryButton;

