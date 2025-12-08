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
const ftpUserSchema = Joi.object({
	name: Joi.string().required(),
	password: Joi.string().min(6).required(),
	home: Joi.string().optional().default('/httpdocs'),
	quota: Joi.number().integer().optional().default(-1),
	permissions: Joi.object({
		read: Joi.string().valid('true', 'false').optional(),
		write: Joi.string().valid('true', 'false').optional(),
	}).optional(),
	parent_domain: Joi.object({
		id: Joi.number().integer().optional(),
		name: Joi.string().optional(),
		guid: Joi.string().optional(),
	}).required(),
});

const ftpUserUpdateSchema = Joi.object({
	name: Joi.string().optional(),
	password: Joi.string().min(6).optional(),
	home: Joi.string().optional(),
	quota: Joi.number().integer().optional(),
	permissions: Joi.object({
		read: Joi.string().valid('true', 'false').optional(),
		write: Joi.string().valid('true', 'false').optional(),
	}).optional(),
});

/**
 * GET /api/ftpusers
 * Get FTP users
 */
router.get('/', checkPleskClient, async (req, res) => {
	try {
		const { name, domain } = req.query;
		const filters = {};
		if (name) filters.name = name;
		if (domain) filters.domain = domain;

		const result = await pleskClient.getFtpUsers(filters);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'FTP users retrieved successfully',
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
 * POST /api/ftpusers
 * Create FTP user
 */
router.post('/', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = ftpUserSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createFtpUser(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `FTP user ${value.name} created successfully`,
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
 * PUT /api/ftpusers/:name
 * Update FTP user
 */
router.put('/:name', checkPleskClient, async (req, res) => {
	try {
		const { name } = req.params;
		const { error, value } = ftpUserUpdateSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.updateFtpUser(name, value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `FTP user ${name} updated successfully`,
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
 * DELETE /api/ftpusers/:name
 * Delete FTP user
 */
router.delete('/:name', checkPleskClient, async (req, res) => {
	try {
		const { name } = req.params;
		const result = await pleskClient.deleteFtpUser(name);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `FTP user ${name} deleted successfully`,
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
