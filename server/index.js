const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
// const { initializeFirebaseAdmin } = require('./firebase');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize Firebase Admin (if env vars provided)
// initializeFirebaseAdmin();

// Import routes
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const loyaltyRoutes = require('./routes/loyalty');
const weatherRoutes = require('./routes/weather');
const menuRoutes = require('./routes/menu');

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/menu', menuRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CafeSync Server'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room for specific station
  socket.on('join-station', (station) => {
    socket.join(station);
    console.log(`Client ${socket.id} joined station: ${station}`);
  });

  // Handle order updates
  socket.on('order-update', (data) => {
    // Broadcast to all clients in the same station
    socket.to(data.station).emit('order-update', data);
    
    // Also broadcast to kitchen station if order is from front-counter
    if (data.station === 'front-counter') {
      socket.to('kitchen').emit('order-update', data);
    }
    
    console.log('Order update broadcasted:', data);
  });

  // Handle inventory updates
  socket.on('inventory-update', (data) => {
    socket.broadcast.emit('inventory-update', data);
    console.log('Inventory update broadcasted:', data);
  });

  // Handle analytics updates
  socket.on('analytics-update', (data) => {
    socket.broadcast.emit('analytics-update', data);
    console.log('Analytics update broadcasted:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 CafeSync Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket server ready for connections`);
});

module.exports = { app, io };
