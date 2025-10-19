import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider as CustomThemeProvider, useTheme as useCustomTheme } from './contexts/ThemeContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create theme for tablet-optimized design
const createAppTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: isDarkMode ? '#A0522D' : '#6B4423', // Rich coffee brown
      light: isDarkMode ? '#C87941' : '#8B5A3C',
      dark: isDarkMode ? '#654321' : '#4A2F1F',
      contrastText: '#ffffff',
    },
    secondary: {
      main: isDarkMode ? '#D2691E' : '#C17D4A', // Warm caramel
      light: isDarkMode ? '#DEB887' : '#D4A574',
      dark: isDarkMode ? '#8B4513' : '#9D5E36',
      contrastText: '#ffffff',
    },
    background: {
      default: isDarkMode ? '#121212' : '#FAF8F5', // Warm off-white
      paper: isDarkMode ? '#1e1e1e' : '#FFFFFF',
    },
    text: {
      primary: isDarkMode ? '#ffffff' : '#2C2216', // Dark brown text
      secondary: isDarkMode ? '#b3b3b3' : '#6B5B4A', // Muted brown
    },
    success: {
      main: isDarkMode ? '#4caf50' : '#2E7D32',
      light: isDarkMode ? '#81c784' : '#4CAF50',
      dark: isDarkMode ? '#388e3c' : '#1B5E20',
    },
    info: {
      main: isDarkMode ? '#2196f3' : '#0277BD',
      light: isDarkMode ? '#64b5f6' : '#0288D1',
      dark: isDarkMode ? '#1976d2' : '#01579B',
    },
    warning: {
      main: isDarkMode ? '#ff9800' : '#E65100',
      light: isDarkMode ? '#ffb74d' : '#EF6C00',
      dark: isDarkMode ? '#f57c00' : '#BF360C',
    },
    error: {
      main: isDarkMode ? '#f44336' : '#C62828',
      light: isDarkMode ? '#e57373' : '#D32F2F',
      dark: isDarkMode ? '#d32f2f' : '#B71C1C',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 500,
          minHeight: 48,
          touchAction: 'manipulation',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(139, 69, 19, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            minHeight: 48,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 32,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
          touchAction: 'manipulation',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Theme wrapper component
const ThemeWrapper: React.FC = () => {
  const { isDarkMode } = useCustomTheme();
  const theme = createAppTheme(isDarkMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: isDarkMode ? '#2e2e2e' : '#333',
                  color: '#fff',
                  fontSize: '16px',
                  borderRadius: '12px',
                  padding: '16px',
                },
                success: {
                  iconTheme: {
                    primary: '#4caf50',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f44336',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <ThemeWrapper />
      </CustomThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
