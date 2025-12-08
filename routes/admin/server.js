const express = require('express');
const Joi = require('joi');
const PleskAPIClient = require('../../lib/pleskClient');

const router = express.Router();

// Initialize Plesk client
let pleskClient;
try {
	pleskClient = new PleskAPIClient();
} catch (error) {
	console.error('Failed to initialize Plesk client:', error.message);
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

// Validation schemas
const adminSchema = Joi.object({
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	company: Joi.string().optional(),
	phone: Joi.string().optional(),
	fax: Joi.string().optional(),
	address: Joi.string().optional(),
	city: Joi.string().optional(),
	state: Joi.string().optional(),
	post_code: Joi.string().optional(),
	country: Joi.string().length(2).optional(),
	send_announce: Joi.boolean().optional().default(false),
	locale: Joi.string().optional().default('en-US'),
	multiple_sessions: Joi.boolean().optional().default(false),
});

const serverInitSchema = Joi.object({
	admin: adminSchema.required(),
	password: Joi.string().min(6).required(),
	server_name: Joi.string().required(),
});

const serverLicenseSchema = Joi.object({
	key: Joi.string().required(),
	code: Joi.string().optional(),
	additional: Joi.boolean().optional().default(false),
});

/**
 * GET /api/server
 * Get server meta information
 */
router.get('/', checkPleskClient, async (req, res) => {
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
 * POST /api/server/init
 * Perform initial server setup
 */
router.post('/init', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = serverInitSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.initializeServer(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Server initialization completed successfully',
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
 * POST /api/server/license
 * Install license key
 */
router.post('/license', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = serverLicenseSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.installLicense(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'License installed successfully',
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
 * GET /api/server/ips
 * Get server IP addresses
 */
router.get('/ips', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.getServerIps();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Server IP addresses retrieved successfully',
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

module.exports = router;
