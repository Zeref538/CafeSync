# CafeSync: Complete Setup and Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Development Setup](#development-setup)
6. [Authentication Setup](#authentication-setup)
7. [Firebase Emulators](#firebase-emulators)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up CafeSync, ensure you have the following installed:

### Required Software

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://python.org/)
- **Git** - [Download](https://git-scm.com/)
- **Firebase CLI** - Install via: `npm install -g firebase-tools`
- **Google Cloud SDK** (for deployment) - [Download](https://cloud.google.com/sdk/docs/install)

### Recommended Tools

- **VS Code** - [Download](https://code.visualstudio.com/)
- VS Code Extensions:
  - TypeScript support
  - Python support
  - ESLint
  - Prettier
  - Auto Rename Tag
  - Path IntelliSense

---

## Initial Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Zeref538/CafeSync.git
cd CafeSync
```

### Step 2: Install Dependencies

Install all dependencies for the project:

```bash
npm run install-all
```

This command installs dependencies for:
- Root project
- Backend server (Node.js)
- Frontend client (React)
- Firebase Functions
- AI services (Python)

#### Manual Installation (Alternative)

If the `install-all` script doesn't work, install dependencies manually:

```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install
cd ..

# Client dependencies
cd client
npm install
cd ..

# Functions dependencies
cd functions
npm install
cd ..

# Python dependencies (AI services)
cd ai-services
pip install -r requirements.txt
cd ..
```

### Step 3: Verify Installation

Check that all services can be accessed:

```bash
# Verify Node.js
node --version

# Verify Python
python --version

# Verify Firebase CLI
firebase --version

# Verify Git
git --version
```

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project `cafesync-3b25a`
3. Follow the setup wizard:
   - Enter project name: `cafesync-3b25a`
   - Enable Google Analytics (optional)
   - Accept terms and create project

### Step 2: Enable Firebase Services

#### Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Enable
   - **Google**: Enable (configure OAuth consent screen)
   - **Email Link (Passwordless)**: Enable

3. **Authorized domains**:
   - Add `localhost` for development
   - Add your production domain for deployment

#### Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose location (e.g., `us-central1`)
3. Start in **production mode** (rules will be configured later)

#### Storage

1. Go to **Storage** → **Get started**
2. Use default security rules for now
3. Choose location matching Firestore location

#### Hosting

1. Go to **Hosting** → **Get started**
2. Follow the setup wizard
3. Initialize hosting: `firebase init hosting`

### Step 3: Get Firebase Configuration

1. Go to **Project Settings** → **General**
2. Scroll to "Your apps" section
3. Click "Web app" icon (</>) or "Add app" if no web app exists
4. Register app with nickname (e.g., "CafeSync Web")
5. Copy the `firebaseConfig` object

### Step 4: Initialize Firebase in Project

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init
```

Select the following:
- **Firestore**: Yes
- **Functions**: Yes
- **Hosting**: Yes (select `client` as public directory)
- **Storage**: Yes
- **Emulators**: Yes (optional, for local development)

---

## Environment Configuration

### Root Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=cafesync-3b25a
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Server Configuration
PORT=5000
NODE_ENV=development

# AI Services
AI_SERVICE_PORT=8000
PYTHON_PATH=python

# Database
DATABASE_URL=your-firestore-url

# Google OAuth (Server-side)
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Client Environment Variables

Create `client/.env` file:

```env
# Firebase Configuration
REACT_APP_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_AUTH_DOMAIN=cafesync-3b25a.firebaseapp.com
REACT_APP_PROJECT_ID=cafesync-3b25a
REACT_APP_STORAGE_BUCKET=cafesync-3b25a.appspot.com
REACT_APP_MESSAGING_SENDER_ID=309088075415
REACT_APP_APP_ID=1:309088075415:web:XXXXXXXXXX
REACT_APP_MEASUREMENT_ID=G-XXXXXXXXXX

# Google OAuth (Client-side)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Backend URL
REACT_APP_SERVER_URL=http://localhost:5000

# Firebase Emulator (Development only)
REACT_APP_USE_FIREBASE_EMULATOR=false
```

**Note**: Replace placeholder values with actual Firebase configuration values from Step 3.

---

## Development Setup

### Starting Development Servers

#### Option 1: Start All Services (Recommended)

```bash
npm run dev
```

This starts:
- Backend server on port 5000
- Frontend client on port 3000
- AI services on port 8000

#### Option 2: Start Services Individually

**Terminal 1 - Backend Server:**
```bash
npm run server
# or
cd server
npm start
```

**Terminal 2 - Frontend Client:**
```bash
npm run client
# or
cd client
npm start
```

**Terminal 3 - AI Services:**
```bash
npm run ai
# or
cd ai-services
python app.py
```

### Access Points

Once all services are running:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **AI Services**: http://localhost:8000
- **AI Health Check**: http://localhost:8000/health

### VS Code Configuration

The project includes pre-configured VS Code settings:

**Launch Configurations:**
- Start All Services
- Start Backend Server
- Start React Client
- Start AI Services

**Tasks:**
Access via `Ctrl+Shift+P` → "Tasks: Run Task":
- Install All Dependencies
- Start Development Server
- Build Production

---

## Authentication Setup

### Google OAuth Configuration

#### Step 1: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `cafesync-3b25a`
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure:
   - User Type: **External** (for testing) or **Internal** (for organization)
   - App name: "CafeSync"
   - Support email: Your email
   - Authorized domains: Add your domain
   - Scopes: Add `email`, `profile`

#### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "CafeSync Web Client"
5. **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://cafesync-3b25a.web.app` (production)
6. **Authorized redirect URIs**:
   - `http://localhost:3000` (development)
   - `https://cafesync-3b25a.web.app` (production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

#### Step 3: Update Environment Variables

Add OAuth credentials to environment files:

**Root `.env`:**
```env
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**`client/.env`:**
```env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here
```

### Employee Management

#### Creating Employee Accounts

1. Sign in as a manager
2. Navigate to **Settings** → **Employee Management**
3. Click **Invite Employee**
4. Enter:
   - **Email**: Employee's work email
   - **Full Name**: Employee's full name
   - **Role**: Manager, Barista, Cashier, or Kitchen
   - **Password**: Strong password (8+ chars, uppercase, lowercase, number, special char)
5. Click **Create Account**

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Employee Sign-In

Employees can sign in using:
- **Email and Password** (if account created by manager)
- **Google Sign-in** (using work Google account)

---

## Firebase Emulators

Firebase Emulators allow local development without affecting production data.

### Starting Emulators

```bash
npm run dev:emulator
```

This starts:
- Firebase Emulators (Auth, Firestore, Storage, Functions)
- Backend server
- Frontend client (connected to emulators)

### Emulator Access Points

- **Emulator UI**: http://localhost:4000
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Storage Emulator**: http://localhost:9199
- **Functions Emulator**: http://localhost:5001

### Using Emulators Only

```bash
# Start emulators
npm run emulator

# In another terminal, start client with emulator mode
cd client
REACT_APP_USE_FIREBASE_EMULATOR=true npm start
```

### Emulator UI Features

Open http://localhost:4000 to:
- View and manage test users (Authentication tab)
- Browse and edit Firestore data
- Upload test files (Storage tab)
- View function logs and test functions

---

## Deployment

### Frontend Deployment (Firebase Hosting)

#### Build the Application

```bash
cd client
npm run build
```

This creates optimized production files in `client/build/`.

#### Deploy to Firebase Hosting

```bash
# From project root
firebase deploy --only hosting
```

Or deploy both hosting and functions:

```bash
firebase deploy --only hosting,functions
```

**Deployed URL**: https://cafesync-3b25a.web.app

### Backend Deployment (Cloud Run)

The backend is deployed to Google Cloud Run. There are two deployment methods:

#### Method 1: Firebase Functions (Recommended)

```bash
firebase deploy --only functions
```

This deploys Firebase Functions v2 directly, which runs on Cloud Run automatically.

**Function URL**: https://api-rr3ogyefda-uc.a.run.app

#### Method 2: Direct Cloud Run Deployment

**Prerequisites:**
- Install Google Cloud SDK
- Authenticate: `gcloud auth login`
- Set project: `gcloud config set project cafesync-3b25a`

**Deploy:**
```bash
gcloud run deploy api --source functions --region us-central1 --allow-unauthenticated
```

**Alternative: Using PowerShell Script**

Use the provided `deploy-functions.ps1` script:

```powershell
.\deploy-functions.ps1
```

This script:
- Checks for `gcloud` CLI
- Authenticates if needed
- Sets the project
- Deploys the functions

### Deployment Verification

After deployment, verify the services:

1. **Frontend**: Visit https://cafesync-3b25a.web.app
2. **Backend API**: Test health endpoint:
   ```bash
   curl https://api-rr3ogyefda-uc.a.run.app/api/health
   ```

### Environment Variables for Production

Update production environment variables:

**Client Production Build:**
- Set `REACT_APP_SERVER_URL` to production API URL
- Set `REACT_APP_USE_FIREBASE_EMULATOR=false`
- Use production Firebase configuration

**Backend Production:**
- Set `NODE_ENV=production`
- Configure production Firebase credentials
- Set proper CORS origins

---

## Troubleshooting

### Common Issues

#### Port Already in Use

**Windows:**
```powershell
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

**Using npm package:**
```bash
npx kill-port 3000 5000 8000
```

#### Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For specific directory
cd client
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Compilation Errors

```bash
# Clear build cache
cd client
rm -rf build
npm start

# Restart TypeScript server in VS Code
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

#### Python Dependencies Issues

```bash
cd ai-services
pip install -r requirements.txt

# If permission errors, use:
pip install --user -r requirements.txt
```

#### Firebase Connection Issues

1. **Check `.env` files exist and have correct values**
2. **Verify Firebase project is configured correctly**
3. **Check Firebase CLI is logged in**: `firebase login`
4. **Verify project is set**: `firebase use cafesync-3b25a`

#### Authentication Errors

1. **Check OAuth credentials** in Google Cloud Console
2. **Verify authorized domains** in Firebase Console
3. **Check redirect URIs** match exactly
4. **Ensure OAuth consent screen** is configured

#### Build Errors

```bash
# Clear all build artifacts
cd client
rm -rf build node_modules package-lock.json
npm install
npm run build
```

#### Deployment Errors

**Firebase Deployment:**
```bash
# Check Firebase CLI version
firebase --version

# Verify login
firebase login

# Check project
firebase projects:list

# Set correct project
firebase use cafesync-3b25a
```

**Cloud Run Deployment:**
```bash
# Verify gcloud is installed
gcloud --version

# Check authentication
gcloud auth list

# Verify project
gcloud config get-value project

# Check service status
gcloud run services list
```

### File Structure

```
CafeSync/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── utils/         # Utility functions
│   │   └── App.tsx
│   ├── public/            # Public assets
│   ├── build/             # Production build
│   └── package.json
├── server/                 # Express backend (development)
│   ├── routes/            # API routes
│   ├── data/              # Local data storage
│   └── package.json
├── functions/              # Firebase Functions (production backend)
│   ├── index.js           # Main functions file
│   ├── server.js          # Cloud Run wrapper
│   ├── package.json
│   └── Dockerfile
├── ai-services/           # Python AI services
│   ├── app.py
│   ├── requirements.txt
│   └── models/            # ML models
├── .env                    # Root environment variables
├── .gitignore
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase project settings
└── package.json           # Root package.json
```

### Getting Help

If you encounter issues:

1. **Check console logs** in browser (F12) and terminal
2. **Verify all services are running** on correct ports
3. **Check environment variables** are set correctly
4. **Review Firebase Console** for configuration issues
5. **Check this guide** for common solutions
6. **Review error messages** carefully for specific issues

### Testing the Application

After setup, test the following:

1. **Frontend Access**: http://localhost:3000
2. **Login**: Use demo credentials or create new account
3. **Dashboard**: Verify data loads correctly
4. **Order Management**: Test order creation and updates
5. **Inventory**: Test inventory management features
6. **Analytics**: Verify analytics data displays
7. **Settings**: Test configuration changes

### Demo Accounts

For testing purposes, you can create demo accounts:

- **Manager**: Full access to all features
- **Barista**: Orders, Inventory, Loyalty access
- **Cashier**: Orders and Loyalty access
- **Kitchen**: Orders and Inventory access

---

## Additional Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Google Cloud Console**: https://console.cloud.google.com/
- **React Documentation**: https://react.dev/
- **Material-UI Documentation**: https://mui.com/
- **Firebase Emulators**: https://firebase.google.com/docs/emulator-suite

---

*This guide covers the complete setup process for CafeSync. For specific feature documentation, refer to the main README.md or feature-specific documentation files.*

