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
          borderRadius: 2,
          backgroundColor: isCurrentPath || isActive 
            ? theme.palette.mode === 'dark' 
              ? '#8B4513' 
              : theme.palette.primary.main
            : 'transparent',
          color: isCurrentPath || isActive ? 'white' : 'text.primary',
          '&:hover': {
            backgroundColor: isCurrentPath || isActive 
              ? theme.palette.mode === 'dark'
                ? '#A0522D'
                : theme.palette.primary.light
              : theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.08)' 
                : 'rgba(107, 68, 35, 0.08)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <ListItemIcon
          sx={{
            color: isCurrentPath || isActive ? 'white' : 'text.secondary',
            minWidth: 40,
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
