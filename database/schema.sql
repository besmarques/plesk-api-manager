-- ======================================================================
-- Plesk API Manager Database Schema
-- ======================================================================
-- This script creates the complete database structure for the Plesk API Manager
-- including user management, authentication, and activity logging tables.
--
-- Usage:
-- 1. Create database: CREATE DATABASE plesk_manager;
-- 2. Use database: USE plesk_manager;
-- 3. Run this script to create all tables
-- ======================================================================

SET foreign_key_checks = 0;

SET
    sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ======================================================================
-- USER MANAGEMENT TABLES
-- ======================================================================

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `role` ENUM('admin', 'user', 'viewer') DEFAULT 'user',
    `is_active` BOOLEAN DEFAULT TRUE,
    `email_verified` BOOLEAN DEFAULT FALSE,
    `phone` VARCHAR(20) NULL,
    `company` VARCHAR(100) NULL,
    `avatar_url` VARCHAR(255) NULL,
    `preferences` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login` TIMESTAMP NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires` TIMESTAMP NULL,
    `email_verification_token` VARCHAR(255) NULL,
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_role` (`role`),
    INDEX `idx_active` (`is_active`),
    INDEX `idx_created` (`created_at`),
    INDEX `idx_last_login` (`last_login`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- User sessions table for JWT token management
CREATE TABLE IF NOT EXISTS `user_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `device_info` JSON NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` TEXT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_token_hash` (`token_hash`),
    INDEX `idx_expires_at` (`expires_at`),
    INDEX `idx_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- User activity log for audit trail
CREATE TABLE IF NOT EXISTS `user_activity_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `activity_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `target_resource` VARCHAR(100) NULL,
    `target_id` VARCHAR(50) NULL,
    `request_method` VARCHAR(10) NULL,
    `request_path` VARCHAR(255) NULL,
    `request_data` JSON NULL,
    `response_status` INT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_activity_type` (`activity_type`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_target_resource` (`target_resource`),
    INDEX `idx_ip_address` (`ip_address`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- PLESK INTEGRATION TABLES
-- ======================================================================

-- Plesk servers configuration
CREATE TABLE IF NOT EXISTS `plesk_servers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `host` VARCHAR(255) NOT NULL,
    `port` INT DEFAULT 8443,
    `username` VARCHAR(100) NOT NULL,
    `password_encrypted` TEXT NULL,
    `api_key_encrypted` TEXT NULL,
    `ssl_verify` BOOLEAN DEFAULT TRUE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_default` BOOLEAN DEFAULT FALSE,
    `version` VARCHAR(50) NULL,
    `platform` VARCHAR(50) NULL,
    `last_check` TIMESTAMP NULL,
    `status` ENUM(
        'connected',
        'disconnected',
        'error'
    ) DEFAULT 'disconnected',
    `error_message` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_host` (`host`),
    INDEX `idx_active` (`is_active`),
    INDEX `idx_default` (`is_default`),
    INDEX `idx_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Domain cache for faster access
CREATE TABLE IF NOT EXISTS `plesk_domains` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `plesk_server_id` INT NOT NULL,
    `plesk_domain_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` ENUM(
        'active',
        'suspended',
        'disabled'
    ) DEFAULT 'active',
    `owner` VARCHAR(100) NULL,
    `customer_login` VARCHAR(100) NULL,
    `ip_addresses` JSON NULL,
    `created_date` TIMESTAMP NULL,
    `expiration_date` TIMESTAMP NULL,
    `last_sync` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`plesk_server_id`) REFERENCES `plesk_servers` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_domain_per_server` (
        `plesk_server_id`,
        `plesk_domain_id`
    ),
    INDEX `idx_name` (`name`),
    INDEX `idx_status` (`status`),
    INDEX `idx_owner` (`owner`),
    INDEX `idx_last_sync` (`last_sync`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Customer cache for faster access
CREATE TABLE IF NOT EXISTS `plesk_customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `plesk_server_id` INT NOT NULL,
    `plesk_customer_id` INT NOT NULL,
    `login` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NULL,
    `company` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `status` ENUM(
        'active',
        'suspended',
        'disabled'
    ) DEFAULT 'active',
    `created_date` TIMESTAMP NULL,
    `last_sync` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`plesk_server_id`) REFERENCES `plesk_servers` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_customer_per_server` (
        `plesk_server_id`,
        `plesk_customer_id`
    ),
    INDEX `idx_login` (`login`),
    INDEX `idx_email` (`email`),
    INDEX `idx_status` (`status`),
    INDEX `idx_last_sync` (`last_sync`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- API MANAGEMENT TABLES
-- ======================================================================

-- API keys for Plesk authentication
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `plesk_server_id` INT NULL,
    `key_name` VARCHAR(100) NOT NULL,
    `key_hash` VARCHAR(255) NOT NULL,
    `permissions` JSON NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `expires_at` TIMESTAMP NULL,
    `last_used_at` TIMESTAMP NULL,
    `usage_count` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`plesk_server_id`) REFERENCES `plesk_servers` (`id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_key_hash` (`key_hash`),
    INDEX `idx_active` (`is_active`),
    INDEX `idx_expires_at` (`expires_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- API request log for monitoring and analytics
CREATE TABLE IF NOT EXISTS `api_request_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `session_id` VARCHAR(100) NULL,
    `plesk_server_id` INT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `request_data` JSON NULL,
    `response_status` INT NULL,
    `response_time_ms` INT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` TEXT NULL,
    `error_message` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`plesk_server_id`) REFERENCES `plesk_servers` (`id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_endpoint` (`endpoint`),
    INDEX `idx_method` (`method`),
    INDEX `idx_status` (`response_status`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_ip_address` (`ip_address`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- SYSTEM CONFIGURATION TABLES
-- ======================================================================

-- Application settings
CREATE TABLE IF NOT EXISTS `app_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    `value` TEXT NULL,
    `type` ENUM(
        'string',
        'number',
        'boolean',
        'json'
    ) DEFAULT 'string',
    `description` TEXT NULL,
    `is_public` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_key` (`key`),
    INDEX `idx_public` (`is_public`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Notification templates
CREATE TABLE IF NOT EXISTS `notification_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) UNIQUE NOT NULL,
    `type` ENUM(
        'email',
        'sms',
        'push',
        'webhook'
    ) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_type` (`type`),
    INDEX `idx_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- User notifications
CREATE TABLE IF NOT EXISTS `user_notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `type` ENUM(
        'info',
        'success',
        'warning',
        'error'
    ) DEFAULT 'info',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `action_url` VARCHAR(255) NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_type` (`type`),
    INDEX `idx_read` (`is_read`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- INITIAL DATA
-- ======================================================================

-- Insert default admin user (password: admin123)
INSERT INTO
    `users` (
        `username`,
        `email`,
        `password_hash`,
        `first_name`,
        `last_name`,
        `role`,
        `is_active`,
        `email_verified`
    )
VALUES (
        'admin',
        'admin@pleskmanager.local',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwxXBmKzAmOH5i.FK', -- admin123
        'System',
        'Administrator',
        'admin',
        TRUE,
        TRUE
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- Insert default application settings
INSERT INTO
    `app_settings` (
        `key`,
        `value`,
        `type`,
        `description`,
        `is_public`
    )
VALUES (
        'app_name',
        'Plesk API Manager',
        'string',
        'Application name',
        TRUE
    ),
    (
        'app_version',
        '1.0.0',
        'string',
        'Application version',
        TRUE
    ),
    (
        'maintenance_mode',
        'false',
        'boolean',
        'Enable maintenance mode',
        FALSE
    ),
    (
        'max_login_attempts',
        '5',
        'number',
        'Maximum login attempts before lockout',
        FALSE
    ),
    (
        'session_timeout',
        '24',
        'number',
        'Session timeout in hours',
        FALSE
    ),
    (
        'password_min_length',
        '6',
        'number',
        'Minimum password length',
        TRUE
    ),
    (
        'api_rate_limit',
        '100',
        'number',
        'API requests per minute per user',
        FALSE
    ),
    (
        'enable_registration',
        'false',
        'boolean',
        'Allow user registration',
        TRUE
    ),
    (
        'email_verification_required',
        'false',
        'boolean',
        'Require email verification',
        TRUE
    ),
    (
        'default_theme',
        'light',
        'string',
        'Default UI theme',
        TRUE
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- Insert notification templates
INSERT INTO
    `notification_templates` (
        `name`,
        `type`,
        `subject`,
        `body`,
        `variables`
    )
VALUES (
        'welcome_email',
        'email',
        'Welcome to Plesk API Manager',
        'Hello {{first_name}},\n\nWelcome to Plesk API Manager! Your account has been created successfully.\n\nUsername: {{username}}\nEmail: {{email}}\n\nPlease log in and change your password.\n\nBest regards,\nPlesk API Manager Team',
        '["first_name", "username", "email"]'
    ),
    (
        'password_reset',
        'email',
        'Password Reset Request',
        'Hello {{first_name}},\n\nA password reset has been requested for your account.\n\nClick the link below to reset your password:\n{{reset_url}}\n\nThis link will expire in 1 hour.\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nPlesk API Manager Team',
        '["first_name", "reset_url"]'
    ),
    (
        'login_alert',
        'email',
        'New Login Alert',
        'Hello {{first_name}},\n\nA new login to your account was detected:\n\nTime: {{login_time}}\nIP Address: {{ip_address}}\nDevice: {{user_agent}}\n\nIf this was not you, please change your password immediately.\n\nBest regards,\nPlesk API Manager Team',
        '["first_name", "login_time", "ip_address", "user_agent"]'
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

SET foreign_key_checks = 1;

-- ======================================================================
-- INDEXES AND PERFORMANCE OPTIMIZATION
-- ======================================================================

-- Additional indexes for performance
CREATE INDEX `idx_users_role_active` ON `users` (`role`, `is_active`);

CREATE INDEX `idx_activity_user_type_date` ON `user_activity_log` (
    `user_id`,
    `activity_type`,
    `created_at`
);

CREATE INDEX `idx_api_log_user_endpoint_date` ON `api_request_log` (
    `user_id`,
    `endpoint`,
    `created_at`
);

CREATE INDEX `idx_sessions_user_active` ON `user_sessions` (`user_id`, `is_active`);

CREATE INDEX `idx_notifications_user_read_date` ON `user_notifications` (
    `user_id`,
    `is_read`,
    `created_at`
);

-- ======================================================================
-- VIEWS FOR COMMON QUERIES
-- ======================================================================

-- Active users with last activity
CREATE OR REPLACE VIEW `v_active_users` AS
SELECT
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.last_login,
    u.created_at,
    COALESCE(
        al.last_activity,
        u.last_login
    ) as last_activity,
    CASE
        WHEN u.last_login > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'active'
        WHEN u.last_login > DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'inactive'
        ELSE 'dormant'
    END as activity_status
FROM `users` u
    LEFT JOIN (
        SELECT user_id, MAX(created_at) as last_activity
        FROM `user_activity_log`
        GROUP BY
            user_id
    ) al ON u.id = al.user_id
WHERE
    u.is_active = TRUE;

-- API usage statistics
CREATE OR REPLACE VIEW `v_api_usage_stats` AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(response_time_ms) as avg_response_time,
    COUNT(
        CASE
            WHEN response_status >= 200
            AND response_status < 300 THEN 1
        END
    ) as successful_requests,
    COUNT(
        CASE
            WHEN response_status >= 400 THEN 1
        END
    ) as error_requests
FROM `api_request_log`
WHERE
    created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY
    DATE(created_at)
ORDER BY date DESC;

-- Show schema information
SHOW TABLES;

SELECT 'Database schema created successfully!' as Status;