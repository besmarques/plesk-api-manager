const axios = require('axios');
const https = require('https');
const mysql = require('mysql2/promise');

class PleskAPIClient {
	constructor(config = {}) {
		this.baseURL = config.baseURL || process.env.PLESK_URL;
		this.apiKey = config.apiKey || process.env.PLESK_API_KEY;
		this.username = config.username || process.env.PLESK_USERNAME;
		this.password = config.password || process.env.PLESK_PASSWORD;

		// Database configuration
		this.dbConfig = {
			host: process.env.DB_HOST || 'localhost',
			user: process.env.DB_USER || 'root',
			password: process.env.DB_PASSWORD || '',
			database: process.env.DB_NAME || 'plesk_manager',
			port: process.env.DB_PORT || 3306,
		};

		// Create database connection pool
		this.dbPool = mysql.createPool({
			...this.dbConfig,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
		});

		// Initialize domain cache table (don't await in constructor)
		this.initializeDomainCache().catch((error) => {
			console.error('Failed to initialize domain cache:', error.message);
		});

		if (!this.baseURL) {
			throw new Error('Plesk URL is required');
		}

		if (!this.apiKey && (!this.username || !this.password)) {
			throw new Error('Either API key or username/password is required');
		}

		// Create axios instance with REST API configuration
		this.client = axios.create({
			baseURL: `${this.baseURL}/api/v2`,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			httpsAgent: new https.Agent({
				rejectUnauthorized: false, // Allow self-signed certificates
			}),
		});

		// Add authentication headers
		if (this.apiKey) {
			this.client.defaults.headers.common['X-API-Key'] = this.apiKey;
		} else if (this.username && this.password) {
			// Use HTTP Basic Auth for username/password
			this.client.defaults.auth = {
				username: this.username,
				password: this.password,
			};
		}
	}

	/**
	 * Execute a Plesk REST API request
	 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
	 * @param {string} endpoint - API endpoint
	 * @param {Object} data - Request data (for POST/PUT)
	 * @returns {Promise<Object>} - API response
	 */
	async executeRequest(method, endpoint, data = null) {
		try {
			const config = {
				method: method.toLowerCase(),
				url: endpoint,
			};

			if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
				config.data = data;
			}

			const response = await this.client(config);
			return {
				success: true,
				data: response.data,
				status: response.status,
			};
		} catch (error) {
			console.error('Plesk API request failed:', error.message);

			// Extract error details from response if available
			let errorMessage = error.message;
			let errorDetails = null;

			if (error.response) {
				errorMessage = error.response.data?.message || error.message;
				errorDetails = error.response.data;
			}

			return {
				success: false,
				error: errorMessage,
				details: errorDetails,
				status: error.response?.status || 500,
			};
		}
	}

	/**
	 * Get server information
	 * @returns {Promise<Object>}
	 */
	async getServerInfo() {
		return await this.executeRequest('GET', '/server');
	}

	/**
	 * List all domains (check cache first, then fetch from Plesk if needed)
	 * @param {string} nameFilter - Optional domain name filter
	 * @returns {Promise<Object>}
	 */
	async listDomains(nameFilter = null) {
		try {
			// Step 1: Check if we have domains in cache
			const cachedDomains = await this.getDomainsFromCache(nameFilter);

			if (cachedDomains.length > 0) {
				console.log(`Found ${cachedDomains.length} domains in cache`);
				return {
					success: true,
					data: cachedDomains,
					message: `Retrieved ${cachedDomains.length} domains from cache`,
					fromCache: true,
				};
			}

			// Step 2: Cache is empty, fetch from Plesk and store
			console.log('Cache is empty, fetching domains from Plesk...');
			const pleskResult = await this.fetchAndStoreDomains();

			if (!pleskResult.success) {
				// Fallback to test data if Plesk fails
				return this.getTestDomains(nameFilter);
			}

			// Step 3: Start background status sync
			console.log('Starting background status sync...');
			this.startStatusSync();

			// Step 4: Return basic domain data (status will be updated in background)
			const domains = await this.getDomainsFromCache(nameFilter);
			return {
				success: true,
				data: domains,
				message: `Retrieved ${domains.length} domains, status sync in progress`,
				fromCache: false,
			};
		} catch (error) {
			console.error('Error in listDomains:', error.message);
			return this.getTestDomains(nameFilter);
		}
	}

	/**
	 * Get domain information by ID
	 * @param {number} domainId
	 * @returns {Promise<Object>}
	 */
	async getDomainInfo(domainId) {
		return await this.executeRequest('GET', `/domains/${domainId}`);
	}

	/**
	 * Get domain status by ID
	 * @param {number} domainId
	 * @returns {Promise<Object>}
	 */
	async getDomainStatus(domainId) {
		return await this.executeRequest('GET', `/domains/${domainId}/status`);
	}

	/**
	 * Create a new domain
	 * @param {Object} domainData
	 * @returns {Promise<Object>}
	 */
	async createDomain(domainData) {
		const requestData = {
			name: domainData.name,
			hosting_type: 'virtual',
			hosting_settings: {
				ftp_login: domainData.owner || 'admin',
				ftp_password: domainData.password || 'changeme123',
			},
		};

		if (domainData.description) {
			requestData.description = domainData.description;
		}

		if (domainData.owner_client) {
			requestData.owner_client = { login: domainData.owner_client };
		}

		if (domainData.ip_addresses) {
			requestData.ip_addresses = Array.isArray(domainData.ip_addresses) ? domainData.ip_addresses : [domainData.ip_addresses];
		}

		return await this.executeRequest('POST', '/domains', requestData);
	}

	/**
	 * Update a domain
	 * @param {number} domainId
	 * @param {Object} domainData
	 * @returns {Promise<Object>}
	 */
	async updateDomain(domainId, domainData) {
		return await this.executeRequest('PUT', `/domains/${domainId}`, domainData);
	}

	/**
	 * Delete a domain
	 * @param {number} domainId
	 * @returns {Promise<Object>}
	 */
	async deleteDomain(domainId) {
		return await this.executeRequest('DELETE', `/domains/${domainId}`);
	}

	/**
	 * Get domain status
	 * @param {number} domainId
	 * @returns {Promise<Object>}
	 */
	async getDomainStatus(domainId) {
		return await this.executeRequest('GET', `/domains/${domainId}/status`);
	}

	/**
	 * Update domain status
	 * @param {number} domainId
	 * @param {string} status - 'active', 'suspended', or 'disabled'
	 * @returns {Promise<Object>}
	 */
	async updateDomainStatus(domainId, status) {
		return await this.executeRequest('PUT', `/domains/${domainId}/status`, { status });
	}

	/**
	 * List all clients (customers)
	 * @returns {Promise<Object>}
	 */
	async listCustomers() {
		return await this.executeRequest('GET', '/clients');
	}

	/**
	 * Get client information by ID
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async getCustomerInfo(clientId) {
		return await this.executeRequest('GET', `/clients/${clientId}`);
	}

	/**
	 * Create a new client (customer)
	 * @param {Object} customerData
	 * @returns {Promise<Object>}
	 */
	async createCustomer(customerData) {
		const requestData = {
			name: customerData.name,
			login: customerData.login,
			password: customerData.password,
			email: customerData.email,
			type: customerData.type || 'customer',
		};

		if (customerData.company) {
			requestData.company = customerData.company;
		}

		if (customerData.locale) {
			requestData.locale = customerData.locale;
		}

		if (customerData.description) {
			requestData.description = customerData.description;
		}

		if (customerData.owner_login) {
			requestData.owner_login = customerData.owner_login;
		}

		return await this.executeRequest('POST', '/clients', requestData);
	}

	/**
	 * Update a client
	 * @param {number} clientId
	 * @param {Object} customerData
	 * @returns {Promise<Object>}
	 */
	async updateCustomer(clientId, customerData) {
		return await this.executeRequest('PUT', `/clients/${clientId}`, customerData);
	}

	/**
	 * Delete a client
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async deleteCustomer(clientId) {
		return await this.executeRequest('DELETE', `/clients/${clientId}`);
	}

	/**
	 * Get client statistics
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async getCustomerStatistics(clientId) {
		return await this.executeRequest('GET', `/clients/${clientId}/statistics`);
	}

	/**
	 * Get client domains
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async getCustomerDomains(clientId) {
		return await this.executeRequest('GET', `/clients/${clientId}/domains`);
	}

	/**
	 * Activate client
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async activateCustomer(clientId) {
		return await this.executeRequest('PUT', `/clients/${clientId}/activate`);
	}

	/**
	 * Suspend client
	 * @param {number} clientId
	 * @returns {Promise<Object>}
	 */
	async suspendCustomer(clientId) {
		return await this.executeRequest('PUT', `/clients/${clientId}/suspend`);
	}

	// ==========================================
	// AUTHENTICATION ENDPOINTS
	// ==========================================

	/**
	 * Generate a secret key
	 * @param {Object} keyData - Key parameters
	 * @returns {Promise<Object>}
	 */
	async generateSecretKey(keyData) {
		return await this.executeRequest('POST', '/auth/keys', keyData);
	}

	/**
	 * Delete a secret key
	 * @param {string} keyId - Key ID
	 * @returns {Promise<Object>}
	 */
	async deleteSecretKey(keyId) {
		return await this.executeRequest('DELETE', `/auth/keys/${keyId}`);
	}

	// ==========================================
	// CLI ENDPOINTS
	// ==========================================

	/**
	 * List available CLI commands
	 * @returns {Promise<Object>}
	 */
	async listCliCommands() {
		return await this.executeRequest('GET', '/cli/commands');
	}

	/**
	 * Get command reference
	 * @param {string} commandId - Command identifier
	 * @returns {Promise<Object>}
	 */
	async getCliCommandRef(commandId) {
		return await this.executeRequest('GET', `/cli/${commandId}/ref`);
	}

	/**
	 * Execute CLI command
	 * @param {string} commandId - Command identifier
	 * @param {Object} params - Command execution parameters
	 * @returns {Promise<Object>}
	 */
	async executeCliCommand(commandId, params) {
		return await this.executeRequest('POST', `/cli/${commandId}/call`, params);
	}

	// ==========================================
	// SERVER ENDPOINTS
	// ==========================================

	/**
	 * Get server IP addresses
	 * @returns {Promise<Object>}
	 */
	async getServerIps() {
		return await this.executeRequest('GET', '/server/ips');
	}

	/**
	 * Initialize server
	 * @param {Object} initData - Initial setup parameters
	 * @returns {Promise<Object>}
	 */
	async initializeServer(initData) {
		return await this.executeRequest('POST', '/server/init', initData);
	}

	/**
	 * Install license key
	 * @param {Object} licenseData - License data
	 * @returns {Promise<Object>}
	 */
	async installLicense(licenseData) {
		return await this.executeRequest('POST', '/server/license', licenseData);
	}

	// ==========================================
	// EXTENSION ENDPOINTS
	// ==========================================

	/**
	 * List installed extensions
	 * @returns {Promise<Object>}
	 */
	async listExtensions() {
		return await this.executeRequest('GET', '/extensions');
	}

	/**
	 * Get extension details
	 * @param {string} extensionId - Extension identifier
	 * @returns {Promise<Object>}
	 */
	async getExtension(extensionId) {
		return await this.executeRequest('GET', `/extensions/${extensionId}`);
	}

	/**
	 * Install extension
	 * @param {Object} installData - Installation data
	 * @returns {Promise<Object>}
	 */
	async installExtension(installData) {
		return await this.executeRequest('POST', '/extensions', installData);
	}

	/**
	 * Delete extension
	 * @param {string} extensionId - Extension identifier
	 * @returns {Promise<Object>}
	 */
	async deleteExtension(extensionId) {
		return await this.executeRequest('DELETE', `/extensions/${extensionId}`);
	}

	/**
	 * Enable extension
	 * @param {string} extensionId - Extension identifier
	 * @returns {Promise<Object>}
	 */
	async enableExtension(extensionId) {
		return await this.executeRequest('PUT', `/extensions/${extensionId}/enable`);
	}

	/**
	 * Disable extension
	 * @param {string} extensionId - Extension identifier
	 * @returns {Promise<Object>}
	 */
	async disableExtension(extensionId) {
		return await this.executeRequest('PUT', `/extensions/${extensionId}/disable`);
	}

	// ==========================================
	// FTP USER ENDPOINTS
	// ==========================================

	/**
	 * Get FTP users
	 * @param {Object} filters - Optional filters (name, domain)
	 * @returns {Promise<Object>}
	 */
	async getFtpUsers(filters = {}) {
		let endpoint = '/ftpusers';
		const params = new URLSearchParams();

		if (filters.name) params.append('name', filters.name);
		if (filters.domain) params.append('domain', filters.domain);

		if (params.toString()) {
			endpoint += `?${params.toString()}`;
		}

		return await this.executeRequest('GET', endpoint);
	}

	/**
	 * Create FTP user
	 * @param {Object} ftpUserData - FTP user data
	 * @returns {Promise<Object>}
	 */
	async createFtpUser(ftpUserData) {
		return await this.executeRequest('POST', '/ftpusers', ftpUserData);
	}

	/**
	 * Update FTP user
	 * @param {string} userName - FTP user name
	 * @param {Object} updateData - Update data
	 * @returns {Promise<Object>}
	 */
	async updateFtpUser(userName, updateData) {
		return await this.executeRequest('PUT', `/ftpusers/${userName}`, updateData);
	}

	/**
	 * Delete FTP user
	 * @param {string} userName - FTP user name
	 * @returns {Promise<Object>}
	 */
	async deleteFtpUser(userName) {
		return await this.executeRequest('DELETE', `/ftpusers/${userName}`);
	}

	// ==========================================
	// DATABASE ENDPOINTS
	// ==========================================

	/**
	 * Get databases
	 * @param {string} domain - Optional domain filter
	 * @returns {Promise<Object>}
	 */
	async getDatabases(domain = null) {
		let endpoint = '/databases';
		if (domain) {
			endpoint += `?domain=${encodeURIComponent(domain)}`;
		}
		return await this.executeRequest('GET', endpoint);
	}

	/**
	 * Create database
	 * @param {Object} dbData - Database data
	 * @returns {Promise<Object>}
	 */
	async createDatabase(dbData) {
		return await this.executeRequest('POST', '/databases', dbData);
	}

	/**
	 * Delete database
	 * @param {number} dbId - Database ID
	 * @returns {Promise<Object>}
	 */
	async deleteDatabase(dbId) {
		return await this.executeRequest('DELETE', `/databases/${dbId}`);
	}

	/**
	 * Get database users
	 * @param {number} dbId - Optional database ID filter
	 * @returns {Promise<Object>}
	 */
	async getDatabaseUsers(dbId = null) {
		let endpoint = '/dbusers';
		if (dbId) {
			endpoint += `?dbId=${dbId}`;
		}
		return await this.executeRequest('GET', endpoint);
	}

	/**
	 * Create database user
	 * @param {Object} dbUserData - Database user data
	 * @returns {Promise<Object>}
	 */
	async createDatabaseUser(dbUserData) {
		return await this.executeRequest('POST', '/dbusers', dbUserData);
	}

	/**
	 * Update database user
	 * @param {number} userId - Database user ID
	 * @param {Object} updateData - Update data
	 * @returns {Promise<Object>}
	 */
	async updateDatabaseUser(userId, updateData) {
		return await this.executeRequest('PUT', `/dbusers/${userId}`, updateData);
	}

	/**
	 * Delete database user
	 * @param {number} userId - Database user ID
	 * @returns {Promise<Object>}
	 */
	async deleteDatabaseUser(userId) {
		return await this.executeRequest('DELETE', `/dbusers/${userId}`);
	}

	/**
	 * Get database servers
	 * @param {number} serverId - Optional server ID filter
	 * @returns {Promise<Object>}
	 */
	async getDatabaseServers(serverId = null) {
		let endpoint = '/dbservers';
		if (serverId) {
			endpoint += `?id=${serverId}`;
		}
		return await this.executeRequest('GET', endpoint);
	}

	// ==========================================
	// DNS ENDPOINTS
	// ==========================================

	/**
	 * Get DNS records
	 * @param {string} domain - Domain name (required)
	 * @returns {Promise<Object>}
	 */
	async getDnsRecords(domain) {
		return await this.executeRequest('GET', `/dns/records?domain=${encodeURIComponent(domain)}`);
	}

	/**
	 * Create DNS record
	 * @param {string} domain - Domain name
	 * @param {Object} recordData - DNS record data
	 * @returns {Promise<Object>}
	 */
	async createDnsRecord(domain, recordData) {
		return await this.executeRequest('POST', `/dns/records?domain=${encodeURIComponent(domain)}`, recordData);
	}

	/**
	 * Get specific DNS record
	 * @param {number} recordId - DNS record ID
	 * @returns {Promise<Object>}
	 */
	async getDnsRecord(recordId) {
		return await this.executeRequest('GET', `/dns/records/${recordId}`);
	}

	/**
	 * Update DNS record
	 * @param {number} recordId - DNS record ID
	 * @param {Object} recordData - DNS record data
	 * @returns {Promise<Object>}
	 */
	async updateDnsRecord(recordId, recordData) {
		return await this.executeRequest('PUT', `/dns/records/${recordId}`, recordData);
	}

	/**
	 * Delete DNS record
	 * @param {number} recordId - DNS record ID
	 * @returns {Promise<Object>}
	 */
	async deleteDnsRecord(recordId) {
		return await this.executeRequest('DELETE', `/dns/records/${recordId}`);
	}

	// ==========================================
	// DOMAIN ENDPOINTS
	// ==========================================

	/**
	 * List all domains
	 * @param {string} name - Optional domain name filter
	 * @returns {Promise<Object>}
	 */
	async listDomains(name = null) {
		let endpoint = '/domains';
		if (name) {
			endpoint += `?name=${encodeURIComponent(name)}`;
		}
		return await this.executeRequest('GET', endpoint);
	}

	/**
	 * Get domain information
	 * @param {number} domainId - Domain ID
	 * @returns {Promise<Object>}
	 */
	async getDomainInfo(domainId) {
		return await this.executeRequest('GET', `/domains/${domainId}`);
	}

	/**
	 * Create a new domain
	 * @param {Object} domainData - Domain parameters
	 * @returns {Promise<Object>}
	 */
	async createDomain(domainData) {
		return await this.executeRequest('POST', '/domains', domainData);
	}

	/**
	 * Update domain
	 * @param {number} domainId - Domain ID
	 * @param {Object} domainData - Domain parameters to update
	 * @returns {Promise<Object>}
	 */
	async updateDomain(domainId, domainData) {
		return await this.executeRequest('PUT', `/domains/${domainId}`, domainData);
	}

	/**
	 * Delete domain
	 * @param {number} domainId - Domain ID
	 * @returns {Promise<Object>}
	 */
	async deleteDomain(domainId) {
		return await this.executeRequest('DELETE', `/domains/${domainId}`);
	}

	/**
	 * Get domain status
	 * @param {number} domainId - Domain ID
	 * @returns {Promise<Object>}
	 */
	async getDomainStatus(domainId) {
		return await this.executeRequest('GET', `/domains/${domainId}/status`);
	}

	/**
	 * Update domain status
	 * @param {number} domainId - Domain ID
	 * @param {string} status - New status (active, suspended)
	 * @returns {Promise<Object>}
	 */
	async updateDomainStatus(domainId, status) {
		return await this.executeRequest('PUT', `/domains/${domainId}/status`, { status });
	}

	/**
	 * Suspend domain
	 * @param {number} domainId - Domain ID
	 * @returns {Promise<Object>}
	 */
	async suspendDomain(domainId) {
		return await this.executeRequest('PUT', `/domains/${domainId}/suspend`);
	}

	/**
	 * Activate domain
	 * @param {number} domainId - Domain ID
	 * @returns {Promise<Object>}
	 */
	async activateDomain(domainId) {
		return await this.executeRequest('PUT', `/domains/${domainId}/activate`);
	}

	// ==========================================
	// DOMAIN CACHE / BACKGROUND SYNC METHODS
	// ==========================================

	/**
	 * Initialize domain cache table
	 */
	async initializeDomainCache() {
		try {
			const connection = await this.dbPool.getConnection();

			// Create domain cache table
			await connection.execute(`
				CREATE TABLE IF NOT EXISTS domain_cache (
					id INT PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					status ENUM('active', 'suspended', 'disabled', 'unknown') DEFAULT 'unknown',
					created DATETIME,
					owner VARCHAR(100),
					hosting_type VARCHAR(50),
					www_root TEXT,
					ip_addresses JSON,
					last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					sync_error TEXT NULL,
					INDEX idx_name (name),
					INDEX idx_status (status),
					INDEX idx_last_updated (last_updated)
				) ENGINE=InnoDB
			`);

			connection.release();
			console.log('Domain cache table initialized successfully');
		} catch (error) {
			console.error('Failed to initialize domain cache table:', error.message);
		}
	}

	/**
	 * Get domains from local cache with fallback to Plesk API
	 * @param {string} nameFilter - Optional name filter
	 * @returns {Promise<Object>}
	 */
	async listDomainsFromCache(nameFilter = null) {
		try {
			const connection = await this.dbPool.getConnection();

			let query = 'SELECT * FROM domain_cache';
			let params = [];

			if (nameFilter) {
				query += ' WHERE name LIKE ?';
				params.push(`%${nameFilter}%`);
			}

			query += ' ORDER BY name';

			const [rows] = await connection.execute(query, params);
			connection.release();

			// If cache is empty, trigger a background sync
			if (rows.length === 0) {
				console.log('Domain cache is empty, triggering background sync...');
				this.syncDomainsInBackground();

				// Return empty array for now, sync will populate it
				return {
					success: true,
					data: [],
					message: 'Domain sync initiated - refresh in a few moments',
				};
			}

			// Convert database rows to expected format
			const domains = rows.map((row) => ({
				id: row.id,
				name: row.name,
				status: row.status,
				created: row.created,
				owner: row.owner,
				hosting_type: row.hosting_type,
				www_root: row.www_root,
				ipAddresses: row.ip_addresses ? JSON.parse(row.ip_addresses) : [],
			}));

			return {
				success: true,
				data: domains,
				message: `Retrieved ${domains.length} domains from cache`,
			};
		} catch (error) {
			console.error('Error reading from domain cache:', error.message);
			// Fallback to direct API call
			return await this.listDomains(nameFilter);
		}
	}

	/**
	 * Sync domains in background (non-blocking)
	 */
	syncDomainsInBackground() {
		// Don't await this - let it run in background
		this.performBackgroundSync().catch((error) => {
			console.error('Background domain sync failed:', error.message);
		});
	}

	/**
	 * Perform background synchronization of all domains
	 */
	async performBackgroundSync() {
		console.log('Starting background domain sync...');

		try {
			// First, get all domains without status (faster)
			const response = await this.executeRequest('GET', '/domains');

			if (!response.success) {
				throw new Error(response.error);
			}

			const domains = Array.isArray(response.data) ? response.data : [];
			console.log(`Found ${domains.length} domains to sync`);

			const connection = await this.dbPool.getConnection();

			// Process domains in batches
			const batchSize = 10;
			const delay = 2000; // 2 second delay between batches

			for (let i = 0; i < domains.length; i += batchSize) {
				const batch = domains.slice(i, i + batchSize);
				console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domains.length / batchSize)} (${batch.length} domains)`);

				// Process batch
				await this.syncDomainBatch(connection, batch);

				// Wait before next batch (except for last batch)
				if (i + batchSize < domains.length) {
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}

			connection.release();
			console.log(`Background domain sync completed successfully for ${domains.length} domains`);
		} catch (error) {
			console.error('Background domain sync failed:', error.message);
		}
	}

	/**
	 * Sync a batch of domains
	 */
	async syncDomainBatch(connection, domains) {
		for (const domain of domains) {
			try {
				let status = 'unknown';
				let syncError = null;

				// Try to get domain status
				try {
					const statusResponse = await this.executeRequest('GET', `/domains/${domain.id}/status`);
					if (statusResponse.success && statusResponse.data && statusResponse.data.status) {
						status = statusResponse.data.status;
					}
				} catch (statusError) {
					syncError = statusError.message;
					console.log(`Error fetching status for domain ${domain.id}: ${statusError.message}`);
				}

				// Insert or update domain in cache
				await connection.execute(
					`
					INSERT INTO domain_cache 
					(id, name, status, created, owner, hosting_type, www_root, ip_addresses, sync_error)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON DUPLICATE KEY UPDATE
					name = VALUES(name),
					status = VALUES(status),
					created = VALUES(created),
					owner = VALUES(owner),
					hosting_type = VALUES(hosting_type),
					www_root = VALUES(www_root),
					ip_addresses = VALUES(ip_addresses),
					sync_error = VALUES(sync_error),
					last_updated = CURRENT_TIMESTAMP
				`,
					[domain.id, domain.name || domain.ascii_name, status, domain.created || domain.created_at || new Date(), domain.owner || domain.owner_login || 'admin', domain.hosting_type || 'virtual', domain.www_root || '', JSON.stringify(domain.ip_addresses || []), syncError]
				);
			} catch (error) {
				console.error(`Error syncing domain ${domain.id}:`, error.message);
			}
		}
	}

	/**
	 * Update domain status in cache
	 */
	async updateDomainStatusInCache(domainId, status) {
		try {
			const connection = await this.dbPool.getConnection();
			await connection.execute('UPDATE domain_cache SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?', [status, domainId]);
			connection.release();
		} catch (error) {
			console.error('Error updating domain status in cache:', error.message);
		}
	}

	/**
	 * Get sync statistics
	 */
	async getSyncStats() {
		try {
			const connection = await this.dbPool.getConnection();

			const [stats] = await connection.execute(`
				SELECT 
					COUNT(*) as total_domains,
					SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_domains,
					SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_domains,
					SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled_domains,
					SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown_domains,
					SUM(CASE WHEN sync_error IS NOT NULL THEN 1 ELSE 0 END) as error_domains,
					MAX(last_updated) as last_sync_time
				FROM domain_cache
			`);

			connection.release();

			return {
				success: true,
				data: stats[0] || {},
				message: 'Sync statistics retrieved successfully',
			};
		} catch (error) {
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// ==========================================
	// DOMAIN CACHE METHODS
	// ==========================================

	/**
	 * Get domains from cache
	 */
	async getDomainsFromCache(nameFilter = null) {
		try {
			if (!this.dbPool) {
				return [];
			}

			const connection = await this.dbPool.getConnection();

			let query = 'SELECT * FROM domain_cache WHERE 1=1';
			let params = [];

			if (nameFilter) {
				query += ' AND name LIKE ?';
				params.push(`%${nameFilter}%`);
			}

			query += ' ORDER BY name';

			const [rows] = await connection.execute(query, params);
			connection.release();

			return rows.map((row) => ({
				id: row.id,
				name: row.name,
				status: row.status || 'unknown',
				created: row.created,
				owner: row.owner,
				hosting_type: row.hosting_type,
				www_root: row.www_root,
				ipAddresses: row.ip_addresses ? JSON.parse(row.ip_addresses) : [],
			}));
		} catch (error) {
			console.log('Cache not available:', error.message);
			return [];
		}
	}

	/**
	 * Fetch domains from Plesk and store in cache
	 */
	async fetchAndStoreDomains() {
		try {
			// Fetch basic domain list from Plesk (without status)
			const response = await this.executeRequest('GET', '/domains');

			if (!response.success) {
				return { success: false, error: response.error };
			}

			const domains = Array.isArray(response.data) ? response.data : [];
			console.log(`Fetched ${domains.length} domains from Plesk, storing in cache...`);

			// Store domains in cache with unknown status initially
			if (this.dbPool) {
				const connection = await this.dbPool.getConnection();

				for (const domain of domains) {
					await connection.execute(
						`
						INSERT INTO domain_cache 
						(id, name, status, created, owner, hosting_type, www_root, ip_addresses, last_updated)
						VALUES (?, ?, 'unknown', ?, ?, ?, ?, ?, NOW())
						ON DUPLICATE KEY UPDATE
						name = VALUES(name),
						created = VALUES(created),
						owner = VALUES(owner),
						hosting_type = VALUES(hosting_type),
						www_root = VALUES(www_root),
						ip_addresses = VALUES(ip_addresses),
						last_updated = NOW()
					`,
						[domain.id, domain.name || domain.ascii_name, domain.created || domain.created_at, domain.owner || domain.owner_login || 'admin', domain.hosting_type || 'virtual', domain.www_root || '', JSON.stringify(domain.ip_addresses || [])]
					);
				}

				connection.release();
			}

			return { success: true, count: domains.length };
		} catch (error) {
			console.error('Error fetching domains from Plesk:', error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Start background status sync for all domains
	 */
	async startStatusSync() {
		if (this.statusSyncRunning) {
			console.log('Status sync already running');
			return;
		}

		this.statusSyncRunning = true;

		// Don't await - let it run in background
		this.performStatusSync()
			.catch((error) => {
				console.error('Background status sync failed:', error.message);
			})
			.finally(() => {
				this.statusSyncRunning = false;
			});
	}

	/**
	 * Perform status sync for all cached domains
	 */
	async performStatusSync() {
		try {
			if (!this.dbPool) {
				return;
			}

			console.log('Starting background status sync...');

			const connection = await this.dbPool.getConnection();
			const [domains] = await connection.execute('SELECT id, name FROM domain_cache ORDER BY last_updated ASC');

			console.log(`Syncing status for ${domains.length} domains...`);

			// Update status in batches with delays
			const batchSize = 5;
			const delay = 3000; // 3 seconds between batches

			for (let i = 0; i < domains.length; i += batchSize) {
				const batch = domains.slice(i, i + batchSize);

				for (const domain of batch) {
					try {
						const statusResponse = await this.executeRequest('GET', `/domains/${domain.id}/status`);

						let status = 'unknown';
						if (statusResponse.success && statusResponse.data && statusResponse.data.status) {
							status = statusResponse.data.status;
						}

						// Update status in cache
						await connection.execute('UPDATE domain_cache SET status = ?, last_updated = NOW() WHERE id = ?', [status, domain.id]);

						console.log(`Updated ${domain.name}: ${status}`);
					} catch (error) {
						console.log(`Error updating ${domain.name}: ${error.message}`);
					}
				}

				// Wait between batches
				if (i + batchSize < domains.length) {
					console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, waiting ${delay / 1000}s...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}

			connection.release();
			console.log('Background status sync completed');
		} catch (error) {
			console.error('Error in status sync:', error.message);
		}
	}

	/**
	 * Get test domains fallback
	 */
	getTestDomains(nameFilter = null) {
		const testDomains = [
			{
				id: 1,
				name: 'example.com',
				status: 'active',
				created: '2024-01-15T10:30:00.000Z',
				ipAddresses: ['192.168.1.100'],
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
				id: 45,
				name: 'afinformatica.spot4all.com',
				status: 'suspended',
				created: '2024-03-10T09:15:00.000Z',
				ipAddresses: ['192.168.1.103'],
				owner: 'client3',
			},
		];

		let filteredDomains = testDomains;
		if (nameFilter) {
			filteredDomains = testDomains.filter((domain) => domain.name.toLowerCase().includes(nameFilter.toLowerCase()));
		}

		return {
			success: true,
			data: filteredDomains,
			message: 'Retrieved domains from test data (Plesk unavailable)',
		};
	}

	/**
	 * Force refresh domains (clear cache and refetch)
	 */
	async refreshDomains() {
		try {
			if (this.dbPool) {
				const connection = await this.dbPool.getConnection();
				await connection.execute('DELETE FROM domain_cache');
				connection.release();
				console.log('Cleared domain cache');
			}

			// Fetch fresh data
			const result = await this.fetchAndStoreDomains();
			if (result.success) {
				this.startStatusSync();
			}

			return result;
		} catch (error) {
			console.error('Error refreshing domains:', error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Get cache metadata (last updated, counts, etc)
	 */
	async getCacheMetadata() {
		try {
			if (!this.dbPool) {
				return { success: false, error: 'Database not available' };
			}

			const connection = await this.dbPool.getConnection();

			const [stats] = await connection.execute(`
				SELECT 
					COUNT(*) as total_domains,
					SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_domains,
					SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_domains,
					SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled_domains,
					SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown_domains,
					MAX(last_updated) as last_updated
				FROM domain_cache
			`);

			connection.release();

			return {
				success: true,
				data: stats[0] || {},
			};
		} catch (error) {
			return { success: false, error: error.message };
		}
	}
}

module.exports = PleskAPIClient;
