require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/license');
const leaksRoutes = require('./routes/leaks');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const { initializeDatabase } = require('./database/db');
const { securityHeaders } = require('./middleware/security');

const app = express();

// Initialize database
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict limit for auth
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

app.use(limiter);

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/leaks', leaksRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Fast Mog server running on port ${PORT}`);
  console.log(`📝 Admin key: fastmog-larpik`);
  console.log(`🔗 Visit: http://localhost:${PORT}\n`);
});
