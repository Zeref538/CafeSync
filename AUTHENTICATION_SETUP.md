# CafeSync Authentication Setup Guide

## 🔐 Overview

CafeSync now implements a **secure, employee-only authentication system** with:

- ✅ **Email Passwordless Sign-in** (Magic link)
- ✅ **Google Sign-in** (OAuth 2.0)
- ✅ **Employee Whitelist** (Manager-controlled access)
- ✅ **Role-Based Permissions**

**Important:** Only employees invited by managers can access the system.

---

## 🎯 Authentication Methods

### 1. Email Passwordless (Magic Link)

- Employees receive a one-time sign-in link via email
- No password required
- Secure and user-friendly
- Works with any email provider

### 2. Google Sign-in

- Sign in with work Google account
- Single-click authentication
- Uses OAuth 2.0
- No password management needed

### 3. Password Login (Legacy/Demo)

- Traditional email + password
- Used for demo accounts
- Backward compatibility

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Employee tries │
│   to sign in    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Check employee whitelist│
│ (localStorage/Firestore)│
└────────┬────────────────┘
         │
    ┌────┴────┐
    │ Allowed?│
    └────┬────┘
         │
    YES  │  NO
    ┌────┴───────────────┐
    │                    │
    ▼                    ▼
┌──────────┐      ┌──────────────┐
│ Sign in  │      │ Access denied│
│ success  │      │ Contact mgr  │
└──────────┘      └──────────────┘
```

---

## ⚙️ Setup Instructions

### Step 1: Firebase Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com/

2. **Select your project**: `cafesync-3b25a` (or create new)

3. **Enable Authentication Methods**:

   - Go to **Authentication** → **Sign-in method**
   - Enable **Google** provider
   - Enable **Email Link** (passwordless)

4. **Add Authorized Domains**:

   - In Authentication settings → **Authorized domains**
   - Add your domain (e.g., `cafesync.app`) or `localhost` for development

5. **Get Firebase Config**:
   - Go to **Project Settings** → **General**
   - Scroll to "Your apps" → "Web apps"
   - Copy the `firebaseConfig` object

### Step 2: Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Enable APIs**:

   - Navigate to **APIs & Services** → **Library**
   - Enable "Google+ API" or "Google Identity Toolkit API"

3. **Create OAuth 2.0 Credentials**:

   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "CafeSync Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)

4. **Copy Client ID**:
   - You'll see your **Client ID** (already configured):
     ```
     309088075415-sd9b65oip7dippvf1ih9fota2vedr9k8.apps.googleusercontent.com
     ```

### Step 3: Environment Variables

1. **Create `client/.env`** file:

```env
# Firebase Configuration
REACT_APP_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_AUTH_DOMAIN=cafesync-3b25a.firebaseapp.com
REACT_APP_PROJECT_ID=cafesync-3b25a
REACT_APP_STORAGE_BUCKET=cafesync-3b25a.appspot.com
REACT_APP_MESSAGING_SENDER_ID=309088075415
REACT_APP_APP_ID=1:309088075415:web:XXXXXXXXXX
REACT_APP_MEASUREMENT_ID=G-XXXXXXXXXX

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=309088075415-sd9b65oip7dippvf1ih9fota2vedr9k8.apps.googleusercontent.com

# Backend URL
REACT_APP_SERVER_URL=http://localhost:5000
```

2. **Update `server/.env`** (if needed):

```env
GOOGLE_CLIENT_SECRET=your-full-client-secret-here
```

### Step 4: Firebase Security Rules (Optional)

If using Firestore for employee management:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Employees collection - only managers can write
    match /employees/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                   get(/databases/$(database)/documents/employees/$(request.auth.token.email)).data.role == 'manager';
    }
  }
}
```

---

## 👥 Employee Management

### For Managers:

1. **Access Employee Management**:

   - Sign in as a manager
   - Go to **Settings** page
   - Find "Employee Invitation" section

2. **Invite New Employee**:

   - Click "Invite Employee" button
   - Enter:
     - **Email**: Employee's work email
     - **Full Name**: Employee's full name
     - **Role**: Select appropriate role
       - `Manager`: Full access
       - `Barista`: Orders, Inventory, Loyalty
       - `Cashier`: Orders, Loyalty
       - `Kitchen`: Orders, Inventory

3. **Manage Existing Employees**:
   - **Suspend**: Temporarily disable employee access
   - **Activate**: Re-enable suspended employee
   - **Remove**: Permanently remove employee

### For Employees:

1. **Receive Invitation**:

   - Manager adds your email to the whitelist
   - You receive confirmation (optional email notification)

2. **Sign In**:

   - Go to CafeSync login page
   - Choose sign-in method:
     - **Email Link**: Enter email → Check inbox → Click link
     - **Google**: Click "Sign in with Google" → Select account
     - **Password**: Enter credentials (if set up)

3. **First Time Setup**:
   - Your role and permissions are pre-configured by manager
   - You'll be redirected to your station view automatically

---

## 🎭 Roles & Permissions

| Role    | Permissions                | Station       |
| ------- | -------------------------- | ------------- |
| Manager | All (full access)          | Management    |
| Barista | Orders, Inventory, Loyalty | Front Counter |
| Cashier | Orders, Loyalty            | Front Counter |
| Kitchen | Orders, Inventory          | Kitchen       |

---

## 🔒 Security Features

### Employee Whitelist

- Only pre-approved employees can sign in
- Checked before authentication completes
- Stored in localStorage (client) or Firestore (production)

### Manager-Only Controls

- Only managers can invite/remove employees
- Employee management UI hidden from non-managers
- Role-based access control enforced

### Firebase Auth

- Industry-standard authentication
- Secure token-based sessions
- Automatic session management
- CSRF protection built-in

### Google OAuth

- Trusted third-party authentication
- No password storage needed
- Multi-factor authentication (if enabled by user)
- Domain restriction support (optional)

---

## 🚀 Testing

### Demo Accounts

Use these for testing (already whitelisted):

```
Manager:
  Email: manager@cafesync.com
  Password: password (for legacy login)

Barista:
  Email: barista@cafesync.com
  Password: password (for legacy login)

Kitchen:
  Email: kitchen@cafesync.com
  Password: password (for legacy login)
```

### Test Flow:

1. **Sign in as Manager**:

   ```
   npm run dev
   → Go to http://localhost:3000/login
   → Use manager@cafesync.com / password
   → Navigate to Settings
   ```

2. **Invite Test Employee**:

   ```
   → Click "Invite Employee"
   → Email: test@example.com
   → Name: Test User
   → Role: Barista
   → Click "Add Employee"
   ```

3. **Test Google Sign-in**:

   ```
   → Logout
   → Go to Login page
   → Click "Google" tab
   → Click "Sign in with Google"
   → Select your Google account
   ```

4. **Test Passwordless Email**:
   ```
   → Go to Login page
   → Click "Email Link" tab
   → Enter: test@example.com
   → Check console for magic link (development)
   ```

---

## 🐛 Troubleshooting

### "Access denied. You are not an authorized employee."

**Solution:**

- Have a manager add your email to the employee whitelist
- Go to Settings → Employee Invitation → Invite Employee

### "Pop-up blocked. Please allow pop-ups for this site."

**Solution:**

- Allow pop-ups in your browser
- Chrome: Click the popup icon in address bar
- Firefox: Click "Options" → "Allow pop-ups"

### "Failed to send sign-in link"

**Solution:**

- Check Firebase Authentication is enabled
- Verify Email Link provider is activated
- Ensure your domain is in Authorized domains list
- Check browser console for specific errors

### "Google sign-in failed"

**Solution:**

- Verify Google provider is enabled in Firebase
- Check OAuth Client ID is correct
- Ensure authorized redirect URIs include your domain
- Clear browser cache and cookies

---

## 📚 Code Structure

```
client/src/
├── contexts/
│   └── AuthContext.tsx          # Authentication logic
├── utils/
│   └── employeeUtils.ts         # Employee whitelist management
├── components/
│   └── Admin/
│       └── EmployeeInvitation.tsx  # Manager UI for inviting employees
├── pages/
│   └── Auth/
│       └── Login.tsx            # Login page with 3 auth methods
├── firebase.js                  # Firebase initialization
└── googleAuth.js                # Google OAuth provider config
```

---

## 🔄 Migration from Old System

If migrating from the old authentication system:

1. **Export Existing Users**:

   ```javascript
   const users = localStorage.getItem("cafesync_users");
   console.log(JSON.parse(users));
   ```

2. **Import to Employee Whitelist**:

   ```javascript
   // As manager, add each user via Employee Invitation UI
   // Or run migration script in browser console
   ```

3. **Notify Employees**:
   - Send email about new auth system
   - Provide instructions for first-time sign-in
   - Share this documentation

---

## 📞 Support

If you encounter issues:

1. Check Firebase Console for errors
2. Review browser console logs
3. Verify environment variables are correct
4. Ensure Firebase Auth is properly configured
5. Contact your system administrator

---

## 🎉 Best Practices

### For Managers:

- ✅ Only invite trusted employees
- ✅ Use work email addresses
- ✅ Assign appropriate roles
- ✅ Regularly review employee list
- ✅ Remove inactive employees promptly

### For Employees:

- ✅ Use strong Google account password
- ✅ Enable 2FA on Google account
- ✅ Sign out after each shift
- ✅ Don't share sign-in links
- ✅ Report suspicious activity

---

**Last Updated:** October 2025  
**Version:** 2.0  
**Tutorial Reference:** [YouTube - Google OAuth Tutorial](https://www.youtube.com/watch?v=oNT2VZGH1ZI&t=1929s)
