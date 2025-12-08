const express = require('express');

const router = express.Router();

/**
 * GET /api
 * Main API overview
 */
router.get('/', (req, res) => {
	res.json({
		name: 'Plesk API Manager',
		version: '1.0.0',
		description: 'Complete Plesk REST API Management Platform with React Frontend',
		message: 'Welcome to the Plesk API Manager - Organized by functional themes',
		documentation: {
			swagger: '/api/docs',
			postman: '/api/postman.json',
		},
		categories: {
			plesk: {
				description: 'Plesk server and domain management',
				basePath: '/api/plesk',
				endpoints: ['domains', 'customers', 'server'],
			},
			auth: {
				description: 'Plesk authentication management',
				basePath: '/api/auth',
				endpoints: ['keys'],
			},
			admin: {
				description: 'Administrative functions',
				basePath: '/api/admin',
				endpoints: ['cli', 'extensions', 'server'],
			},
			management: {
				description: 'Resource management',
				basePath: '/api',
				endpoints: ['ftpusers', 'databases', 'dns'],
			},
			system: {
				description: 'System user management',
				basePath: '/api/system',
				endpoints: ['users'],
			},
		},
		endpoints: {
			health: '/health',
			api_overview: '/api',
			plesk_domains: '/api/plesk/',
			plesk_customers: '/api/plesk/customers',
			plesk_server: '/api/plesk/server',
			auth_keys: '/api/auth/',
			admin_cli: '/api/admin/cli',
			admin_extensions: '/api/admin/extensions',
			admin_server: '/api/admin/server',
			ftpusers: '/api/ftpusers',
			databases: '/api/databases',
			dns: '/api/dns',
			system_users: '/api/system/users',
		},
		features: ['Complete Plesk REST API v2 integration', 'MySQL user authentication system', 'JWT-based security', 'React frontend with Material-UI', 'Redux/Flux state management', 'Organized route structure by themes', 'Comprehensive error handling', 'Real-time server monitoring'],
		timestamp: new Date().toISOString(),
	});
});

module.exports = router;
