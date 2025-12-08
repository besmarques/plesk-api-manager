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
const extensionInstallSchema = Joi.object({
	id: Joi.string().optional(),
	url: Joi.string().uri().optional(),
	file: Joi.string().optional(),
}).xor('id', 'url', 'file'); // Exactly one of these should be provided

/**
 * GET /api/extensions
 * List installed extensions
 */
router.get('/', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.listExtensions();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Extensions retrieved successfully',
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
 * POST /api/extensions
 * Install a new extension
 */
router.post('/', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = extensionInstallSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.installExtension(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Extension installed successfully',
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
 * GET /api/extensions/:id
 * Get extension details
 */
router.get('/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pleskClient.getExtension(id);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Extension ${id} details retrieved successfully`,
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
 * DELETE /api/extensions/:id
 * Delete an extension
 */
router.delete('/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pleskClient.deleteExtension(id);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Extension ${id} deleted successfully`,
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
 * PUT /api/extensions/:id/enable
 * Enable extension
 */
router.put('/:id/enable', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pleskClient.enableExtension(id);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Extension ${id} enabled successfully`,
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
 * PUT /api/extensions/:id/disable
 * Disable extension
 */
router.put('/:id/disable', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pleskClient.disableExtension(id);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Extension ${id} disabled successfully`,
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
