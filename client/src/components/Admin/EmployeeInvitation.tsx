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
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
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

  const handleInviteEmployee = async () => {
    if (!newEmail || !newName || !newPassword || !newRole) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      // Debug Firebase Auth status
      checkFirebaseAuthStatus();
      
      // First create Firebase account
      console.log('Creating Firebase account for:', newEmail);
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      console.log('Firebase account created successfully:', userCredential.user.uid);
      
      // Then add to employee whitelist (async)
      const success = await addEmployee(newEmail, newName, newRole, user?.email || 'system');
      
      if (!success) {
        // If whitelist addition fails, we should clean up the Firebase account
        console.error('Failed to add to whitelist, cleaning up Firebase account');
        toast.error('Failed to add employee to whitelist. Please try again.');
        return;
      }

      // Sign out the newly created user (since we don't want to stay logged in as them)
      await signOut(auth);
      
      toast.success(`${newName} has been added as an employee! They can now sign in with their email and password.`);
      setInviteDialog(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('barista');
      loadEmployees();
    } catch (error: any) {
      console.error('Error creating employee account:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/password authentication is not enabled. Please contact the administrator.');
      } else {
        toast.error(`Failed to create employee account: ${error.message}`);
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
                placeholder="Minimum 6 characters"
                helperText="Employee will use this password to sign in"
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

