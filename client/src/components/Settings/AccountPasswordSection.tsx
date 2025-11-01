import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  Google,
} from '@mui/icons-material';
import { 
  auth,
} from '../../firebase';
import {
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';

const AccountPasswordSection: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signInMethods, setSignInMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSignInMethods = async () => {
      if (!user?.email) return;
      
      try {
        setChecking(true);
        const methods = await fetchSignInMethodsForEmail(auth, user.email);
        setSignInMethods(methods);
        console.log('📋 Sign-in methods for', user.email, ':', methods);
      } catch (error: any) {
        console.error('Error checking sign-in methods:', error);
      } finally {
        setChecking(false);
      }
    };

    checkSignInMethods();
  }, [user?.email]);

  // Strong password validation
  const validateStrongPassword = (password: string): { isValid: boolean; error?: string } => {
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character' };
    }
    return { isValid: true };
  };

  const handleLinkPassword = async () => {
    if (!user?.email) return;
    
    if (!newPassword || !confirmPassword) {
      notify.error('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error('Passwords do not match');
      return;
    }

    // Validate strong password
    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.isValid) {
      notify.error(passwordValidation.error || 'Password does not meet requirements');
      return;
    }

    setLoading(true);
    
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        notify.error('You must be signed in to set a password');
        return;
      }

      // Check if user signed in with Google
      if (signInMethods.includes('google.com') && !signInMethods.includes('password')) {
        // Link email/password to Google account
        try {
          const credential = EmailAuthProvider.credential(user.email, newPassword);
          await linkWithCredential(currentUser, credential);
          notify.success('Email/password authentication linked successfully! You can now sign in with email and password.');
          
          // Refresh sign-in methods
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          setSignInMethods(methods);
          
          // Clear form
          setNewPassword('');
          setConfirmPassword('');
        } catch (linkError: any) {
          console.error('Error linking password:', linkError);
          if (linkError.code === 'auth/credential-already-in-use') {
            notify.error('This password is already in use. Please choose a different password.');
          } else {
            notify.error(`Failed to link password: ${linkError.message}`);
          }
        }
      } else if (signInMethods.includes('password')) {
        // Update existing password (requires re-authentication for security)
        if (!currentPassword) {
          notify.error('Please enter your current password to update it');
          return;
        }

        try {
          // Re-authenticate with current password
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          
          // Update password
          await updatePassword(currentUser, newPassword);
          notify.success('Password updated successfully!');
          
          // Clear form
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          
          // Refresh sign-in methods
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          setSignInMethods(methods);
        } catch (reAuthError: any) {
          console.error('Error re-authenticating:', reAuthError);
          if (reAuthError.code === 'auth/wrong-password') {
            notify.error('Current password is incorrect');
          } else if (reAuthError.code === 'auth/requires-recent-login') {
            notify.error('Please sign out and sign in again before changing your password');
          } else {
            notify.error(`Failed to update password: ${reAuthError.message}`);
          }
        }
      } else if (signInMethods.length === 0 || (!signInMethods.includes('password') && !signInMethods.includes('google.com'))) {
        // No existing auth methods or unknown - try to create new password account
        try {
          // This case shouldn't normally happen, but handle it
          const credential = EmailAuthProvider.credential(user.email, newPassword);
          await linkWithCredential(currentUser, credential);
          notify.success('Email/password authentication linked successfully!');
          
          // Refresh sign-in methods
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          setSignInMethods(methods);
          
          // Clear form
          setNewPassword('');
          setConfirmPassword('');
        } catch (linkError: any) {
          console.error('Error linking password:', linkError);
          notify.error(`Failed to link password: ${linkError.message}`);
        }
      } else {
        // Account exists but no password - try to create credential
        // This shouldn't happen in normal flow, but handle it
        notify.error('Unable to set password. Please contact support.');
      }
    } catch (error: any) {
      console.error('Error setting password:', error);
      notify.error(`Failed to set password: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const hasGoogle = signInMethods.includes('google.com');
  const hasPassword = signInMethods.includes('password');

  if (checking) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Checking account status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Current Sign-In Methods */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Current Sign-In Methods
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {hasGoogle && (
            <Chip
              icon={<Google />}
              label="Google"
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {hasPassword && (
            <Chip
              icon={<Lock />}
              label="Email/Password"
              color="success"
              variant="outlined"
              size="small"
            />
          )}
          {!hasGoogle && !hasPassword && (
            <Chip
              label="No authentication methods"
              color="default"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Password Setup/Update */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          {hasPassword ? 'Update Password' : 'Set Email/Password Sign-In'}
        </Typography>

        {hasGoogle && !hasPassword && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Your account was created with Google sign-in. You can add email/password authentication below to sign in with either method.
            </Typography>
          </Alert>
        )}

        {hasPassword && (
          <TextField
            fullWidth
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
        )}

        <TextField
          fullWidth
          label={hasPassword ? "New Password" : "Password"}
          type={showNewPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          margin="normal"
          required
          error={newPassword ? !validateStrongPassword(newPassword).isValid : false}
          helperText={
            newPassword ? (
              <Box component="span">
                Password must contain:
                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem', mt: 0.5 }}>
                  <li style={{ color: newPassword.length >= 8 ? 'green' : 'red' }}>
                    At least 8 characters {newPassword.length >= 8 ? '✓' : '✗'}
                  </li>
                  <li style={{ color: /[A-Z]/.test(newPassword) ? 'green' : 'red' }}>
                    One uppercase letter {/[A-Z]/.test(newPassword) ? '✓' : '✗'}
                  </li>
                  <li style={{ color: /[a-z]/.test(newPassword) ? 'green' : 'red' }}>
                    One lowercase letter {/[a-z]/.test(newPassword) ? '✓' : '✗'}
                  </li>
                  <li style={{ color: /[0-9]/.test(newPassword) ? 'green' : 'red' }}>
                    One number {/[0-9]/.test(newPassword) ? '✓' : '✗'}
                  </li>
                  <li style={{ color: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? 'green' : 'red' }}>
                    One special character {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? '✓' : '✗'}
                  </li>
                </Box>
              </Box>
            ) : (
              'Set a strong password to enable email/password sign-in'
            )
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  edge="end"
                >
                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          required
          error={confirmPassword ? newPassword !== confirmPassword : false}
          helperText={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleLinkPassword}
          disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || !validateStrongPassword(newPassword).isValid}
          startIcon={hasPassword ? <Lock /> : <CheckCircle />}
          sx={{
            background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
            boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #66bb6a 0%, #81c784 100%)',
              boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {loading 
            ? 'Processing...' 
            : hasPassword 
              ? 'Update Password' 
              : 'Set Email/Password Sign-In'}
        </Button>

        {hasGoogle && !hasPassword && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            After setting a password, you'll be able to sign in with either Google or Email/Password
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AccountPasswordSection;

