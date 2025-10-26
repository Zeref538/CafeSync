# 🚀 CafeSync - Team Setup Guide

## 📋 Prerequisites

Before setting up CafeSync, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

## 🔧 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/Zeref538/CafeSync.git
cd CafeSync
```

### 2. Install Dependencies

#### Install Root Dependencies

```bash
npm install
```

#### Install Server Dependencies

```bash
cd server
npm install
cd ..
```

#### Install Client Dependencies

```bash
cd client
npm install
cd ..
```

#### Install Functions Dependencies (Optional)

```bash
cd functions
npm install
cd ..
```

### 3. Environment Setup

#### Copy Environment Template

```bash
cp env.example .env
```

#### Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
REACT_APP_SERVER_URL=http://localhost:5000

# Firebase Configuration (Optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

## 🚀 Running the Application

### Option 1: Run Both Server and Client (Recommended)

#### Terminal 1 - Start Server

```bash
cd server
npm start
```

#### Terminal 2 - Start Client

```bash
cd client
npm start
```

### Option 2: Run Individual Services

#### Server Only

```bash
cd server
npm start
```

Server will run on: `http://localhost:5000`

#### Client Only

```bash
cd client
npm start
```

Client will run on: `http://localhost:3000`

## 📱 Application Access

Once both services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🔍 Testing the Inventory System

### 1. Access Inventory Page

Navigate to: `http://localhost:3000/inventory`

### 2. Test API Endpoints

```bash
# Get all inventory items
curl http://localhost:5000/api/inventory

# Get low stock alerts
curl http://localhost:5000/api/inventory/alerts/low-stock

# Update stock (example)
curl -X PATCH http://localhost:5000/api/inventory/milk-whole-1/stock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5, "operation": "subtract", "reason": "Used for orders"}'
```

### 3. Test Order Integration

```bash
# Create an order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name": "Test Customer", "phone": "123-456-7890"},
    "items": [{"name": "Latte", "quantity": 2, "price": 4.50}],
    "station": "front-counter",
    "paymentMethod": "cash"
  }'

# Complete the order (replace ORDER_ID with actual ID)
curl -X PATCH http://localhost:5000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Kill processes using ports 3000 and 5000
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

#### 2. Node Modules Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript Compilation Errors

```bash
# Clear build cache
cd client
rm -rf build
npm start
```

#### 4. Firebase Connection Issues

- Check if `.env` file exists and has correct Firebase credentials
- Ensure Firebase project is properly configured
- The app works without Firebase (uses local storage as fallback)

### File Structure

```
CafeSync/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── routes/            # API routes
│   ├── data/              # Local data storage
│   └── package.json
├── functions/              # Firebase functions (optional)
├── ai-services/           # AI service integration
├── .env                   # Environment variables
├── .gitignore
└── README.md
```

## 📊 Features Available

### ✅ Working Features

- **Inventory Management**: Full CRUD operations
- **Real-time Updates**: Socket.io integration
- **Order Processing**: Complete order lifecycle
- **Automatic Stock Deduction**: When orders are completed
- **Low Stock Alerts**: Dashboard notifications
- **User Authentication**: Role-based access
- **Dashboard Analytics**: Sales and performance metrics

### 🔧 API Endpoints

#### Inventory

- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get specific item
- `PATCH /api/inventory/:id/stock` - Update stock levels
- `GET /api/inventory/alerts/low-stock` - Get low stock alerts
- `POST /api/inventory` - Create new inventory item

#### Orders

- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status

#### Analytics

- `GET /api/analytics/dashboard` - Get dashboard data
- `GET /api/analytics/sales` - Get sales analytics

## 🆘 Getting Help

If you encounter any issues:

1. **Check the logs** in both terminal windows
2. **Verify all dependencies** are installed correctly
3. **Ensure ports 3000 and 5000** are available
4. **Check the `.env` file** configuration
5. **Review this guide** for common solutions

## 📝 Development Notes

- The application uses **mock data** by default (no database required)
- **Firebase integration** is optional but recommended for production
- **Real-time updates** work via Socket.io
- **Inventory system** automatically deducts stock when orders are completed
- **TypeScript** is used for type safety

## 🎯 Next Steps

1. **Test all features** to ensure everything works
2. **Customize inventory items** for your specific needs
3. **Configure Firebase** for production deployment
4. **Set up CI/CD** for automated deployments
5. **Add more menu items** and inventory mappings

---

**Happy Coding! 🚀**

For questions or issues, please create an issue in the GitHub repository.
