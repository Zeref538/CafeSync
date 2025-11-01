import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  useTheme,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Coffee,
  Google,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import CafeSyncLogo from '../../components/Layout/CafeSyncLogo';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await loginWithGoogle();
    if (!success) {
      setError('Google sign-in failed or access denied.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #121212 100%)'
          : 'linear-gradient(135deg, #6B4423 0%, #8B5A3C 50%, #C17D4A 100%)',
        backgroundImage: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 20% 30%, rgba(107, 68, 35, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.12) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)',
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '80%',
          height: '200%',
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle, rgba(107, 68, 35, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 8s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%, 100%': {
            transform: 'scale(1) rotate(0deg)',
            opacity: 0.5,
          },
          '50%': {
            transform: 'scale(1.1) rotate(180deg)',
            opacity: 0.8,
          },
        },
      }}
    >
      <Container maxWidth="sm">
        {/* Logo at top */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <CafeSyncLogo variant="full" size="large" />
        </Box>
        
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)' 
              : '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            backdropFilter: 'blur(10px)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 30, 30, 0.9)'
              : 'rgba(255, 255, 255, 0.98)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: theme.palette.mode === 'dark'
                ? '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                : '0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08)',
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Welcome message */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Sign in to access your dashboard
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Employee Authentication Notice */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🔒 Employee-Only Access
              </Typography>
              <Typography variant="caption">
                Only authorized employees can sign in. Contact your manager if you need access.
              </Typography>
            </Alert>

            {/* Authentication Tabs */}
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="Google" icon={<Google />} iconPosition="start" />
              <Tab label="Email & Password" icon={<Lock />} iconPosition="start" />
            </Tabs>

            {/* Tab 1: Google Sign-in */}
            <TabPanel value={tabValue} index={0}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Google />}
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                sx={{
                  py: 1.5,
                  backgroundColor: '#4285f4',
                  '&:hover': {
                    backgroundColor: '#357ae8',
                  },
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign in with Google'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                Use your work Google account
              </Typography>
            </TabPanel>

            {/* Tab 2: Email & Password Login */}
            <TabPanel value={tabValue} index={1}>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{ py: 1.5 }}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>
            </TabPanel>

            {/* Features */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Powered by AI • Real-time Updates • Tablet Optimized
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="AI Recommendations" size="small" color="primary" variant="outlined" />
                <Chip label="Inventory Tracking" size="small" color="secondary" variant="outlined" />
                <Chip label="Analytics" size="small" color="success" variant="outlined" />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;
