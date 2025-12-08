-- ======================================================================
-- PLESK API MANAGER - SEED DATA
-- ======================================================================
-- This script populates the database with sample data for testing and development
-- Run this after creating the schema
-- ======================================================================

USE plesk_manager;

-- ======================================================================
-- USER SEED DATA
-- ======================================================================

-- Additional test users (password for all: password123)
INSERT INTO
    `users` (
        `username`,
        `email`,
        `password_hash`,
        `first_name`,
        `last_name`,
        `role`,
        `is_active`,
        `email_verified`,
        `company`
    )
VALUES (
        'john_admin',
        'john@example.com',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
        'John',
        'Smith',
        'admin',
        TRUE,
        TRUE,
        'Tech Solutions Inc'
    ),
    (
        'jane_user',
        'jane@example.com',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
        'Jane',
        'Doe',
        'user',
        TRUE,
        TRUE,
        'Digital Agency LLC'
    ),
    (
        'bob_viewer',
        'bob@example.com',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
        'Bob',
        'Johnson',
        'viewer',
        TRUE,
        FALSE,
        'Web Services Co'
    ),
    (
        'alice_manager',
        'alice@example.com',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
        'Alice',
        'Wilson',
        'admin',
        TRUE,
        TRUE,
        'Cloud Hosting Ltd'
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- ======================================================================
-- PLESK SERVER SEED DATA
-- ======================================================================

-- Sample Plesk servers (encrypted fields are base64 encoded for demo)
INSERT INTO
    `plesk_servers` (
        `name`,
        `host`,
        `port`,
        `username`,
        `password_encrypted`,
        `ssl_verify`,
        `is_active`,
        `is_default`,
        `status`
    )
VALUES (
        'Primary Plesk Server',
        'plesk1.example.com',
        8443,
        'admin',
        'ZGVtb19wYXNzd29yZA==', -- demo_password (base64)
        TRUE,
        TRUE,
        TRUE,
        'connected'
    ),
    (
        'Secondary Plesk Server',
        'plesk2.example.com',
        8443,
        'root',
        'c2Vjb25kYXJ5X3Bhc3M=', -- secondary_pass (base64)
        TRUE,
        TRUE,
        FALSE,
        'disconnected'
    ),
    (
        'Development Server',
        'dev.plesk.local',
        8443,
        'admin',
        'ZGV2X3Bhc3N3b3Jk', -- dev_password (base64)
        FALSE,
        TRUE,
        FALSE,
        'connected'
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- ======================================================================
-- SAMPLE PLESK DATA
-- ======================================================================

-- Sample domains cache
INSERT INTO
    `plesk_domains` (
        `plesk_server_id`,
        `plesk_domain_id`,
        `name`,
        `status`,
        `owner`,
        `customer_login`,
        `ip_addresses`,
        `created_date`
    )
VALUES (
        1,
        1,
        'example.com',
        'active',
        'admin',
        'customer1',
        '["192.168.1.100"]',
        '2024-01-15 10:30:00'
    ),
    (
        1,
        2,
        'testsite.org',
        'active',
        'admin',
        'customer1',
        '["192.168.1.100"]',
        '2024-01-20 14:45:00'
    ),
    (
        1,
        3,
        'demo.net',
        'suspended',
        'admin',
        'customer2',
        '["192.168.1.101"]',
        '2024-02-01 09:15:00'
    ),
    (
        1,
        4,
        'mycompany.biz',
        'active',
        'admin',
        'customer3',
        '["192.168.1.102"]',
        '2024-02-10 16:20:00'
    ),
    (
        2,
        5,
        'backup-site.com',
        'active',
        'root',
        'customer1',
        '["10.0.0.50"]',
        '2024-01-25 11:00:00'
    ),
    (
        3,
        6,
        'dev-test.local',
        'active',
        'admin',
        'developer',
        '["192.168.100.10"]',
        '2024-02-15 08:30:00'
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- Sample customers cache
INSERT INTO
    `plesk_customers` (
        `plesk_server_id`,
        `plesk_customer_id`,
        `login`,
        `name`,
        `email`,
        `company`,
        `phone`,
        `status`,
        `created_date`
    )
VALUES (
        1,
        1,
        'customer1',
        'Michael Brown',
        'michael@customer1.com',
        'Brown Enterprises',
        '+1-555-0101',
        'active',
        '2024-01-10 09:00:00'
    ),
    (
        1,
        2,
        'customer2',
        'Sarah Davis',
        'sarah@customer2.com',
        'Davis Marketing',
        '+1-555-0102',
        'active',
        '2024-01-12 10:30:00'
    ),
    (
        1,
        3,
        'customer3',
        'Robert Miller',
        'robert@customer3.com',
        'Miller Tech Solutions',
        '+1-555-0103',
        'active',
        '2024-01-14 14:15:00'
    ),
    (
        2,
        4,
        'customer1',
        'Jennifer Wilson',
        'jennifer@backup-customer.com',
        'Wilson Consulting',
        '+1-555-0201',
        'active',
        '2024-01-20 11:45:00'
    ),
    (
        3,
        5,
        'developer',
        'Alex Thompson',
        'alex@devcompany.com',
        'Dev Company LLC',
        '+1-555-0301',
        'active',
        '2024-02-01 08:00:00'
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- ======================================================================
-- API KEYS SEED DATA
-- ======================================================================

-- Sample API keys (hashed values for demo)
INSERT INTO
    `api_keys` (
        `user_id`,
        `plesk_server_id`,
        `key_name`,
        `key_hash`,
        `permissions`,
        `is_active`,
        `expires_at`
    )
VALUES (
        1,
        1,
        'Admin Primary Key',
        'hash_of_admin_key_123',
        '{"domains": ["read", "write"], "customers": ["read", "write"], "server": ["read"]}',
        TRUE,
        '2025-12-31 23:59:59'
    ),
    (
        2,
        1,
        'John Development Key',
        'hash_of_john_key_456',
        '{"domains": ["read", "write"], "customers": ["read"]}',
        TRUE,
        '2025-06-30 23:59:59'
    ),
    (
        3,
        1,
        'Jane Limited Key',
        'hash_of_jane_key_789',
        '{"domains": ["read"], "customers": ["read"]}',
        TRUE,
        '2025-03-31 23:59:59'
    ),
    (
        4,
        2,
        'Alice Backup Server Key',
        'hash_of_alice_key_101',
        '{"domains": ["read", "write"], "customers": ["read", "write"], "server": ["read", "write"]}',
        TRUE,
        NULL
    )
ON DUPLICATE KEY UPDATE
    `updated_at` = CURRENT_TIMESTAMP;

-- ======================================================================
-- ACTIVITY LOG SEED DATA
-- ======================================================================

-- Sample user activity logs
INSERT INTO
    `user_activity_log` (
        `user_id`,
        `activity_type`,
        `description`,
        `target_resource`,
        `target_id`,
        `request_method`,
        `request_path`,
        `ip_address`,
        `user_agent`
    )
VALUES (
        1,
        'LOGIN',
        'User logged in successfully',
        'auth',
        NULL,
        'POST',
        '/api/system/users/login',
        '192.168.1.50',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    ),
    (
        1,
        'DOMAIN_CREATE',
        'Created new domain',
        'domain',
        'example.com',
        'POST',
        '/api/plesk/domains',
        '192.168.1.50',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    ),
    (
        2,
        'LOGIN',
        'User logged in successfully',
        'auth',
        NULL,
        'POST',
        '/api/system/users/login',
        '10.0.0.25',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    ),
    (
        2,
        'DOMAIN_VIEW',
        'Viewed domain details',
        'domain',
        'testsite.org',
        'GET',
        '/api/plesk/domains/2',
        '10.0.0.25',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    ),
    (
        3,
        'LOGIN',
        'User logged in successfully',
        'auth',
        NULL,
        'POST',
        '/api/system/users/login',
        '172.16.0.10',
        'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0'
    ),
    (
        4,
        'LOGIN',
        'User logged in successfully',
        'auth',
        NULL,
        'POST',
        '/api/system/users/login',
        '203.0.113.45',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0'
    ),
    (
        4,
        'SERVER_CHECK',
        'Checked server status',
        'server',
        '2',
        'GET',
        '/api/plesk/server/info',
        '203.0.113.45',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0'
    )
ON DUPLICATE KEY UPDATE
    `created_at` = VALUES(`created_at`);

-- ======================================================================
-- API REQUEST LOG SEED DATA
-- ======================================================================

-- Sample API request logs for analytics
INSERT INTO
    `api_request_log` (
        `user_id`,
        `plesk_server_id`,
        `endpoint`,
        `method`,
        `response_status`,
        `response_time_ms`,
        `ip_address`,
        `user_agent`
    )
VALUES (
        1,
        1,
        '/api/plesk/domains',
        'GET',
        200,
        245,
        '192.168.1.50',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    ),
    (
        1,
        1,
        '/api/plesk/customers',
        'GET',
        200,
        189,
        '192.168.1.50',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    ),
    (
        2,
        1,
        '/api/plesk/domains/1',
        'GET',
        200,
        156,
        '10.0.0.25',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    ),
    (
        2,
        1,
        '/api/plesk/domains',
        'POST',
        201,
        1250,
        '10.0.0.25',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    ),
    (
        3,
        1,
        '/api/plesk/domains',
        'GET',
        200,
        234,
        '172.16.0.10',
        'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0'
    ),
    (
        4,
        2,
        '/api/plesk/server/info',
        'GET',
        200,
        567,
        '203.0.113.45',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0'
    ),
    (
        4,
        2,
        '/api/admin/server/ips',
        'GET',
        200,
        298,
        '203.0.113.45',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0'
    )
ON DUPLICATE KEY UPDATE
    `created_at` = VALUES(`created_at`);

-- ======================================================================
-- NOTIFICATIONS SEED DATA
-- ======================================================================

-- Sample notifications
INSERT INTO
    `user_notifications` (
        `user_id`,
        `type`,
        `title`,
        `message`,
        `action_url`
    )
VALUES (
        1,
        'info',
        'Welcome to Plesk API Manager',
        'Your account has been set up successfully. Start by configuring your first Plesk server.',
        '/settings'
    ),
    (
        1,
        'success',
        'Server Connected',
        'Primary Plesk Server has been connected successfully.',
        '/dashboard'
    ),
    (
        2,
        'warning',
        'API Key Expiring Soon',
        'Your Development API key will expire in 30 days. Please renew it to avoid service interruption.',
        '/profile/api-keys'
    ),
    (
        3,
        'info',
        'New Feature Available',
        'Check out our new domain analytics dashboard for detailed insights.',
        '/domains'
    ),
    (
        4,
        'error',
        'Server Connection Failed',
        'Unable to connect to Secondary Plesk Server. Please check the configuration.',
        '/settings/servers'
    )
ON DUPLICATE KEY UPDATE
    `created_at` = VALUES(`created_at`);

-- ======================================================================
-- SUMMARY
-- ======================================================================

SELECT
    'Seed data inserted successfully!' as Status,
    (
        SELECT COUNT(*)
        FROM users
    ) as Total_Users,
    (
        SELECT COUNT(*)
        FROM plesk_servers
    ) as Total_Servers,
    (
        SELECT COUNT(*)
        FROM plesk_domains
    ) as Total_Domains,
    (
        SELECT COUNT(*)
        FROM plesk_customers
    ) as Total_Customers,
    (
        SELECT COUNT(*)
        FROM api_keys
    ) as Total_API_Keys,
    (
        SELECT COUNT(*)
        FROM user_activity_log
    ) as Activity_Logs,
    (
        SELECT COUNT(*)
        FROM user_notifications
    ) as Notifications;