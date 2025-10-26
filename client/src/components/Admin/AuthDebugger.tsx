import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { 
  getAllEmployees, 
  isEmployeeWhitelisted, 
  getEmployeeByEmail,
  initializeDemoEmployees 
} from '../../utils/employeeUtilsFirestore';
import toast from 'react-hot-toast';

const AuthDebugger: React.FC = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpass123');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [firestoreEmployees, setFirestoreEmployees] = useState<any[]>([]);

  const runAuthTest = async () => {
    try {
      console.log('=== Firebase Auth Debug Test ===');
      
      // Test 1: Check auth instance
      console.log('1. Auth instance:', auth);
      console.log('2. Auth app:', auth.app);
      console.log('3. Auth config:', auth.config);
      console.log('4. Current user:', auth.currentUser);
      
      // Test 2: Check Firestore employees
      console.log('5. Checking Firestore employees...');
      const employees = await getAllEmployees();
      console.log('6. Employees from Firestore:', employees);
      
      // Test 3: Check whitelist for test email
      console.log('7. Checking whitelist for:', testEmail);
      const isWhitelisted = await isEmployeeWhitelisted(testEmail);
      console.log('8. Is whitelisted:', isWhitelisted);
      
      // Test 4: Try to create a test account
      console.log('9. Attempting to create test account...');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('10. Account created successfully:', userCredential.user.uid);
      
      // Test 5: Sign out
      await signOut(auth);
      console.log('11. Signed out successfully');
      
      // Test 6: Try to sign in
      console.log('12. Attempting to sign in...');
      const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('13. Sign in successful:', signInResult.user.uid);
      
      // Test 7: Sign out again
      await signOut(auth);
      console.log('14. Final sign out successful');
      
      setDebugInfo({
        status: 'success',
        message: 'All authentication tests passed!',
        details: {
          authInstance: !!auth,
          appConfig: !!auth.app,
          firestoreEmployees: Object.keys(employees),
          testAccountCreated: true,
          signInTest: true,
          isWhitelisted: isWhitelisted,
        }
      });
      
      toast.success('Authentication test completed successfully!');
      
    } catch (error: any) {
      console.error('Auth test failed:', error);
      
      setDebugInfo({
        status: 'error',
        message: `Authentication test failed: ${error.message}`,
        errorCode: error.code,
        errorMessage: error.message,
        details: {
          authInstance: !!auth,
          appConfig: !!auth.app,
          testAccountCreated: false,
          signInTest: false,
        }
      });
      
      toast.error(`Auth test failed: ${error.message}`);
    }
  };

  const checkFirestoreEmployees = async () => {
    try {
      console.log('🔍 Checking Firestore employees...');
      const employees = await getAllEmployees();
      const employeeList = Object.values(employees);
      setFirestoreEmployees(employeeList);
      
      console.log('📋 Employees found:', employeeList);
      toast.success(`Found ${employeeList.length} employees in Firestore`);
    } catch (error) {
      console.error('Error checking Firestore employees:', error);
      toast.error('Failed to check Firestore employees');
    }
  };

  const initializeEmployees = async () => {
    try {
      console.log('🔧 Initializing employees...');
      await initializeDemoEmployees();
      await checkFirestoreEmployees();
      toast.success('Employees initialized successfully');
    } catch (error) {
      console.error('Error initializing employees:', error);
      toast.error('Failed to initialize employees');
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo(null);
    setFirestoreEmployees([]);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🔧 Firebase Authentication Debugger
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 2 }}>
          This tool helps debug authentication issues. Use with caution in production.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Test Email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            label="Test Password"
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={runAuthTest}
              size="small"
            >
              Run Auth Test
            </Button>
            <Button
              variant="outlined"
              onClick={checkFirestoreEmployees}
              size="small"
            >
              Check Firestore
            </Button>
            <Button
              variant="outlined"
              onClick={initializeEmployees}
              size="small"
            >
              Initialize Employees
            </Button>
            <Button
              variant="outlined"
              onClick={clearDebugInfo}
              size="small"
            >
              Clear Results
            </Button>
          </Box>
        </Box>

        {firestoreEmployees.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              📋 Firestore Employees ({firestoreEmployees.length}):
            </Typography>
            <List dense>
              {firestoreEmployees.map((employee, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemText
                    primary={`${employee.name} (${employee.email})`}
                    secondary={`Role: ${employee.role} | Status: ${employee.status}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {debugInfo && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Test Results:
            </Typography>
            
            <Alert 
              severity={debugInfo.status === 'success' ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {debugInfo.message}
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Details:
              </Typography>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(debugInfo.details, null, 2)}
              </pre>
            </Box>

            {debugInfo.errorCode && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Error Information:
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Error Code:</strong> {debugInfo.errorCode}
                </Typography>
                <Typography variant="body2">
                  <strong>Error Message:</strong> {debugInfo.errorMessage}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthDebugger;
