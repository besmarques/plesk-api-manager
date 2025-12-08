const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load all routes through the route manager middleware
try {
	const routeManager = require('./routes');
	app.use('/', routeManager);
	console.log('✓ All routes loaded successfully through route manager');
} catch (error) {
	console.error('Failed to load route manager:', error.message);
	// Create fallback routes for all endpoints
	app.use('/api/*', (req, res) => {
		res.status(500).json({
			success: false,
			error: 'Route manager failed to load',
			message: 'Check server configuration and try again',
			endpoint: req.originalUrl,
		});
	});
}

// Health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'OK',
		message: 'Plesk API Manager is running',
		timestamp: new Date().toISOString(),
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		error: 'Something went wrong!',
		message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
	});
});

// 404 handler
app.use('*', (req, res) => {
	res.status(404).json({
		error: 'Route not found',
	});
});

// Start server
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	console.log(`Health check: http://${process.env.HOST || 'localhost'}:${PORT}/health`);
	console.log(`Plesk API endpoints: http://${process.env.HOST || 'localhost'}:${PORT}/api/plesk`);
});
