# Plesk API Manager Database

This directory contains all database-related files for the Plesk API Manager application.

## Files Overview

### Core Database Files

-   **`schema.sql`** - Complete database schema with tables, indexes, and initial configuration
-   **`seeders.sql`** - Sample data for development and testing
-   **`migrations.sql`** - Database migration scripts for future updates

### Setup Scripts

-   **`setup.ps1`** - PowerShell setup script for Windows
-   **`setup.sh`** - Bash setup script for Linux/macOS

## Database Structure

### User Management

-   `users` - User accounts and authentication
-   `user_sessions` - Active user sessions
-   `user_activity_log` - User activity tracking

### Plesk Integration

-   `plesk_servers` - Configured Plesk servers
-   `plesk_domains` - Domain cache from Plesk
-   `plesk_customers` - Customer cache from Plesk

### API Management

-   `api_keys` - API key management
-   `api_request_log` - API request logging

### System Configuration

-   `app_settings` - Application configuration
-   `notification_templates` - Email templates
-   `user_notifications` - User notifications

### Enhanced Features (via migrations)

-   `backup_operations` - Backup tracking
-   `monitoring_alerts` - System alerts
-   `webhook_endpoints` - Webhook configuration
-   `webhook_deliveries` - Webhook delivery logs
-   `system_health_metrics` - Server health metrics
-   `daily_statistics` - Aggregated statistics

## Quick Setup

### Windows (PowerShell)

```powershell
# Run the automated setup script
.\database\setup.ps1
```

### Linux/macOS (Bash)

```bash
# Make the script executable and run
chmod +x database/setup.sh
./database/setup.sh
```

**What the setup script does:**

-   ✅ Prompts for MySQL root password securely
-   ✅ Creates database `plesk_manager` with UTF8MB4 encoding
-   ✅ Creates user `plesk_user` with secure password `SecurePassword123!`
-   ✅ Imports complete schema (11 tables + 2 views)
-   ✅ Optionally imports sample data (5 users, 3 servers, 6 domains)
-   ✅ Configures `.env` file automatically
-   ✅ Verifies setup with table count

## Manual Setup

### 1. Create Database and User

```sql
CREATE DATABASE plesk_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'plesk_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON plesk_manager.* TO 'plesk_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Import Schema

```bash
mysql -u plesk_user -p plesk_manager < database/schema.sql
```

### 3. Import Sample Data (Optional)

```bash
mysql -u plesk_user -p plesk_manager < database/seeders.sql
```

### 4. Apply Migrations (Future Updates)

```bash
mysql -u plesk_user -p plesk_manager < database/migrations.sql
```

## Environment Configuration

The setup script automatically configures your `.env` file with these credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=plesk_manager
DB_USER=plesk_user
DB_PASSWORD=SecurePassword123!
```

## Default Users

After running the setup script with sample data, you can log in with these test accounts:

| Username   | Password    | Role   | Email             |
| ---------- | ----------- | ------ | ----------------- |
| admin      | admin123    | admin  | admin@example.com |
| john_admin | password123 | admin  | john@example.com  |
| jane_user  | password123 | user   | jane@example.com  |
| bob_viewer | password123 | viewer | bob@example.com   |

## Database Views

The schema includes several views for common queries:

-   `active_user_summary` - Summary of active users
-   `server_domain_summary` - Server and domain statistics
-   `recent_activity_summary` - Recent user activity

## Performance Indexes

The database includes optimized indexes for:

-   User authentication and sessions
-   API request logging and analytics
-   Domain and customer lookups
-   Activity log queries
-   Server monitoring metrics

## Backup Recommendations

1. **Daily backups** of the entire database
2. **Real-time replication** for production environments
3. **Export user data** before major updates
4. **Test restore procedures** regularly

## Migration Strategy

When updating the database:

1. **Backup** existing data
2. **Test migrations** in development environment
3. **Apply migrations** during maintenance windows
4. **Verify data integrity** after migration

## Troubleshooting

### Common Issues

1. **Connection refused**: Check MySQL service status
2. **Access denied**: Verify user credentials and permissions
3. **Character encoding**: Ensure utf8mb4 is used
4. **Foreign key constraints**: Check table creation order

### Performance Tuning

For large datasets, consider:

-   Partitioning large tables (logs, metrics)
-   Adding specific indexes for your queries
-   Regular table optimization
-   Connection pool tuning

## Security Considerations

-   Use strong passwords for database users
-   Limit database user privileges
-   Enable SSL for database connections
-   Regular security updates
-   Monitor for suspicious activity

## Monitoring

The database includes built-in monitoring capabilities:

-   API request tracking
-   User activity logging
-   System health metrics
-   Performance statistics

Use the provided views and tables to create dashboards and alerts for your monitoring needs.
