import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface CafeSyncLogoProps {
  variant?: 'full' | 'icon-only';
  size?: 'small' | 'medium' | 'large';
}

const CafeSyncLogo: React.FC<CafeSyncLogoProps> = ({ 
  variant = 'full', 
  size = 'medium' 
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Size configurations
  const sizeConfig = {
    small: { icon: 32, fontSize: 'h6', taglineFontSize: 'caption' },
    medium: { icon: 48, fontSize: 'h5', taglineFontSize: 'body2' },
    large: { icon: 64, fontSize: 'h4', taglineFontSize: 'body1' }
  };

  const config = sizeConfig[size];

  // Theme-aware colors
  // Light mode: Rich browns (coffee tones)
  // Dark mode: Lighter browns/beige for better contrast
  const colors = {
    light: {
      primary: '#6B4423',      // Dark brown for text
      secondary: '#A0785A',    // Medium brown for tagline
      iconLight: '#D4B28C',    // Light caramel
      iconMedium: '#A0785A',   // Medium brown
      iconDark: '#6B4423',     // Dark brown
    },
    dark: {
      primary: '#D4B28C',      // Light caramel for text (better contrast)
      secondary: '#C9A882',    // Slightly darker caramel for tagline
      iconLight: '#E8D5B7',    // Very light beige
      iconMedium: '#D4B28C',   // Light caramel
      iconDark: '#B89A7A',     // Medium caramel
    }
  };

  const colorScheme = isDark ? colors.dark : colors.light;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: variant === 'full' ? 1 : 0,
      }}
    >
      {/* Icon - Coffee Bean Swirl Design */}
      <Box
        sx={{
          position: 'relative',
          width: config.icon,
          height: config.icon,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={config.icon}
          height={config.icon}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer swirl segments */}
          <path
            d="M50 10 Q30 25 20 45 Q15 55 20 65 Q25 75 35 80 Q45 85 50 90 Q55 85 65 80 Q75 75 80 65 Q85 55 80 45 Q70 25 50 10 Z"
            fill={`url(#gradient1-${theme.palette.mode})`}
            opacity={0.9}
          />
          <path
            d="M50 15 Q35 28 28 45 Q25 52 28 60 Q31 68 38 72 Q45 76 50 82 Q55 76 62 72 Q69 68 72 60 Q75 52 72 45 Q65 28 50 15 Z"
            fill={`url(#gradient2-${theme.palette.mode})`}
            opacity={0.85}
          />
          <path
            d="M50 20 Q40 30 35 45 Q33 50 35 55 Q37 60 42 63 Q47 66 50 75 Q53 66 58 63 Q63 60 65 55 Q67 50 65 45 Q60 30 50 20 Z"
            fill={`url(#gradient3-${theme.palette.mode})`}
            opacity={0.8}
          />
          
          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill={colorScheme.iconMedium}
            opacity={0.7}
          />
          <circle
            cx="50"
            cy="50"
            r="12"
            fill={colorScheme.iconDark}
            opacity={0.6}
          />
          
          {/* Gradients for light mode */}
          <defs>
            <linearGradient id={`gradient1-${theme.palette.mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme.iconLight} />
              <stop offset="100%" stopColor={colorScheme.iconMedium} />
            </linearGradient>
            <linearGradient id={`gradient2-${theme.palette.mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme.iconMedium} />
              <stop offset="100%" stopColor={colorScheme.iconDark} />
            </linearGradient>
            <linearGradient id={`gradient3-${theme.palette.mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme.iconLight} />
              <stop offset="100%" stopColor={colorScheme.iconDark} />
            </linearGradient>
          </defs>
        </svg>
      </Box>

      {/* Text - only show if variant is 'full' */}
      {variant === 'full' && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant={config.fontSize as any}
            sx={{
              fontWeight: 700,
              color: colorScheme.primary,
              letterSpacing: '0.5px',
              textTransform: 'none',
              lineHeight: 1.2,
            }}
          >
            CafeSync
          </Typography>
          <Typography
            variant={config.taglineFontSize as any}
            sx={{
              color: colorScheme.secondary,
              opacity: 0.9,
              mt: 0.5,
              textTransform: 'none',
              fontWeight: 400,
              letterSpacing: '0.3px',
            }}
          >
            Smart Coffee Operations
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CafeSyncLogo;

