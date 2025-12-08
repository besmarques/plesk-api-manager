const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const mysql = require('mysql2/promise');

const router = express.Router();

// Database connection configuration
const dbConfig = {
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'plesk_manager',
	port: process.env.DB_PORT || 3306,
};

// Create database connection pool
const pool = mysql.createPool({
	...dbConfig,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

// Validation schemas
const registerSchema = Joi.object({
	username: Joi.string().alphanum().min(3).max(30).required(),
	email: Joi.string().email().required(),
	password: Joi.string().min(6).required(),
	firstName: Joi.string().min(2).max(50).required(),
	lastName: Joi.string().min(2).max(50).required(),
	role: Joi.string().valid('admin', 'user').default('user'),
});

const loginSchema = Joi.object({
	username: Joi.string().required(),
	password: Joi.string().required(),
});

// JWT middleware for protected routes
const authenticateToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		return res.status(401).json({
			success: false,
			error: 'Access token required',
		});
	}

	jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key', (err, user) => {
		if (err) {
			return res.status(403).json({
				success: false,
				error: 'Invalid or expired token',
			});
		}
		req.user = user;
		next();
	});
};

// Initialize database tables
const initializeDatabase = async () => {
	try {
		const connection = await pool.getConnection();

		// Create users table
		await connection.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id INT AUTO_INCREMENT PRIMARY KEY,
				username VARCHAR(50) UNIQUE NOT NULL,
				email VARCHAR(100) UNIQUE NOT NULL,
				password_hash VARCHAR(255) NOT NULL,
				first_name VARCHAR(50) NOT NULL,
				last_name VARCHAR(50) NOT NULL,
				role ENUM('admin', 'user') DEFAULT 'user',
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				last_login TIMESTAMP NULL
			)
		`);

		// Create user sessions table
		await connection.execute(`
			CREATE TABLE IF NOT EXISTS user_sessions (
				id INT AUTO_INCREMENT PRIMARY KEY,
				user_id INT NOT NULL,
				token_hash VARCHAR(255) NOT NULL,
				expires_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`);

		// Create user activity log table
		await connection.execute(`
			CREATE TABLE IF NOT EXISTS user_activity_log (
				id INT AUTO_INCREMENT PRIMARY KEY,
				user_id INT NOT NULL,
				activity_type VARCHAR(50) NOT NULL,
				description TEXT,
				ip_address VARCHAR(45),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`);

		connection.release();
		console.log('Database tables initialized successfully');
	} catch (error) {
		console.error('Failed to initialize database:', error);
	}
};

// Initialize database on module load
initializeDatabase();

/**
 * POST /api/users/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
	try {
		const { error, value } = registerSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const { username, email, password, firstName, lastName, role } = value;
		const connection = await pool.getConnection();

		// Check if user already exists
		const [existingUsers] = await connection.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);

		if (existingUsers.length > 0) {
			connection.release();
			return res.status(409).json({
				success: false,
				error: 'Username or email already exists',
			});
		}

		// Hash password
		const saltRounds = 12;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Insert new user
		const [result] = await connection.execute('INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)', [username, email, passwordHash, firstName, lastName, role]);

		connection.release();

		res.status(201).json({
			success: true,
			message: 'User registered successfully',
			data: {
				id: result.insertId,
				username,
				email,
				firstName,
				lastName,
				role,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/users/login
 * User login
 */
router.post('/login', async (req, res) => {
	try {
		const { error, value } = loginSchema.validate(req.body);
		if (error) {
			return res.status(400).json({
				success: false,
				error: 'Validation error',
				details: error.details.map((detail) => detail.message),
			});
		}

		const { username, password } = value;
		const connection = await pool.getConnection();

		// Find user by username or email
		const [users] = await connection.execute('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE', [username, username]);

		if (users.length === 0) {
			connection.release();
			return res.status(401).json({
				success: false,
				error: 'Invalid credentials',
			});
		}

		const user = users[0];

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			connection.release();
			return res.status(401).json({
				success: false,
				error: 'Invalid credentials',
			});
		}

		// Update last login
		await connection.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

		// Log activity
		await connection.execute('INSERT INTO user_activity_log (user_id, activity_type, description, ip_address) VALUES (?, ?, ?, ?)', [user.id, 'LOGIN', 'User logged in', req.ip]);

		connection.release();

		// Generate JWT token
		const token = jwt.sign(
			{
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
			},
			process.env.JWT_SECRET || 'default-secret-key',
			{ expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
		);

		res.json({
			success: true,
			message: 'Login successful',
			data: {
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					firstName: user.first_name,
					lastName: user.last_name,
					role: user.role,
				},
				token,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * POST /api/users/logout
 * User logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
	try {
		const connection = await pool.getConnection();

		// Log activity
		await connection.execute('INSERT INTO user_activity_log (user_id, activity_type, description, ip_address) VALUES (?, ?, ?, ?)', [req.user.id, 'LOGOUT', 'User logged out', req.ip]);

		connection.release();

		res.json({
			success: true,
			message: 'Logout successful',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
	try {
		const connection = await pool.getConnection();

		const [users] = await connection.execute('SELECT id, username, email, first_name, last_name, role, created_at, last_login FROM users WHERE id = ?', [req.user.id]);

		connection.release();

		if (users.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		const user = users[0];
		res.json({
			success: true,
			data: {
				id: user.id,
				username: user.username,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				role: user.role,
				createdAt: user.created_at,
				lastLogin: user.last_login,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', authenticateToken, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Admin access required',
			});
		}

		const connection = await pool.getConnection();

		const [users] = await connection.execute('SELECT id, username, email, first_name, last_name, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC');

		connection.release();

		res.json({
			success: true,
			data: users.map((user) => ({
				id: user.id,
				username: user.username,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				role: user.role,
				isActive: user.is_active,
				createdAt: user.created_at,
				lastLogin: user.last_login,
			})),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * GET /api/users/activity
 * Get user activity log
 */
router.get('/activity', authenticateToken, async (req, res) => {
	try {
		const { limit = 50, offset = 0 } = req.query;
		const connection = await pool.getConnection();

		// Ensure numeric values and set reasonable limits
		const limitNum = Math.min(parseInt(limit, 10) || 50, 100); // Cap at 100
		const offsetNum = Math.max(parseInt(offset, 10) || 0, 0); // Ensure non-negative

		let activities;

		// Admin can view all activity
		if (req.user.role === 'admin' && req.query.user_id) {
			// Admin viewing specific user's activity
			const userIdNum = parseInt(req.query.user_id, 10);
			if (isNaN(userIdNum)) {
				connection.release();
				return res.status(400).json({
					success: false,
					error: 'Invalid user_id parameter',
				});
			}
			[activities] = await connection.execute(`SELECT * FROM user_activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`, [userIdNum]);
		} else if (req.user.role === 'admin' && !req.query.user_id) {
			// Admin viewing all activity
			[activities] = await connection.execute(`SELECT al.*, u.username FROM user_activity_log al JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`);
		} else {
			// Regular user viewing their own activity
			[activities] = await connection.execute(`SELECT * FROM user_activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`, [req.user.id]);
		}

		connection.release();

		res.json({
			success: true,
			data: activities || [],
		});
	} catch (error) {
		console.error('Activity log error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticateToken, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Admin access required',
			});
		}

		const { id } = req.params;
		const { firstName, lastName, email, role, isActive } = req.body;
		const userId = parseInt(id);

		if (isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid user ID',
			});
		}

		const connection = await pool.getConnection();

		// Check if user exists
		const [existingUsers] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
		if (existingUsers.length === 0) {
			connection.release();
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Update user
		await connection.execute('UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, is_active = ? WHERE id = ?', [firstName, lastName, email, role, isActive ? 1 : 0, userId]);

		// Log activity
		await connection.execute('INSERT INTO user_activity_log (user_id, activity_type, description, ip_address) VALUES (?, ?, ?, ?)', [req.user.id, 'USER_UPDATE', `Updated user ${userId}`, req.ip]);

		connection.release();

		res.json({
			success: true,
			message: 'User updated successfully',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Admin access required',
			});
		}

		const { id } = req.params;
		const userId = parseInt(id);

		if (isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid user ID',
			});
		}

		// Prevent deleting self
		if (userId === req.user.id) {
			return res.status(400).json({
				success: false,
				error: 'Cannot delete your own account',
			});
		}

		const connection = await pool.getConnection();

		// Check if user exists
		const [existingUsers] = await connection.execute('SELECT username FROM users WHERE id = ?', [userId]);
		if (existingUsers.length === 0) {
			connection.release();
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		const username = existingUsers[0].username;

		// Delete user (CASCADE will handle related records)
		await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

		// Log activity
		await connection.execute('INSERT INTO user_activity_log (user_id, activity_type, description, ip_address) VALUES (?, ?, ?, ?)', [req.user.id, 'USER_DELETE', `Deleted user ${username} (ID: ${userId})`, req.ip]);

		connection.release();

		res.json({
			success: true,
			message: 'User deleted successfully',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

module.exports = router;
