const express = require('express');
const PleskAPIClient = require('../../lib/pleskClient');

const router = express.Router();

// Initialize Plesk client
let pleskClient;
try {
	pleskClient = new PleskAPIClient();
	console.log('Plesk client initialized for server-info module');
} catch (error) {
	console.error('Failed to initialize Plesk client for server-info:', error.message);
}

// Middleware to check if Plesk client is available
const checkPleskClient = (req, res, next) => {
	if (!pleskClient) {
		return res.status(500).json({
			error: 'Plesk client not configured. Please check your environment variables.',
		});
	}
	next();
};

/**
 * GET /api/plesk/server/info
 * Get server information
 */
router.get('/info', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.getServerInfo();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Server information retrieved successfully',
			});
		} else {
			res.status(result.status || 500).json({
				success: false,
				error: result.error,
				details: result.details,
			});
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/plesk/server/test
 * Test Plesk REST API connectivity
 */
router.post('/test', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.getServerInfo();
		res.json({
			success: true,
			message: 'Plesk REST API connection test successful',
			pleskConnected: result.success,
			timestamp: new Date().toISOString(),
			serverInfo: result.success ? result.data : null,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Plesk REST API connection test failed',
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
});

module.exports = router;
