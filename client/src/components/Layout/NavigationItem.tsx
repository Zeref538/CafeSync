import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  useTheme,
} from '@mui/material';
import { ReactElement } from 'react';

interface NavigationItemProps {
  text: string;
  icon: ReactElement;
  path: string;
  badge?: number;
  color?: string;
  isActive?: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  text,
  icon,
  path,
  badge,
  color,
  isActive = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleClick = () => {
    navigate(path);
  };

  const isCurrentPath = location.pathname === path;

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={handleClick}
        sx={{
          mx: 1,
          mb: 0.5,
          borderRadius: 3,
          backgroundColor: isCurrentPath || isActive 
            ? theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)'
              : '#6B4423' // Solid dark brown for light mode - better contrast
            : 'transparent',
          color: isCurrentPath || isActive 
            ? 'white' 
            : 'text.primary',
          boxShadow: isCurrentPath || isActive
            ? theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(139, 69, 19, 0.4)'
              : '0 4px 12px rgba(107, 68, 35, 0.4)' // Stronger shadow for light mode
            : 'none',
          position: 'relative',
          overflow: 'hidden',
          '&::before': isCurrentPath || isActive ? {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            width: 4,
            height: '100%',
            backgroundColor: 'white',
            opacity: 0.9,
          } : {},
          '&:hover': {
            backgroundColor: isCurrentPath || isActive 
              ? theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #A0522D 0%, #C87941 100%)'
                : '#5A3820' // Even darker brown on hover for light mode
              : theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.08)' 
                : 'rgba(107, 68, 35, 0.08)',
            transform: 'translateX(4px)',
            boxShadow: isCurrentPath || isActive
              ? theme.palette.mode === 'dark'
                ? '0 6px 16px rgba(139, 69, 19, 0.5)'
                : '0 6px 16px rgba(107, 68, 35, 0.4)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <ListItemIcon
          sx={{
            color: isCurrentPath || isActive 
              ? 'white' 
              : 'text.secondary',
            minWidth: 40,
            '& svg': {
              // Ensure icons are visible
              color: isCurrentPath || isActive ? 'white' : 'inherit',
              opacity: isCurrentPath || isActive ? 1 : 0.7,
            },
          }}
        >
          {badge ? (
            <Badge badgeContent={badge} color="error" max={99}>
              {icon}
            </Badge>
          ) : (
            icon
          )}
        </ListItemIcon>
        <ListItemText
          primary={text}
          primaryTypographyProps={{
            fontWeight: isCurrentPath || isActive ? 600 : 400,
            fontSize: '0.95rem',
            color: isCurrentPath || isActive ? 'white' : 'inherit',
            sx: {
              color: isCurrentPath || isActive ? 'white !important' : 'inherit',
              fontWeight: isCurrentPath || isActive ? 600 : 400,
            },
          }}
          sx={{
            '& .MuiListItemText-primary': {
              color: isCurrentPath || isActive ? 'white !important' : 'inherit',
            },
          }}
        />
        {color && (
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: color,
              ml: 1,
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
};

export default NavigationItem;
