import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  Badge,
} from '@mui/material';
import {
  AccountCircle,
  Settings,
  Logout,
  Person,
  Notifications,
  Email,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    setProfileOpen(true);
    handleClose();
  };

  const handleNotifications = () => {
    setNotificationsOpen(true);
    handleClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleClose();
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      manager: '#2196f3',
      barista: '#4caf50',
      cashier: '#ff9800',
      kitchen: '#f44336',
    };
    return colors[role] || '#666';
  };

  if (!user) return null;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 2,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.08)' 
              : '#f5f5f5',
          },
        }}
        onClick={handleClick}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            backgroundColor: getRoleColor(user.role),
            fontSize: '0.9rem',
            fontWeight: 600,
            mr: 2,
          }}
        >
          {getInitials(user.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.9rem',
              lineHeight: 1.2,
              color: 'text.primary',
            }}
          >
            {user.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'capitalize',
              fontSize: '0.75rem',
            }}
          >
            {user.role}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ ml: 1 }}>
          <AccountCircle fontSize="small" />
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleNotifications}>
          <ListItemIcon>
            <Badge badgeContent={5} color="error">
              <Notifications fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText>Notifications</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>User Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                backgroundColor: getRoleColor(user.role),
                fontSize: '2.5rem',
                fontWeight: 600,
                mb: 2,
              }}
            >
              {getInitials(user.name)}
            </Avatar>
            
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {user.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Business sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {user.role}
              </Typography>
            </Box>

            <Divider sx={{ my: 2, width: '100%' }} />

            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Email sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {user.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Station
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {user.station || 'No station assigned'}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {user.permissions.map((permission) => (
                    <Box
                      key={permission}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.08)' 
                          : '#f5f5f5',
                        fontSize: '0.75rem',
                      }}
                    >
                      {permission}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog 
        open={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' }
        }}
      >
        <NotificationCenter standalone={true} onClose={() => setNotificationsOpen(false)} />
      </Dialog>
    </Box>
  );
};

export default UserMenu;
