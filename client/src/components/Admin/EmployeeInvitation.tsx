import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add,
  Delete,
  Refresh,
  PersonAdd,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
  getAllEmployees,
  addEmployee,
  removeEmployee,
  updateEmployeeStatus,
  EmployeeRecord,
} from '../../utils/employeeUtilsFirestore';
import { 
  createUserWithEmailAndPassword, 
  signOut, 
  fetchSignInMethodsForEmail,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeInvitation: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'manager' | 'barista' | 'cashier' | 'kitchen'>('barista');

  const loadEmployees = async () => {
    try {
      const employeeData = await getAllEmployees();
      const employeeList = Object.values(employeeData);
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Debug function to check Firebase Auth status
  const checkFirebaseAuthStatus = () => {
    console.log('Firebase Auth Status:');
    console.log('- Auth instance:', auth);
    console.log('- Current user:', auth.currentUser);
    console.log('- App:', auth.app);
    console.log('- Config:', auth.config);
  };

  // Strong password validation function
  const validateStrongPassword = (password: string): { isValid: boolean; error?: string } => {
    // Minimum 8 characters
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    
    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }
    
    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }
    
    // At least one number
    if (!/[0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    
    // At least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
    }
    
    return { isValid: true };
  };

  const handleInviteEmployee = async () => {
    if (!newEmail || !newName || !newPassword || !newRole) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate strong password
    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.error || 'Password does not meet requirements');
      return;
    }

    try {
      // Debug Firebase Auth status
      checkFirebaseAuthStatus();
      
      // First add to employee whitelist in Firestore
      console.log('Adding employee to Firestore:', newEmail);
      const firestoreResult = await addEmployee(newEmail, newName, newRole, user?.email || 'system');
      
      if (!firestoreResult.success) {
        toast.error(`Failed to add employee to whitelist: ${firestoreResult.error || 'Unknown error'}`);
        console.error('Firestore error:', firestoreResult.error);
        return;
      }
      
      console.log('✅ Employee added to Firestore successfully');
      
      // Check what sign-in methods are available for this email
      let signInMethods: string[] = [];
      try {
        signInMethods = await fetchSignInMethodsForEmail(auth, newEmail);
        console.log('🔍 Available sign-in methods for', newEmail, ':', signInMethods);
      } catch (checkError: any) {
        console.log('⚠️ Could not check sign-in methods (account may not exist):', checkError);
      }
      
      // Then create or link Firebase Auth account
      let userCredential;
      try {
        if (signInMethods.includes('google.com') && !signInMethods.includes('password')) {
          // Account exists with Google sign-in only - we need to link email/password
          // Note: This requires the user to sign in with Google first, then link
          // For now, we'll create the Firestore entry and they can link later via Settings
          console.log('ℹ️ Google account exists for', newEmail, '- email/password will be linked when user signs in with Google');
          toast.success(`Account exists with Google sign-in. User can link email/password in Settings after signing in with Google.`);
        } else {
          // Try to create new email/password account
        console.log('Creating Firebase Auth account for:', newEmail);
        userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
        console.log('✅ Firebase Auth account created successfully:', userCredential.user.uid);
        }
      } catch (authError: any) {
        // If Firebase Auth account already exists, check if we can link
        if (authError.code === 'auth/email-already-in-use') {
          console.log('ℹ️ Firebase Auth account already exists for:', newEmail);
          
          if (signInMethods.includes('google.com') && !signInMethods.includes('password')) {
            // Google account exists - they can link password later via Settings
            toast.success(`Account exists with Google sign-in. User can link email/password in Settings.`);
          } else if (signInMethods.includes('password')) {
            // Password already exists - update it
            toast.success(`Account already exists with password. User can update it in Settings.`);
          } else {
            // Some other auth method exists
            toast.success(`Account exists with different sign-in method. User can link email/password in Settings.`);
          }
        } else {
          // For other auth errors, we should remove the Firestore entry or handle it
          console.error('❌ Error creating Firebase Auth account:', authError);
          toast.error(`Firestore entry created, but Firebase Auth failed: ${authError.message}. Employee can still use Sign Up to create their account.`);
        }
      }
      
      // Sign out the newly created user (if we created one)
      if (userCredential) {
        await signOut(auth);
      }
      
      toast.success(`${newName} has been added as an employee! They can now sign in with their email and password.`);
      setInviteDialog(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('barista');
      loadEmployees();
    } catch (error: any) {
      console.error('❌ Error creating employee account:', error);
      
      if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/password authentication is not enabled. Please contact the administrator.');
      } else {
        toast.error(`Failed to create employee account: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    const success = await removeEmployee(selectedEmployee);
    
    if (success) {
      toast.success('Employee removed successfully');
      setDeleteDialog(false);
      setSelectedEmployee(null);
      loadEmployees();
    } else {
      toast.error('Failed to remove employee');
    }
  };

  const handleToggleStatus = async (email: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const success = await updateEmployeeStatus(email, newStatus as 'active' | 'suspended');
    
    if (success) {
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      loadEmployees();
    } else {
      toast.error('Failed to update employee status');
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      manager: 'primary',
      barista: 'success',
      cashier: 'info',
      kitchen: 'warning',
    };
    return colors[role] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
    };
    return colors[status] || 'default';
  };

  // Check if user is manager
  if (user?.role !== 'manager') {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            Only managers can access employee management.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Employee Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Invite and manage employees who can access CafeSync
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadEmployees}
              size="small"
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setInviteDialog(true)}
              size="small"
            >
              Invite Employee
            </Button>
          </Box>
        </Box>

        {employees.length === 0 ? (
          <Alert severity="info">
            No employees found. Invite your first employee to get started.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Station</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Invited By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.email}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {employee.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={employee.role}
                        color={getRoleColor(employee.role)}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {employee.station ? (
                        <Chip
                          label={employee.station}
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.status}
                        color={getStatusColor(employee.status)}
                        size="small"
                        icon={employee.status === 'active' ? <CheckCircle /> : <Block />}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {employee.invitedBy}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          color={employee.status === 'active' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(employee.email, employee.status)}
                          title={employee.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          {employee.status === 'active' ? <Block /> : <CheckCircle />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedEmployee(employee.email);
                            setDeleteDialog(true);
                          }}
                          title="Remove"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Invite Dialog */}
        <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd color="primary" />
              <Typography variant="h6">Invite New Employee</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="employee@company.com"
                helperText="Employee will use this email to sign in"
              />
              <TextField
                fullWidth
                label="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="John Doe"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters with uppercase, lowercase, number & special character"
                helperText={
                  newPassword ? (
                    <Box component="span">
                      Password must contain:
                      <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem' }}>
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
                    'Employee will use this password to sign in. Must be strong password (8+ chars, uppercase, lowercase, number, special char)'
                  )
                }
                error={newPassword ? !validateStrongPassword(newPassword).isValid : false}
              />
              <TextField
                fullWidth
                select
                label="Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                required
                helperText="Determines access permissions"
              >
                <MenuItem value="manager">Manager (Full Access)</MenuItem>
                <MenuItem value="barista">Barista (Orders, Inventory, Loyalty)</MenuItem>
                <MenuItem value="cashier">Cashier (Orders, Loyalty)</MenuItem>
                <MenuItem value="kitchen">Kitchen (Orders, Inventory)</MenuItem>
              </TextField>
              <Alert severity="info">
                <Typography variant="caption">
                  The employee will be able to sign in using their email and password, or Google authentication.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteEmployee}
              variant="contained"
              startIcon={<Add />}
            >
              Add Employee
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Confirm Removal</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to remove this employee? They will no longer be able to sign in.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteEmployee}
              color="error"
              variant="contained"
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EmployeeInvitation;

