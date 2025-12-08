const express = require('express');
const Joi = require('joi');
const PleskAPIClient = require('../../lib/pleskClient');

const router = express.Router();

// Initialize Plesk client
let pleskClient;
try {
	pleskClient = new PleskAPIClient();
	console.log('Plesk client initialized successfully');
} catch (error) {
	console.error('Failed to initialize Plesk client:', error.message);
	console.log('Server will continue without Plesk client - API endpoints will return configuration errors');
}

// Middleware to check if Plesk client is available
const checkPleskClient = (req, res, next) => {
	if (!pleskClient) {
		// Return test data when Plesk is not configured for development
		if (process.env.NODE_ENV === 'development') {
			console.log('Plesk client not available, returning test data');
			req.useTestData = true;
			return next();
		}
		return res.status(500).json({
			error: 'Plesk client not configured. Please check your environment variables.',
		});
	}
	next();
};

// Validation schemas
const domainSchema = Joi.object({
	name: Joi.string().domain().required(),
	owner: Joi.string().optional().default('admin'),
	password: Joi.string().min(6).optional().default('changeme123'),
	description: Joi.string().optional(),
	owner_client: Joi.string().optional(),
	ip_addresses: Joi.alternatives().try(Joi.string().ip(), Joi.array().items(Joi.string().ip())).optional(),
});

const customerSchema = Joi.object({
	login: Joi.string().alphanum().min(3).max(30).required(),
	password: Joi.string().min(6).required(),
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	company: Joi.string().optional(),
});

// Routes

router.get('/', (req, res) => {
	res.json({
		message: 'Plesk API Manager - Domain Management',
		note: 'This endpoint handles domain-related operations for Plesk servers',
		category: 'Plesk Domain Management',
		basePath: '/api/plesk',
		endpoints: [
			{ method: 'GET', path: '/api/plesk/', description: 'Get domain management info' },
			{ method: 'GET', path: '/api/plesk/domains', description: 'List all domains (supports ?name filter)' },
			{ method: 'GET', path: '/api/plesk/domains/:id', description: 'Get specific domain information' },
			{ method: 'POST', path: '/api/plesk/domains', description: 'Create a new domain' },
			{ method: 'DELETE', path: '/api/plesk/domains/:id', description: 'Delete a domain' },
			{ method: 'GET', path: '/api/plesk/domains/:id/status', description: 'Get domain status' },
			{ method: 'PUT', path: '/api/plesk/domains/:id/status', description: 'Update domain status' },
		],
		relatedEndpoints: {
			customers: '/api/plesk/customers/*',
			serverInfo: '/api/plesk/server/*',
		},
	});
});

/**
 * GET /api/plesk/server/info
 * Get server information
 */
router.get('/server/info', checkPleskClient, async (req, res) => {
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
 * GET /api/plesk/domains
 * List all domains
 */
router.get('/domains', checkPleskClient, async (req, res) => {
	try {
		// If using test data (Plesk not configured)
		if (req.useTestData) {
			const testDomains = [
				{
					id: 1,
					name: 'example.com',
					status: 'active',
					created: '2024-01-15T10:30:00.000Z',
					ipAddresses: ['192.168.1.100', '2001:db8::1'],
					owner: 'admin',
				},
				{
					id: 2,
					name: 'test.org',
					status: 'suspended',
					created: '2024-02-01T14:22:00.000Z',
					ipAddresses: ['192.168.1.101'],
					owner: 'client1',
				},
				{
					id: 3,
					name: 'demo.net',
					status: 'active',
					created: '2024-03-10T09:15:00.000Z',
					ipAddresses: ['192.168.1.102'],
					owner: 'client2',
				},
			];

			const { name } = req.query;
			let filteredDomains = testDomains;
			if (name) {
				filteredDomains = testDomains.filter((domain) => domain.name.toLowerCase().includes(name.toLowerCase()));
			}

			return res.json({
				success: true,
				data: filteredDomains,
				message: 'Test domains retrieved successfully',
			});
		}

		const { name } = req.query;
		const result = await pleskClient.listDomains(name);
		console.log('Plesk API response:', JSON.stringify(result, null, 2)); // Debug log

		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Domains retrieved successfully',
			});
		} else {
			res.status(result.status || 500).json({
				success: false,
				error: result.error,
				details: result.details,
			});
		}
	} catch (error) {
		console.error('Error in domains route:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/plesk/domains/:id
 * Get specific domain information
 */
router.get('/domains/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const domainId = parseInt(id);
		if (isNaN(domainId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid domain ID. Must be a number.',
			});
		}

		const result = await pleskClient.getDomainInfo(domainId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Domain ${domainId} information retrieved successfully`,
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
 * POST /api/plesk/domains
 * Create a new domain
 */
router.post('/domains', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = domainSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createDomain(value);
		if (result.success) {
			res.status(201).json({
				success: true,
				data: result.data,
				message: `Domain ${value.name} created successfully`,
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
 * DELETE /api/plesk/domains/:id
 * Delete a domain
 */
router.delete('/domains/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const domainId = parseInt(id);
		if (isNaN(domainId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid domain ID. Must be a number.',
			});
		}

		// If using test data (Plesk not configured)
		if (req.useTestData) {
			return res.json({
				success: true,
				data: { id: domainId },
				message: `Test domain ${domainId} deleted successfully`,
			});
		}

		const result = await pleskClient.deleteDomain(domainId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Domain ${domainId} deleted successfully`,
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
 * GET /api/plesk/customers
 * List all customers
 */
router.get('/customers', checkPleskClient, async (req, res) => {
	try {
		const result = await pleskClient.listCustomers();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Customers retrieved successfully',
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
 * POST /api/plesk/customers
 * Create a new customer
 */
router.post('/customers', checkPleskClient, async (req, res) => {
	try {
		const { error, value } = customerSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createCustomer(value);
		if (result.success) {
			res.status(201).json({
				success: true,
				data: result.data,
				message: `Customer ${value.login} created successfully`,
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
 * POST /api/plesk/test
 * Test endpoint to verify API connectivity
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

/**
 * GET /api/plesk/customers/:id
 * Get specific customer information
 */
router.get('/customers/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const customerId = parseInt(id);
		if (isNaN(customerId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid customer ID. Must be a number.',
			});
		}

		const result = await pleskClient.getCustomerInfo(customerId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Customer ${customerId} information retrieved successfully`,
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
 * GET /api/plesk/customers/:id/domains
 * Get customer domains
 */
router.get('/customers/:id/domains', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const customerId = parseInt(id);
		if (isNaN(customerId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid customer ID. Must be a number.',
			});
		}

		const result = await pleskClient.getCustomerDomains(customerId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Customer ${customerId} domains retrieved successfully`,
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
 * GET /api/plesk/customers/:id/statistics
 * Get customer statistics
 */
router.get('/customers/:id/statistics', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const customerId = parseInt(id);
		if (isNaN(customerId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid customer ID. Must be a number.',
			});
		}

		const result = await pleskClient.getCustomerStatistics(customerId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Customer ${customerId} statistics retrieved successfully`,
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
 * GET /api/plesk/domains/:id/status
 * Get domain status
 */
router.get('/domains/:id/status', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const domainId = parseInt(id);
		if (isNaN(domainId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid domain ID. Must be a number.',
			});
		}

		const result = await pleskClient.getDomainStatus(domainId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Domain ${domainId} status retrieved successfully`,
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
 * PUT /api/plesk/domains/:id
 * Update domain information
 */
router.put('/domains/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const domainId = parseInt(id);
		if (isNaN(domainId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid domain ID. Must be a number.',
			});
		}

		// Validate update data
		const { error } = domainSchema.validate(req.body, { allowUnknown: true });
		if (error) {
			return res.status(400).json({
				success: false,
				error: error.details[0].message,
			});
		}

		const result = await pleskClient.updateDomain(domainId, req.body);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Domain ${domainId} updated successfully`,
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
 * PUT /api/plesk/domains/:id/status
 * Update domain status
 */
router.put('/domains/:id/status', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		const domainId = parseInt(id);
		if (isNaN(domainId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid domain ID. Must be a number.',
			});
		}

		if (!['active', 'suspended', 'disabled'].includes(status)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid status. Must be one of: active, suspended, disabled',
			});
		}

		// If using test data (Plesk not configured)
		if (req.useTestData) {
			return res.json({
				success: true,
				data: { id: domainId, status },
				message: `Test domain ${domainId} status updated to ${status}`,
			});
		}

		const result = await pleskClient.updateDomainStatus(domainId, status);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `Domain ${domainId} status updated to ${status}`,
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
 * POST /api/plesk/domains/refresh
 * Force refresh domain data from Plesk
 */
router.post('/domains/refresh', checkPleskClient, async (req, res) => {
	try {
		if (req.useTestData) {
			return res.json({
				success: true,
				data: { count: 3 },
				message: 'Test mode - refresh simulated',
			});
		}

		const result = await pleskClient.refreshDomains();

		if (result.success) {
			res.json({
				success: true,
				data: { count: result.count },
				message: `Refreshed ${result.count} domains successfully`,
			});
		} else {
			res.status(500).json({
				success: false,
				error: result.error,
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
 * GET /api/plesk/domains/metadata
 * Get cache metadata (last updated, counts, etc)
 */
router.get('/domains/metadata', checkPleskClient, async (req, res) => {
	try {
		if (req.useTestData) {
			return res.json({
				success: true,
				data: {
					total_domains: 3,
					active_domains: 2,
					suspended_domains: 1,
					disabled_domains: 0,
					unknown_domains: 0,
					last_updated: new Date(),
				},
				message: 'Test mode metadata',
			});
		}

		const result = await pleskClient.getCacheMetadata();

		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Cache metadata retrieved successfully',
			});
		} else {
			res.status(500).json({
				success: false,
				error: result.error,
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
 * POST /api/plesk/domains/sync
 * Trigger manual domain sync
 */
router.post('/domains/sync', checkPleskClient, async (req, res) => {
	try {
		if (req.useTestData) {
			return res.json({
				success: true,
				message: 'Test mode - sync not needed',
			});
		}

		// Trigger background sync
		pleskClient.syncDomainsInBackground();

		res.json({
			success: true,
			message: 'Domain sync initiated in background',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/plesk/domains/sync/stats
 * Get domain sync statistics
 */
router.get('/domains/sync/stats', checkPleskClient, async (req, res) => {
	try {
		if (req.useTestData) {
			return res.json({
				success: true,
				data: {
					total_domains: 3,
					active_domains: 2,
					suspended_domains: 1,
					disabled_domains: 0,
					unknown_domains: 0,
					error_domains: 0,
					last_sync_time: new Date(),
				},
				message: 'Test mode sync statistics',
			});
		}

		const result = await pleskClient.getSyncStats();
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: 'Sync statistics retrieved successfully',
			});
		} else {
			res.status(result.status || 500).json({
				success: false,
				error: result.error,
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
