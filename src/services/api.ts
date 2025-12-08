import axios, { AxiosInstance, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with base configuration
const createAPIInstance = (): AxiosInstance => {
	const instance = axios.create({
		baseURL: '/api',
		timeout: 10000,
		headers: {
			'Content-Type': 'application/json',
		},
	});

	// Add auth token to requests
	instance.interceptors.request.use(
		(config) => {
			const token = Cookies.get('token');
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
			return config;
		},
		(error) => {
			return Promise.reject(error);
		}
	);

	// Handle responses and errors
	instance.interceptors.response.use(
		(response) => response,
		(error) => {
			if (error.response?.status === 401) {
				// Redirect to login or clear auth state
				Cookies.remove('token');
				window.location.href = '/login';
			}
			return Promise.reject(error);
		}
	);

	return instance;
};

const api = createAPIInstance();

// Auth API
export const authAPI = {
	login: (credentials: { username: string; password: string }) => api.post('/users/login', credentials),

	register: (userData: { username: string; email: string; password: string; firstName: string; lastName: string; role?: string }) => api.post('/users/register', userData),

	logout: () => api.post('/users/logout'),

	getProfile: () => api.get('/users/profile'),

	getUsers: () => api.get('/users'),

	updateUser: (id: number, userData: { firstName: string; lastName: string; email: string; role: string; isActive: boolean }) => api.put(`/users/${id}`, userData),

	deleteUser: (id: number) => api.delete(`/users/${id}`),

	getUserActivity: (params?: { limit?: number; offset?: number; user_id?: number }) => api.get('/users/activity', { params }),
};

// Plesk API
export const pleskAPI = {
	// Server info
	getServerInfo: () => api.get('/plesk/server/info'),

	// Domains
	getDomains: (filters?: { name?: string }) => api.get('/plesk/domains', { params: filters }),

	getDomainById: (id: number) => api.get(`/plesk/domains/${id}`),

	createDomain: (domainData: { name: string; owner?: string; password?: string; description?: string }) => api.post('/plesk/domains', domainData),

	deleteDomain: (id: number) => api.delete(`/plesk/domains/${id}`),

	updateDomain: (id: number, domainData: { name?: string; owner?: string; description?: string }) => api.put(`/plesk/domains/${id}`, domainData),

	getDomainStatus: (id: number) => api.get(`/plesk/domains/${id}/status`),

	updateDomainStatus: (id: number, status: string) => api.put(`/plesk/domains/${id}/status`, { status }),

	// Customers
	getCustomers: () => api.get('/plesk/customers'),

	getCustomerById: (id: number) => api.get(`/plesk/customers/${id}`),

	createCustomer: (customerData: { login: string; password: string; name: string; email: string; company?: string }) => api.post('/plesk/customers', customerData),

	getCustomerDomains: (id: number) => api.get(`/plesk/customers/${id}/domains`),

	getCustomerStatistics: (id: number) => api.get(`/plesk/customers/${id}/statistics`),

	// Test connectivity
	testConnection: () => api.post('/plesk/test'),
};

// Server API
export const serverAPI = {
	initServer: (data: any) => api.post('/server/init', data),
	installLicense: (data: any) => api.post('/server/license', data),
	getIPs: () => api.get('/server/ips'),
};

// Extensions API
export const extensionsAPI = {
	getExtensions: () => api.get('/extensions'),
	installExtension: (data: any) => api.post('/extensions', data),
	uninstallExtension: (id: string) => api.delete(`/extensions/${id}`),
	enableExtension: (id: string) => api.post(`/extensions/${id}/enable`),
	disableExtension: (id: string) => api.post(`/extensions/${id}/disable`),
};

// FTP Users API
export const ftpAPI = {
	getFTPUsers: (filters?: { domain_id?: number; domain_name?: string }) => api.get('/ftpusers', { params: filters }),

	getFTPUserById: (id: number) => api.get(`/ftpusers/${id}`),

	createFTPUser: (userData: { login: string; password: string; domain_id: number; home?: string }) => api.post('/ftpusers', userData),

	updateFTPUser: (id: number, userData: any) => api.put(`/ftpusers/${id}`, userData),

	deleteFTPUser: (id: number) => api.delete(`/ftpusers/${id}`),
};

// Database API
export const databaseAPI = {
	getDatabases: (filters?: { domain_id?: number; domain_name?: string }) => api.get('/databases', { params: filters }),

	getDatabaseById: (id: number) => api.get(`/databases/${id}`),

	createDatabase: (dbData: { name: string; domain_id: number; server_id?: number }) => api.post('/databases', dbData),

	updateDatabase: (id: number, dbData: any) => api.put(`/databases/${id}`, dbData),

	deleteDatabase: (id: number) => api.delete(`/databases/${id}`),

	getDatabaseUsers: (id: number) => api.get(`/databases/${id}/users`),

	createDatabaseUser: (id: number, userData: any) => api.post(`/databases/${id}/users`, userData),

	updateDatabaseUser: (id: number, userId: number, userData: any) => api.put(`/databases/${id}/users/${userId}`, userData),

	deleteDatabaseUser: (id: number, userId: number) => api.delete(`/databases/${id}/users/${userId}`),

	getDatabaseServers: () => api.get('/databases/servers'),
};

// DNS API
export const dnsAPI = {
	getDNSRecords: (filters?: { domain_id?: number; domain_name?: string }) => api.get('/dns', { params: filters }),

	getDNSRecordById: (id: number) => api.get(`/dns/${id}`),

	createDNSRecord: (recordData: { domain_id: number; type: string; name: string; value: string; ttl?: number }) => api.post('/dns', recordData),

	updateDNSRecord: (id: number, recordData: any) => api.put(`/dns/${id}`, recordData),

	deleteDNSRecord: (id: number) => api.delete(`/dns/${id}`),
};

// CLI API
export const cliAPI = {
	getCommands: () => api.get('/cli/commands'),
	getCommandRef: (id: string) => api.get(`/cli/${id}/ref`),
	executeCommand: (id: string, params: any) => api.post(`/cli/${id}/call`, params),
};

export default api;
