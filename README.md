# Plesk API Manager

A modern full-stack Node.js application providing a comprehensive web interface and REST API for managing Plesk server operations using Plesk's REST API v2.

## Features

### Backend API

-   ✅ RESTful API endpoints for complete Plesk management
-   ✅ Modern Plesk REST API v2 integration
-   ✅ Domain management (create, list, get info, delete, status)
-   ✅ Customer/Client management with statistics
-   ✅ Server monitoring and information
-   ✅ User authentication with JWT tokens
-   ✅ Role-based access control (admin, user, viewer)
-   ✅ API key management and request logging
-   ✅ Input validation with Joi
-   ✅ Comprehensive error handling and logging
-   ✅ Security headers with Helmet
-   ✅ CORS support

### Frontend Interface

-   ✅ React 18 with TypeScript
-   ✅ Redux Toolkit for state management (Flux architecture)
-   ✅ Material-UI components and design
-   ✅ Responsive dashboard interface
-   ✅ Domain management interface
-   ✅ User management and authentication
-   ✅ Real-time notifications
-   ✅ Settings and configuration panels

### Database & Infrastructure

-   ✅ MySQL database with comprehensive schema
-   ✅ User management and session tracking
-   ✅ Activity logging and audit trails
-   ✅ API request analytics
-   ✅ Automated database setup scripts
-   ✅ Migration scripts for updates

## Prerequisites

-   Node.js (v16 or higher)
-   MySQL 5.7+ or MariaDB 10.3+
-   Access to a Plesk server with API enabled
-   Plesk API credentials (username/password or API key)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

**Windows:**

```powershell
.\database\setup.ps1
```

**Linux/macOS:**

```bash
chmod +x database/setup.sh
./database/setup.sh
```

### 3. Configure Environment

The setup script creates `.env` automatically, but update these Plesk settings:

```env
# Plesk Server Configuration
PLESK_HOST=your-plesk-server.com
PLESK_PORT=8443
PLESK_USER=admin
PLESK_PASSWORD=your_plesk_password
# OR use API key instead:
# PLESK_API_KEY=your_plesk_api_key

# Generate a secure JWT secret
JWT_SECRET=your_super_secure_jwt_secret_here
```

### 4. Start Application

```bash
# Start both frontend and backend in development mode
npm run dev:all

# Or start separately:
npm run backend:dev    # Backend only (port 3000)
npm run frontend:dev   # Frontend only (port 3001)
```

## Project Structure

```
plesk-api-manager/
├── database/           # Database setup and schema
│   ├── setup.ps1      # Windows setup script
│   ├── setup.sh       # Linux/macOS setup script
│   ├── schema.sql     # Database structure
│   ├── seeders.sql    # Sample data
│   └── migrations.sql # Future updates
├── routes/            # API route handlers (organized by theme)
│   ├── index.js       # Route manager middleware
│   ├── plesk/         # Plesk operations (domains, customers, server)
│   ├── auth/          # Authentication endpoints
│   ├── admin/         # Admin functions (CLI, extensions)
│   ├── management/    # Resource management (FTP, DNS, databases)
│   └── system/        # User management
├── src/               # React frontend application
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page components (Login, Dashboard, etc.)
│   ├── store/         # Redux store and slices
│   └── services/      # API service functions
├── lib/               # Shared utilities and middleware
├── server.js          # Express server entry point
├── package.json       # Single package.json for both frontend/backend
└── .env              # Environment configuration
```

## Usage

### Start the server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

### API Endpoints

Base URL: `http://localhost:3000/api/plesk`

#### Server Information

-   **GET** `/server/info` - Get Plesk server information

#### Domains

-   **GET** `/domains` - List all domains (supports `?name=` filter)
-   **GET** `/domains/:id` - Get specific domain information by ID
-   **POST** `/domains` - Create a new domain
-   **DELETE** `/domains/:id` - Delete a domain by ID
-   **GET** `/domains/:id/status` - Get domain status
-   **PUT** `/domains/:id/status` - Update domain status (active/suspended/disabled)

Example domain creation:

```json
{
	"name": "example.com",
	"owner": "admin",
	"password": "securepassword123",
	"description": "My website",
	"ip_addresses": ["192.168.1.100"]
}
```

#### Customers/Clients

-   **GET** `/customers` - List all customers
-   **GET** `/customers/:id` - Get specific customer information
-   **POST** `/customers` - Create a new customer
-   **GET** `/customers/:id/domains` - Get customer's domains
-   **GET** `/customers/:id/statistics` - Get customer statistics

Example customer creation:

```json
{
	"login": "newuser",
	"password": "securepassword123",
	"name": "John Doe",
	"email": "john@example.com",
	"company": "Example Corp"
}
```

#### Utilities

-   **POST** `/test` - Test Plesk API connectivity

### Testing the API

1. Health check:

    ```bash
    curl http://localhost:3000/health
    ```

2. Test Plesk connectivity:

    ```bash
    curl -X POST http://localhost:3000/api/plesk/test
    ```

3. List domains:
    ```bash
    curl http://localhost:3000/api/plesk/domains
    ```

## Configuration

### Environment Variables

| Variable       | Description      | Required                       |
| -------------- | ---------------- | ------------------------------ |
| PORT           | Server port      | No (default: 3000)             |
| NODE_ENV       | Environment mode | No (default: development)      |
| PLESK_URL      | Plesk server URL | Yes                            |
| PLESK_API_KEY  | Plesk API key    | Yes (or use username/password) |
| PLESK_USERNAME | Plesk username   | Alternative to API key         |
| PLESK_PASSWORD | Plesk password   | Alternative to API key         |

### Plesk API Configuration

**Using API Key (Recommended):**

-   Log into Plesk
-   Go to Tools & Settings > API Keys
-   Create a new API key
-   Use the key in your `.env` file as `PLESK_API_KEY`

**Using Username/Password:**

-   Set `PLESK_USERNAME` and `PLESK_PASSWORD` in `.env`
-   Comment out or remove `PLESK_API_KEY`

**Note:** This application now uses Plesk's modern REST API v2 instead of the legacy XML API, providing better performance, easier integration, and cleaner JSON responses.

## Error Handling

The API returns standardized error responses:

```json
{
	"success": false,
	"error": "Error message",
	"details": ["Validation error details if applicable"]
}
```

## Security Considerations

-   Always use HTTPS in production
-   Keep your Plesk credentials secure
-   Consider implementing authentication for your API endpoints
-   Use environment variables for sensitive configuration
-   The application allows self-signed SSL certificates for Plesk servers

## Development

### Project Structure

```
plesk-api-manager/
├── lib/
│   └── pleskClient.js      # Plesk API client
├── routes/
│   └── plesk.js            # API route handlers
├── .env.example            # Environment configuration template
├── package.json            # Project dependencies
├── server.js              # Main application server
└── README.md              # This file
```

### Adding New Features

1. Add new methods to `lib/pleskClient.js` for Plesk XML API calls
2. Create corresponding routes in `routes/plesk.js`
3. Add validation schemas using Joi
4. Update this README with new endpoint documentation

## Troubleshooting

### Common Issues

1. **"Plesk client not configured"**

    - Check your `.env` file configuration
    - Ensure PLESK_URL and credentials are set correctly

2. **SSL/TLS Errors**

    - The client allows self-signed certificates by default
    - For production, configure proper SSL certificates

3. **Connection Timeouts**

    - Check if Plesk server is accessible
    - Verify firewall settings allow connections on port 8443

4. **XML Parsing Issues**
    - The current implementation uses basic XML parsing
    - Consider implementing xml2js for better XML handling

## License

MIT License
