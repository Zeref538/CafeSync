# Deployment Guide for CaféSync

## Quick Deploy

### Prerequisites

1. Firebase CLI installed and logged in
2. Node.js and npm installed
3. Production environment variables configured

### Step 1: Configure Environment Variables

Create a `.env.production` file in the `client` directory with:

```env
REACT_APP_API_KEY=your-firebase-api-key
REACT_APP_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_PROJECT_ID=your-project-id
REACT_APP_STORAGE_BUCKET=your-project-id.firebasestorage.app
REACT_APP_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_APP_ID=your-app-id
REACT_APP_MEASUREMENT_ID=your-measurement-id
REACT_APP_SERVER_URL=https://us-central1-your-project-id.cloudfunctions.net
REACT_APP_USE_FIREBASE_EMULATOR=false
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 2: Build the Production App

```bash
cd client
npm install
npm run build
```

### Step 3: Deploy to Firebase

```bash
firebase deploy --only hosting
```

### Step 4: Verify Deployment

Visit: https://cafesync-3b25a.web.app

## What Was Fixed

### Problem

- All API calls were hardcoded to `localhost:5000`
- Deployed app couldn't connect to backend
- Network errors in browser console

### Solution

- Created centralized API configuration (`client/src/config/api.ts`)
- Environment-aware endpoint selection
- Development uses localhost, production uses Firebase Functions

### Files Changed

1. Created `client/src/config/api.ts` - Centralized API configuration
2. Updated 11 client files to use the new API config:
   - Dashboard, Analytics, Inventory
   - FrontCounter, Kitchen, Management
   - Orders, Weather, Charts, Alerts, Menu

## Backend Configuration

### Option 1: Use Firebase Functions

The app now automatically detects the environment and uses Firebase Functions in production.

### Option 2: Deploy Custom Backend

If you want to use your Express server in production:

1. Deploy it to Cloud Run, Heroku, or another platform
2. Update `.env.production`:
   ```env
   REACT_APP_SERVER_URL=https://your-backend-url.com
   ```
3. Rebuild and redeploy

### Option 3: Keep Localhost (Development Only)

For local development, the app uses `http://localhost:5000` automatically.

## Testing After Deployment

1. ✅ Open https://cafesync-3b25a.web.app/dashboard
2. ✅ Check browser console for errors (F12)
3. ✅ Verify data loading
4. ✅ Test authentication
5. ✅ Test order creation
6. ✅ Test inventory updates

## Troubleshooting

### "Failed to fetch" errors

- Check that backend/Firebase Functions are deployed
- Verify `REACT_APP_SERVER_URL` is correct
- Check CORS configuration

### CORS errors

- Firebase Functions already have CORS enabled
- If using custom backend, ensure CORS is configured

### Authentication not working

- Check Firebase Console → Authentication → Authorized domains
- Ensure `cafesync-3b25a.web.app` is listed

### Data not loading

- Check Firestore rules in Firebase Console
- Verify database has data
- Check Firestore indexes

## Firestore Security Rules

Current rules allow all operations (development mode):

```javascript
match /{document=**} {
  allow read, write: if true;
}
```

**For production**, you should update `firestore.rules` with proper security rules and deploy:

```bash
firebase deploy --only firestore:rules
```

## Next Steps

1. Implement proper Firestore security rules
2. Deploy remaining Firebase Functions (Orders, Analytics, Inventory)
3. Configure WebSocket support for real-time updates in production
4. Set up monitoring and error tracking (Firebase Crashlytics)
