# CafeSync Setup Guide for VS Code

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** with recommended extensions

### 1. Install Dependencies

Open VS Code terminal and run:
```bash
npm run install-all
```

This will install dependencies for:
- Root project
- Backend server (Node.js)
- Frontend client (React)
- AI services (Python)

### 2. Start Development Servers

#### Option A: Start All Services at Once
```bash
npm run dev
```

#### Option B: Start Services Individually
```bash
# Terminal 1 - Backend Server
npm run server

# Terminal 2 - Frontend Client  
npm run client

# Terminal 3 - AI Services
npm run ai
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Services**: http://localhost:8000

## 🛠️ VS Code Configuration

### Launch Configurations
The project includes pre-configured launch configurations:

1. **Start All Services** - Launches all three services
2. **Start Backend Server** - Node.js server only
3. **Start React Client** - Frontend only
4. **Start AI Services** - Python Flask app only
5. **Launch All Services** - Compound configuration

### Tasks
Use `Ctrl+Shift+P` → "Tasks: Run Task" to access:
- Install All Dependencies
- Start Development Server
- Start Backend Only
- Start Frontend Only
- Start AI Services Only
- Build Production

### Recommended Extensions
The project includes an `extensions.json` file with recommended extensions:
- TypeScript support
- Python support
- ESLint
- Prettier
- Auto Rename Tag
- Path IntelliSense

## 📁 Project Structure

```
CafeSync/
├── .vscode/                 # VS Code configuration
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── App.tsx
│   └── package.json
├── server/                  # Node.js backend
│   ├── routes/             # API routes
│   ├── index.js
│   └── package.json
├── ai-services/            # Python AI services
│   ├── app.py
│   ├── requirements.txt
│   └── models/             # ML models (auto-created)
├── package.json            # Root package.json
└── README.md
```

## 🔧 Development Workflow

### 1. First Time Setup
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd CafeSync

# Install all dependencies
npm run install-all

# Start all services
npm run dev
```

### 2. Daily Development
```bash
# Start all services
npm run dev

# Or use VS Code tasks:
# Ctrl+Shift+P → "Tasks: Run Task" → "Start Development Server"
```

### 3. Debugging
- Use VS Code's built-in debugger
- Set breakpoints in TypeScript, JavaScript, or Python files
- Use the launch configurations for debugging specific services

## 🌐 Access Points

### Frontend (React App)
- **URL**: http://localhost:3000
- **Features**: Full UI, authentication, real-time updates
- **Demo Accounts**:
  - Manager: `manager@cafesync.com` / `password`
  - Barista: `barista@cafesync.com` / `password`
  - Kitchen: `kitchen@cafesync.com` / `password`

### Backend API
- **URL**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **Features**: REST API, WebSocket server, data management

### AI Services
- **URL**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Features**: ML models, predictions, recommendations

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill processes on specific ports
   npx kill-port 3000 5000 8000
   ```

2. **Python Dependencies Issues**
   ```bash
   cd ai-services
   pip install -r requirements.txt
   ```

3. **Node Modules Issues**
   ```bash
   # Clear cache and reinstall
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **TypeScript Errors**
   - Check if all dependencies are installed
   - Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Environment Variables
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# AI Services
AI_SERVICE_PORT=8000

# Weather API (optional)
WEATHER_API_KEY=your-weather-api-key

# Calendar API (optional)
CALENDAR_API_KEY=your-calendar-api-key
```

## 📱 Testing the Application

1. **Open Frontend**: http://localhost:3000
2. **Login** with demo credentials
3. **Navigate** through different sections:
   - Dashboard
   - Orders
   - Inventory
   - Analytics
   - Loyalty
   - Settings
4. **Test Station Views**:
   - Front Counter
   - Kitchen
   - Management

## 🚀 Production Deployment

```bash
# Build for production
npm run build

# The built files will be in client/build/
```

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all services are running
3. Check port availability
4. Ensure all dependencies are installed

Happy coding! ☕️


