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
const databaseSchema = Joi.object({
	name: Joi.string().required(),
	type: Joi.string().valid('mysql', 'postgresql', 'mssql').required(),
	parent_domain: Joi.object({
		id: Joi.number().integer().optional(),
		name: Joi.string().optional(),
		guid: Joi.string().optional(),
	}).required(),
	server_id: Joi.number().integer().optional(),
});

const databaseUserSchema = Joi.object({
	login: Joi.string().required(),
	password: Joi.string().min(6).required(),
	parent_domain: Joi.object({
		id: Joi.number().integer().optional(),
		name: Joi.string().optional(),
		guid: Joi.string().optional(),
	}).required(),
	server_id: Joi.number().integer().optional(),
	database_id: Joi.number().integer().optional(),
});

const databaseUserUpdateSchema = Joi.object({
	login: Joi.string().optional(),
	password: Joi.string().min(6).optional(),
});

/**
 * GET /api/databases
 * Get databases
 */
router.get('/', checkPleskClient, async (req, res) => {
	try {
		const { domain } = req.query;
		const result = await pleskClient.getDatabases(domain);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Databases retrieved successfully',
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
 * POST /api/databases
 * Create database
 */
router.post('/', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = databaseSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createDatabase(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Database ${value.name} created successfully`,
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
 * DELETE /api/databases/:id
 * Delete database
 */
router.delete('/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const dbId = parseInt(id);
		if (isNaN(dbId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid database ID. Must be a number.',
			});
		}

		const result = await pleskClient.deleteDatabase(dbId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Database ${dbId} deleted successfully`,
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
 * GET /api/databases/users
 * Get database users
 */
router.get('/users', checkPleskClient, async (req, res) => {
	try {
		const { dbId } = req.query;
		const dbIdNumber = dbId ? parseInt(dbId) : null;

		if (dbId && isNaN(dbIdNumber)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid database ID. Must be a number.',
			});
		}

		const result = await pleskClient.getDatabaseUsers(dbIdNumber);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Database users retrieved successfully',
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
 * POST /api/databases/users
 * Create database user
 */
router.post('/users', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = databaseUserSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createDatabaseUser(value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Database user ${value.login} created successfully`,
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
 * PUT /api/databases/users/:id
 * Update database user
 */
router.put('/users/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = parseInt(id);
		if (isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid user ID. Must be a number.',
			});
		}

		const { error, value } = databaseUserUpdateSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.updateDatabaseUser(userId, value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Database user ${userId} updated successfully`,
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
 * DELETE /api/databases/users/:id
 * Delete database user
 */
router.delete('/users/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = parseInt(id);
		if (isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid user ID. Must be a number.',
			});
		}

		const result = await pleskClient.deleteDatabaseUser(userId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Database user ${userId} deleted successfully`,
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
 * GET /api/databases/servers
 * Get database servers
 */
router.get('/servers', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.query;
		const serverId = id ? parseInt(id) : null;

		if (id && isNaN(serverId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid server ID. Must be a number.',
			});
		}

		const result = await pleskClient.getDatabaseServers(serverId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Database servers retrieved successfully',
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
