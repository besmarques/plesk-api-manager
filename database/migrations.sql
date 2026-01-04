-- ======================================================================
-- PLESK API MANAGER - DATABASE MIGRATION SCRIPTS
-- ======================================================================
-- This file contains database migration scripts for updates and changes
-- ======================================================================

-- ======================================================================
-- MIGRATION: Add indexes for better performance
-- ======================================================================
-- Version: 1.1.0
-- Date: 2024-02-20

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users (email, is_active);

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_plesk_servers_status ON plesk_servers (status);

CREATE INDEX IF NOT EXISTS idx_plesk_servers_active_default ON plesk_servers (is_active, is_default);

CREATE INDEX IF NOT EXISTS idx_plesk_domains_server_status ON plesk_domains (plesk_server_id, status);

CREATE INDEX IF NOT EXISTS idx_plesk_domains_name ON plesk_domains (name);

CREATE INDEX IF NOT EXISTS idx_plesk_customers_server_status ON plesk_customers (plesk_server_id, status);

CREATE INDEX IF NOT EXISTS idx_plesk_customers_login ON plesk_customers (login);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_server_active ON api_keys (plesk_server_id, is_active);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_log_type_date ON user_activity_log (activity_type, created_at);

CREATE INDEX IF NOT EXISTS idx_api_requests_user_date ON api_request_log (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_api_requests_server_date ON api_request_log (plesk_server_id, created_at);

CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_request_log (endpoint);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON user_notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_type_date ON user_notifications(type, created_at);

-- ======================================================================
-- MIGRATION: Add new columns for enhanced features
-- ======================================================================
-- Version: 1.2.0
-- Date: 2024-03-01

-- Add timezone support
ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC' AFTER last_login,
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'Y-m-d' AFTER timezone,
ADD COLUMN IF NOT EXISTS time_format VARCHAR(20) DEFAULT 'H:i:s' AFTER date_format;

-- Add server grouping
ALTER TABLE plesk_servers
ADD COLUMN IF NOT EXISTS server_group VARCHAR(100) DEFAULT 'default' AFTER platform,
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1 AFTER server_group,
ADD COLUMN IF NOT EXISTS max_connections INT DEFAULT 10 AFTER priority;

-- Add domain statistics
ALTER TABLE plesk_domains
ADD COLUMN IF NOT EXISTS disk_usage BIGINT DEFAULT 0 AFTER ip_addresses,
ADD COLUMN IF NOT EXISTS bandwidth_usage BIGINT DEFAULT 0 AFTER disk_usage,
ADD COLUMN IF NOT EXISTS last_backup DATE AFTER bandwidth_usage;

-- Add API key usage tracking
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NULL AFTER expires_at,
ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0 AFTER last_used_at,
ADD COLUMN IF NOT EXISTS rate_limit_per_hour INT DEFAULT 1000 AFTER usage_count;

-- Domain cache table used by runtime caching
CREATE TABLE IF NOT EXISTS domain_cache (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status ENUM('active', 'suspended', 'disabled', 'unknown') DEFAULT 'unknown',
    created DATETIME NULL,
    owner VARCHAR(100),
    hosting_type VARCHAR(50),
    www_root TEXT,
    ip_addresses JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sync_error TEXT NULL,
    INDEX idx_domain_cache_name (name),
    INDEX idx_domain_cache_status (status),
    INDEX idx_domain_cache_last_updated (last_updated)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- MIGRATION: Add backup and monitoring tables
-- ======================================================================
-- Version: 1.3.0
-- Date: 2024-03-15

-- Table for tracking backup operations
CREATE TABLE IF NOT EXISTS backup_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plesk_server_id INT NOT NULL,
    backup_type ENUM(
        'full',
        'incremental',
        'domains',
        'databases'
    ) NOT NULL,
    target_resource VARCHAR(255),
    target_id VARCHAR(100),
    status ENUM(
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled'
    ) DEFAULT 'pending',
    backup_size BIGINT DEFAULT 0,
    backup_path VARCHAR(500),
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (plesk_server_id) REFERENCES plesk_servers (id) ON DELETE CASCADE,
    INDEX idx_backup_user_date (user_id, created_at),
    INDEX idx_backup_server_status (plesk_server_id, status),
    INDEX idx_backup_type_status (backup_type, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Table for monitoring alerts
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plesk_server_id INT NOT NULL,
    alert_type ENUM(
        'server_down',
        'high_cpu',
        'high_memory',
        'disk_space',
        'domain_expired',
        'ssl_expired',
        'custom'
    ) NOT NULL,
    severity ENUM(
        'info',
        'warning',
        'error',
        'critical'
    ) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    threshold_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    target_resource VARCHAR(255),
    target_id VARCHAR(100),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plesk_server_id) REFERENCES plesk_servers (id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_alerts_server_resolved (plesk_server_id, is_resolved),
    INDEX idx_alerts_type_severity (alert_type, severity),
    INDEX idx_alerts_date (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- MIGRATION: Add webhook and integration tables
-- ======================================================================
-- Version: 1.4.0
-- Date: 2024-04-01

-- Table for webhook configurations
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL COMMENT 'Array of event types to trigger webhook',
    secret_token VARCHAR(255) COMMENT 'Secret for webhook authentication',
    is_active BOOLEAN DEFAULT TRUE,
    ssl_verify BOOLEAN DEFAULT TRUE,
    timeout_seconds INT DEFAULT 30,
    retry_attempts INT DEFAULT 3,
    last_triggered_at TIMESTAMP NULL,
    last_status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_webhook_user_active (user_id, is_active),
    INDEX idx_webhook_events (events (255))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Table for webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_endpoint_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    payload_hash VARCHAR(64),
    delivery_attempt INT DEFAULT 1,
    response_status_code INT,
    response_body TEXT,
    response_time_ms INT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_endpoint_id) REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
    INDEX idx_webhook_deliveries_endpoint_date (
        webhook_endpoint_id,
        delivered_at
    ),
    INDEX idx_webhook_deliveries_event (event_type, delivered_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- MIGRATION: Add system health and statistics tables
-- ======================================================================
-- Version: 1.5.0
-- Date: 2024-04-15

-- Table for system health metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plesk_server_id INT NOT NULL,
    metric_type ENUM(
        'cpu',
        'memory',
        'disk',
        'network',
        'load',
        'custom'
    ) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(20) DEFAULT '%',
    threshold_warning DECIMAL(10, 4),
    threshold_critical DECIMAL(10, 4),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plesk_server_id) REFERENCES plesk_servers (id) ON DELETE CASCADE,
    INDEX idx_health_server_type_date (
        plesk_server_id,
        metric_type,
        collected_at
    ),
    INDEX idx_health_name_date (metric_name, collected_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Table for daily statistics aggregation
CREATE TABLE IF NOT EXISTS daily_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    plesk_server_id INT,
    total_domains INT DEFAULT 0,
    active_domains INT DEFAULT 0,
    total_customers INT DEFAULT 0,
    total_api_requests INT DEFAULT 0,
    avg_response_time_ms DECIMAL(10, 2) DEFAULT 0,
    total_users_active INT DEFAULT 0,
    total_backup_operations INT DEFAULT 0,
    total_alerts INT DEFAULT 0,
    storage_used_gb DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plesk_server_id) REFERENCES plesk_servers (id) ON DELETE CASCADE,
    UNIQUE KEY idx_daily_stats_date_server (date, plesk_server_id),
    INDEX idx_daily_stats_date (date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ======================================================================
-- UPDATE CONFIGURATION TABLE
-- ======================================================================

-- Add new configuration options
INSERT INTO
    app_settings (
        `key`,
        `value`,
        `type`,
        `description`,
        `is_public`
    )
VALUES (
        'webhook_enabled',
        'true',
        'boolean',
        'Enable webhook functionality',
        FALSE
    ),
    (
        'monitoring_enabled',
        'true',
        'boolean',
        'Enable system monitoring and alerts',
        FALSE
    ),
    (
        'backup_retention_days',
        '30',
        'number',
        'Number of days to retain backup records',
        FALSE
    ),
    (
        'max_webhook_retries',
        '3',
        'number',
        'Maximum webhook delivery retry attempts',
        FALSE
    ),
    (
        'health_check_interval',
        '300',
        'number',
        'Health check interval in seconds',
        FALSE
    ),
    (
        'alert_notification_enabled',
        'true',
        'boolean',
        'Send notifications for alerts',
        FALSE
    ),
    (
        'statistics_retention_months',
        '12',
        'number',
        'Number of months to retain daily statistics',
        FALSE
    )
ON DUPLICATE KEY UPDATE
    `value` = VALUES(`value`),
    updated_at = CURRENT_TIMESTAMP;

-- ======================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ======================================================================

-- View for server health summary
CREATE OR REPLACE VIEW server_health_summary AS
SELECT
    ps.id as server_id,
    ps.name as server_name,
    ps.status,
    COUNT(pd.id) as total_domains,
    COUNT(
        CASE
            WHEN pd.status = 'active' THEN 1
        END
    ) as active_domains,
    COUNT(pc.id) as total_customers,
    MAX(shm.collected_at) as last_health_check,
    AVG(
        CASE
            WHEN shm.metric_type = 'cpu' THEN shm.metric_value
        END
    ) as avg_cpu_usage,
    AVG(
        CASE
            WHEN shm.metric_type = 'memory' THEN shm.metric_value
        END
    ) as avg_memory_usage
FROM
    plesk_servers ps
    LEFT JOIN plesk_domains pd ON ps.id = pd.plesk_server_id
    LEFT JOIN plesk_customers pc ON ps.id = pc.plesk_server_id
    LEFT JOIN system_health_metrics shm ON ps.id = shm.plesk_server_id
    AND shm.collected_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
WHERE
    ps.is_active = TRUE
GROUP BY
    ps.id,
    ps.name,
    ps.status;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.id as user_id,
    u.username,
    u.role,
    COUNT(ual.id) as total_activities,
    MAX(ual.created_at) as last_activity,
    COUNT(
        CASE
            WHEN ual.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1
        END
    ) as activities_last_24h,
    COUNT(DISTINCT ual.activity_type) as unique_activity_types
FROM
    users u
    LEFT JOIN user_activity_log ual ON u.id = ual.user_id
WHERE
    u.is_active = TRUE
GROUP BY
    u.id,
    u.username,
    u.role;

-- ======================================================================
-- MIGRATION COMPLETED
-- ======================================================================

SELECT 'Database migration completed successfully!' as Status;
