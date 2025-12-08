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
const cliCallSchema = Joi.object({
	params: Joi.array().items(Joi.string()).optional(),
	env: Joi.object().optional(),
});

/**
 * GET /api/cli/commands
 * List available CLI commands
 */
router.get('/commands', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.listCliCommands();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'CLI commands retrieved successfully',
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
 * GET /api/cli/:id/ref
 * Get command reference
 */
router.get('/:id/ref', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pleskClient.getCliCommandRef(id);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Command reference for ${id} retrieved successfully`,
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
 * POST /api/cli/:id/call
 * Execute CLI command
 */
router.post('/:id/call', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const { error, value } = cliCallSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.executeCliCommand(id, value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Command ${id} executed successfully`,
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
