const express = require('express');
const Joi = require('joi');
const PleskAPIClient = require('../../lib/pleskClient');

const router = express.Router();

// Initialize Plesk client
let pleskClient;
try {
	pleskClient = new PleskAPIClient();
	console.log('Plesk client initialized for customers module');
} catch (error) {
	console.error('Failed to initialize Plesk client for customers:', error.message);
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

// Validation schema
const customerSchema = Joi.object({
	login: Joi.string().alphanum().min(3).max(30).required(),
	password: Joi.string().min(6).required(),
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	company: Joi.string().optional(),
});

/**
 * GET /api/plesk/customers
 * List all customers
 */
router.get('/', checkPleskClient, async (req, res) => {
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
 * GET /api/plesk/customers/:id
 * Get specific customer information
 */
router.get('/:id', checkPleskClient, async (req, res) => {
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
 * POST /api/plesk/customers
 * Create a new customer
 */
router.post('/', checkPleskClient, async (req, res) => {
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
 * GET /api/plesk/customers/:id/domains
 * Get customer domains
 */
router.get('/:id/domains', checkPleskClient, async (req, res) => {
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
router.get('/:id/statistics', checkPleskClient, async (req, res) => {
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

module.exports = router;
