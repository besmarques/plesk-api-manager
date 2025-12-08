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
const dnsRecordSchema = Joi.object({
	type: Joi.string().valid('A', 'CNAME', 'PTR', 'MX', 'NS', 'TXT', 'SOA', 'AXFR', 'SRV', 'AAAA', 'DS', 'CAA', 'TLSA', 'HTTPS').required(),
	host: Joi.string().required(),
	value: Joi.string().required(),
	opt: Joi.string().optional(),
	ttl: Joi.number().integer().min(1).optional(),
});

const dnsRecordUpdateSchema = Joi.object({
	id: Joi.number().integer().optional(),
	type: Joi.string().valid('A', 'CNAME', 'PTR', 'MX', 'NS', 'TXT', 'SOA', 'AXFR', 'SRV', 'AAAA', 'DS', 'CAA', 'TLSA', 'HTTPS').optional(),
	host: Joi.string().optional(),
	value: Joi.string().optional(),
	opt: Joi.string().optional(),
	ttl: Joi.number().integer().min(1).optional(),
});

/**
 * GET /api/dns/records
 * Get domain or domain alias DNS records
 */
router.get('/records', checkPleskClient, async (req, res) => {
	try {
		const { domain } = req.query;

		if (!domain) {
			return res.status(400).json({
				success: false,
				error: 'Domain parameter is required',
			});
		}

		const result = await pleskClient.getDnsRecords(domain);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `DNS records for ${domain} retrieved successfully`,
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
 * POST /api/dns/records
 * Create domain or domain alias DNS record
 */
router.post('/records', checkPleskClient, async (req, res) => {
	try {
		const { domain } = req.query;

		if (!domain) {
			return res.status(400).json({
				success: false,
				error: 'Domain parameter is required',
			});
		}

		const { error, value } = dnsRecordSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.createDnsRecord(domain, value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `DNS record for ${domain} created successfully`,
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
 * GET /api/dns/records/:id
 * Get DNS record
 */
router.get('/records/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const recordId = parseInt(id);

		if (isNaN(recordId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid record ID. Must be a number.',
			});
		}

		const result = await pleskClient.getDnsRecord(recordId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `DNS record ${recordId} retrieved successfully`,
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
 * PUT /api/dns/records/:id
 * Update DNS record
 */
router.put('/records/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const recordId = parseInt(id);

		if (isNaN(recordId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid record ID. Must be a number.',
			});
		}

		const { error, value } = dnsRecordUpdateSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const result = await pleskClient.updateDnsRecord(recordId, value);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `DNS record ${recordId} updated successfully`,
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
 * DELETE /api/dns/records/:id
 * Delete DNS record
 */
router.delete('/records/:id', checkPleskClient, async (req, res) => {
	try {
		const { id } = req.params;
		const recordId = parseInt(id);

		if (isNaN(recordId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid record ID. Must be a number.',
			});
		}

		const result = await pleskClient.deleteDnsRecord(recordId);
		if (result.success) {
			res.json({
				success: true,
				data: result.data,
				message: `DNS record ${recordId} deleted successfully`,
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
