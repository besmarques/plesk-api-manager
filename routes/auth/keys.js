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
const secretKeySchema = Joi.object({
	ip: Joi.string().ip().optional(),
	ips: Joi.array().items(Joi.string().ip()).optional(),
	login: Joi.string().optional(),
	description: Joi.string().optional(),
});

/**
 * POST /api/auth/keys
 * Generate a secret key
 */
router.post('/keys', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = secretKeySchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.generateSecretKey(value);
		if (result.success) {
			res.status(201).json({
				success: true,
				data: result.data,
				message: 'Secret key generated successfully',
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
 * DELETE /api/auth/keys/:key
 * Delete a secret key
 */
router.delete('/keys/:key', checkPleskClient, async (req, res) => {
	try {
		const { key } = req.params;
		const result = await pleskClient.deleteSecretKey(key);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Secret key ${key} deleted successfully`,
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
