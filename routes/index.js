const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * Dynamic route loader middleware
 * Automatically loads and mounts all route files from organized folders
 */
class RouteManager {
	constructor() {
		this.routesPath = path.join(__dirname, '.');
		this.router = express.Router();
		this.loadRoutes();
	}

	/**
	 * Load all routes from theme-based folders
	 */
	loadRoutes() {
		try {
			// Define route themes and their corresponding paths
			const routeThemes = {
				main: {
					basePath: '/api',
					routes: [{ file: 'main', path: '' }],
				},
				plesk: {
					basePath: '/api/plesk',
					routes: [
						{ file: 'domains', path: '' },
						{ file: 'customers', path: '/customers' },
						{ file: 'server-info', path: '/server' },
					],
				},
				auth: {
					basePath: '/api/auth',
					routes: [{ file: 'keys', path: '' }],
				},
				admin: {
					basePath: '/api/admin',
					routes: [
						{ file: 'cli', path: '/cli' },
						{ file: 'extensions', path: '/extensions' },
						{ file: 'server', path: '/server' },
					],
				},
				management: {
					basePath: '/api',
					routes: [
						{ file: 'ftpusers', path: '/ftpusers' },
						{ file: 'databases', path: '/databases' },
						{ file: 'dns', path: '/dns' },
					],
				},
				system: {
					basePath: '/api',
					routes: [{ file: 'users', path: '/users' }],
				},
			};

			// Load routes by theme
			Object.entries(routeThemes).forEach(([theme, config]) => {
				this.loadThemeRoutes(theme, config);
			});
		} catch (error) {
			console.error('Failed to load routes:', error.message);
			this.createFallbackRoutes();
		}
	}

	/**
	 * Load routes for a specific theme
	 */
	loadThemeRoutes(theme, config) {
		try {
			console.log(`Loading ${theme} routes...`);

			config.routes.forEach(({ file, path: routePath }) => {
				try {
					const routeModule = require(`./${theme}/${file}`);
					this.router.use(`${config.basePath}${routePath}`, routeModule);
					console.log(`  ✓ Loaded ${theme}/${file} -> ${config.basePath}${routePath}`);
				} catch (error) {
					// Try loading from old structure for backward compatibility
					try {
						const legacyModule = require(`./${file}`);
						this.router.use(`${config.basePath}${routePath}`, legacyModule);
						console.log(`  ✓ Loaded legacy ${file} -> ${config.basePath}${routePath}`);
					} catch (legacyError) {
						console.warn(`  ⚠ Failed to load ${theme}/${file}:`, error.message);
					}
				}
			});
		} catch (error) {
			console.error(`Failed to load ${theme} routes:`, error.message);
		}
	}

	/**
	 * Create fallback routes for all endpoints when routes fail to load
	 */
	createFallbackRoutes() {
		this.router.use('/api/*', (req, res) => {
			res.status(500).json({
				success: false,
				error: 'Route module failed to load',
				message: 'Check server configuration and try again',
				endpoint: req.originalUrl,
			});
		});
	}

	/**
	 * Get the configured router
	 */
	getRouter() {
		return this.router;
	}
}

// Create and export the route manager instance
const routeManager = new RouteManager();

module.exports = routeManager.getRouter();
