import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Divider,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Storefront,
  Coffee,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleDemoLogin = (role: string) => {
    const demoCredentials: Record<string, { email: string; password: string }> = {
      manager: { email: 'manager@cafesync.com', password: 'password' },
      barista: { email: 'barista@cafesync.com', password: 'password' },
      kitchen: { email: 'kitchen@cafesync.com', password: 'password' },
    };

    const credentials = demoCredentials[role];
    if (credentials) {
      setEmail(credentials.email);
      setPassword(credentials.password);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #D2691E 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Coffee sx={{ fontSize: 40, color: '#8B4513', mr: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#8B4513' }}>
                  CafeSync
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                Smart Coffee Shop Management
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

            {/* Login Form */}
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
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Demo Accounts
              </Typography>
            </Divider>

            {/* Demo Account Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Storefront />}
                onClick={() => handleDemoLogin('manager')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Manager Dashboard
              </Button>
              <Button
                variant="outlined"
                startIcon={<Storefront />}
                onClick={() => handleDemoLogin('barista')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Barista Station
              </Button>
              <Button
                variant="outlined"
                startIcon={<Storefront />}
                onClick={() => handleDemoLogin('kitchen')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Kitchen Station
              </Button>
            </Box>

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
