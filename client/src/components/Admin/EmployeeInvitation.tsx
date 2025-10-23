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
} from '../../utils/employeeUtils';
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
  const [newRole, setNewRole] = useState<'manager' | 'barista' | 'cashier' | 'kitchen'>('barista');

  const loadEmployees = () => {
    const employeeData = getAllEmployees();
    const employeeList = Object.values(employeeData);
    setEmployees(employeeList);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleInviteEmployee = () => {
    if (!newEmail || !newName || !newRole) {
      toast.error('Please fill in all fields');
      return;
    }

    const success = addEmployee(newEmail, newName, newRole, user?.email || 'system');
    
    if (success) {
      toast.success(`${newName} has been added as an employee!`);
      setInviteDialog(false);
      setNewEmail('');
      setNewName('');
      setNewRole('barista');
      loadEmployees();
    } else {
      toast.error('Failed to add employee. Email may already exist.');
    }
  };

  const handleDeleteEmployee = () => {
    if (!selectedEmployee) return;

    const success = removeEmployee(selectedEmployee);
    
    if (success) {
      toast.success('Employee removed successfully');
      setDeleteDialog(false);
      setSelectedEmployee(null);
      loadEmployees();
    } else {
      toast.error('Failed to remove employee');
    }
  };

  const handleToggleStatus = (email: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const success = updateEmployeeStatus(email, newStatus as 'active' | 'suspended');
    
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
                  The employee will be able to sign in using Google or a passwordless email link.
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

