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
} from '@mui/material';
import {
  AccountCircle,
  Settings,
  Logout,
  Person,
  Email,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
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
          p: 1.5,
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(107, 68, 35, 0.1) 0%, rgba(139, 69, 19, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(107, 68, 35, 0.05) 0%, rgba(139, 69, 19, 0.08) 100%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.08)' 
              : 'rgba(107, 68, 35, 0.08)',
            transform: 'translateY(-2px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(0,0,0,0.3)'
              : '0 4px 12px rgba(0,0,0,0.1)',
            '&::before': {
              opacity: 1,
            },
          },
        }}
        onClick={handleClick}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            backgroundColor: getRoleColor(user.role),
            fontSize: '0.95rem',
            fontWeight: 700,
            mr: 2,
            boxShadow: `0 4px 12px ${getRoleColor(user.role)}40`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: `0 6px 16px ${getRoleColor(user.role)}60`,
            },
          }}
        >
          {getInitials(user.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.95rem',
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
              fontWeight: 500,
            }}
          >
            {user.role}
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          sx={{ 
            ml: 1,
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(107, 68, 35, 0.05)',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(107, 68, 35, 0.1)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <AccountCircle fontSize="small" />
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(40, 40, 40, 0.95) 100%)'
              : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(0,0,0,0.08)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #6B4423 0%, #8B5A3C 50%, #C17D4A 100%)',
            },
            '& .MuiMenuItem-root': {
              px: 2.5,
              py: 1.5,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(107, 68, 35, 0.2)'
                  : 'rgba(107, 68, 35, 0.08)',
                transform: 'translateX(4px)',
              },
              '&:last-of-type': {
                mb: 0,
              },
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
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={handleLogout} 
          sx={{ 
            color: 'error.main',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(244, 67, 54, 0.15)'
                : 'rgba(244, 67, 54, 0.08)',
            },
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText sx={{ '& .MuiListItemText-primary': { fontWeight: 600 } }}>Logout</ListItemText>
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
    </Box>
  );
};

export default UserMenu;
