# Firebase Emulator Setup Guide

## 🔥 What are Firebase Emulators?

Firebase Emulators allow you to develop and test your app locally **without touching production data**. They simulate Firebase services on your local machine.

### **Benefits:**

- ✅ **Free** - No charges for development
- ✅ **Fast** - No network latency
- ✅ **Safe** - Won't affect production data
- ✅ **Offline** - Work without internet
- ✅ **Test Data** - Create/delete test data freely

---

## 📦 Installation

### **1. Install Firebase CLI**

```bash
npm install -g firebase-tools
```

### **2. Login to Firebase**

```bash
firebase login
```

### **3. Verify Installation**

```bash
firebase --version
```

---

## ⚙️ Configuration

Your CafeSync project is already configured! Here's what was added:

### **Root `firebase.json`:**

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### **Client `firebase.json`:**

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

---

## 🚀 Usage

### **Method 1: Development with Emulators (Recommended)**

```bash
npm run dev:emulator
```

This starts:

- 🔥 Firebase Emulators
- 🖥️ Backend Server (port 5000)
- ⚛️ React Client (port 3000) **connected to emulators**

### **Method 2: Emulators Only**

```bash
npm run emulator
```

Then in another terminal:

```bash
npm run client:emulator
```

### **Method 3: Production Mode (Default)**

```bash
npm run dev
```

Uses production Firebase (no emulators).

---

## 🌐 Access Points

Once emulators are running:

| Service         | URL                   | Description                        |
| --------------- | --------------------- | ---------------------------------- |
| **Emulator UI** | http://localhost:4000 | Visual dashboard for all emulators |
| **Auth**        | http://localhost:9099 | Authentication emulator            |
| **Firestore**   | http://localhost:8080 | Database emulator                  |
| **Storage**     | http://localhost:9199 | File storage emulator              |
| **Functions**   | http://localhost:5001 | Cloud functions emulator           |
| **Your App**    | http://localhost:3000 | React app (connected to emulators) |

---

## 🎮 Emulator UI Features

Open **http://localhost:4000** to access the Firebase Emulator Suite UI:

### **1. Authentication Tab**

- View all test users
- Create test accounts
- Generate custom tokens
- Test sign-in flows

### **2. Firestore Tab**

- Browse collections and documents
- Add/edit/delete data
- Query data
- View real-time updates

### **3. Storage Tab**

- Upload test files
- View file metadata
- Download files
- Delete test data

### **4. Functions Tab**

- View function logs
- Trigger functions manually
- Monitor function performance

---

## 💾 Data Persistence

### **Export Emulator Data (Save Test Data)**

```bash
npm run emulator:export
```

Saves all emulator data to `./emulator-data/` folder:

- Authentication users
- Firestore documents
- Storage files

### **Import Emulator Data (Load Saved Data)**

```bash
npm run emulator:import
```

Loads previously exported data from `./emulator-data/`.

**Use Case:**

- Save test employee accounts
- Share test data with team
- Quickly reset to known state

---

## 🧪 Testing Workflow

### **Step 1: Start Emulators**

```bash
npm run dev:emulator
```

### **Step 2: Create Test Data**

```
1. Open http://localhost:4000
2. Go to Authentication tab
3. Add test users:
   - test-manager@cafesync.com
   - test-barista@cafesync.com
   - test-kitchen@cafesync.com
```

### **Step 3: Add to Employee Whitelist**

```
1. Sign in as manager (demo account)
2. Go to Settings → Employee Invitation
3. Add the test emails you created
```

### **Step 4: Test Authentication**

```
1. Go to http://localhost:3000/login
2. Try Google Sign-in (uses emulator)
3. Try Email & Password with test accounts
```

### **Step 5: Export Your Test Data**

```bash
# Save your test setup
npm run emulator:export
```

Now you can always return to this state!

---

## 🔧 Client Environment Setup

### **For Production (Default):**

`client/.env`:

```env
REACT_APP_USE_FIREBASE_EMULATOR=false
```

### **For Emulator Mode:**

`client/.env`:

```env
REACT_APP_USE_FIREBASE_EMULATOR=true
```

Or use the npm script:

```bash
npm run client:emulator  # Automatically sets emulator flag
```

---

## 🐛 Troubleshooting

### **Port Already in Use**

```bash
# Kill process on specific port
npx kill-port 4000
npx kill-port 9099
```

### **Emulators Won't Start**

```bash
# Clear Firebase cache
firebase emulators:kill
rm -rf .firebase
npm run emulator
```

### **Data Not Persisting**

Make sure you're exporting before stopping emulators:

```bash
npm run emulator:export
```

### **App Not Connecting to Emulators**

Check console logs:

```javascript
// Should see:
🔧 Connecting to Firebase Emulators...
✅ Connected to Firebase Emulators
   - Auth: http://localhost:9099
   - Firestore: http://localhost:8080
   - Storage: http://localhost:9199
   - UI: http://localhost:4000
```

If not, verify:

1. `REACT_APP_USE_FIREBASE_EMULATOR=true` in `.env`
2. Emulators are running (`npm run emulator`)
3. Restart your React app

---

## 🎯 Best Practices

### **1. Development Workflow**

```bash
# Always use emulators for development
npm run dev:emulator
```

### **2. Before Deploying**

```bash
# Test with production Firebase first
npm run dev
```

### **3. Team Collaboration**

```bash
# Share test data with team
npm run emulator:export
git add emulator-data/
git commit -m "Add test data"
```

### **4. Continuous Integration**

```bash
# Run tests against emulators in CI
firebase emulators:exec "npm test"
```

---

## 📊 Emulator Ports Reference

| Service     | Port | Usage               |
| ----------- | ---- | ------------------- |
| Emulator UI | 4000 | Dashboard           |
| Auth        | 9099 | User authentication |
| Firestore   | 8080 | Database            |
| Storage     | 9199 | File storage        |
| Functions   | 5001 | Cloud functions     |
| Client      | 3000 | React app           |
| Server      | 5000 | Node.js backend     |
| AI          | 8000 | Python AI services  |

---

## 🔐 Security Rules Testing

### **Test Firestore Rules**

```bash
firebase emulators:exec "npm run test:rules"
```

### **View Rules in Emulator UI**

1. Open http://localhost:4000
2. Go to Firestore tab
3. Click "Rules" button
4. Edit and test rules instantly

---

## 💡 Pro Tips

### **1. Quick Reset**

```bash
# Stop emulators (Ctrl+C)
# Start fresh (no data)
npm run emulator
```

### **2. Pre-populate Data**

```bash
# Always start with saved data
npm run emulator:import
```

### **3. Debug Auth Issues**

```
1. Open http://localhost:4000
2. Go to Authentication tab
3. View all sign-in attempts
4. Check error messages
```

### **4. Monitor Real-time Updates**

```
1. Open http://localhost:4000
2. Go to Firestore tab
3. Watch documents update in real-time
4. See your app's database queries
```

### **5. Test Without Internet**

```bash
# Emulators work offline!
npm run dev:emulator

# Your app works completely offline
```

---

## 📝 Common Commands

```bash
# Start everything with emulators
npm run dev:emulator

# Start only emulators
npm run emulator

# Start client with emulator connection
npm run client:emulator

# Export emulator data
npm run emulator:export

# Import saved data
npm run emulator:import

# Kill all emulators
firebase emulators:kill

# View emulator logs
firebase emulators:start --debug
```

---

## 🎓 Learning Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Connect Your App](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)
- [Emulator UI Guide](https://firebase.google.com/docs/emulator-suite/install_and_configure)

---

## ✅ Quick Start Checklist

- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Start emulators: `npm run dev:emulator`
- [ ] Open Emulator UI: http://localhost:4000
- [ ] Create test users in Auth tab
- [ ] Add users to employee whitelist
- [ ] Test sign-in flows
- [ ] Export test data: `npm run emulator:export`

## 🚨 Fixed Issues

### **Storage Emulator Error**

If you see "Cannot start the Storage emulator without rules file", the issue has been fixed by adding:

- `firestore.rules` - Basic Firestore security rules
- `storage.rules` - Basic Storage security rules
- `firestore.indexes.json` - Firestore indexes configuration

These files are now included in your project and the emulators should start without errors.

---

**Happy Local Development! 🚀**

Your CafeSync app is now ready for safe, fast, offline development with Firebase Emulators!
