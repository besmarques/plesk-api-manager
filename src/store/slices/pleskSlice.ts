import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pleskAPI, serverAPI, extensionsAPI } from '../../services/api';

interface ServerInfo {
	version: string;
	platform: string;
	hostname: string;
	uptime?: number;
}

interface Extension {
	id: string;
	name: string;
	version: string;
	status: 'enabled' | 'disabled' | 'not_installed';
	description?: string;
}

interface PleskState {
	serverInfo: ServerInfo | null;
	extensions: Extension[];
	ips: string[];
	connectionStatus: 'connected' | 'disconnected' | 'testing';
	loading: boolean;
	error: string | null;
}

const initialState: PleskState = {
	serverInfo: null,
	extensions: [],
	ips: [],
	connectionStatus: 'disconnected',
	loading: false,
	error: null,
};

// Async thunks
export const fetchServerInfo = createAsyncThunk('plesk/fetchServerInfo', async () => {
	const response = await pleskAPI.getServerInfo();
	return response.data.data; // Extract the data from the API response
});

export const testPleskConnection = createAsyncThunk('plesk/testConnection', async () => {
	const response = await pleskAPI.testConnection();
	return response.data; // Keep as is since this returns success/message directly
});

export const fetchExtensions = createAsyncThunk('plesk/fetchExtensions', async () => {
	const response = await extensionsAPI.getExtensions();
	return response.data;
});

export const fetchServerIPs = createAsyncThunk('plesk/fetchServerIPs', async () => {
	const response = await serverAPI.getIPs();
	return response.data;
});

const pleskSlice = createSlice({
	name: 'plesk',
	initialState,
	reducers: {
		clearError: (state) => {
			state.error = null;
		},
		setConnectionStatus: (state, action) => {
			state.connectionStatus = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch server info
			.addCase(fetchServerInfo.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchServerInfo.fulfilled, (state, action) => {
				state.loading = false;
				state.serverInfo = action.payload;
				state.connectionStatus = 'connected';
			})
			.addCase(fetchServerInfo.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to fetch server info';
				state.connectionStatus = 'disconnected';
			})
			// Test connection
			.addCase(testPleskConnection.pending, (state) => {
				state.connectionStatus = 'testing';
			})
			.addCase(testPleskConnection.fulfilled, (state) => {
				state.connectionStatus = 'connected';
			})
			.addCase(testPleskConnection.rejected, (state) => {
				state.connectionStatus = 'disconnected';
			})
			// Fetch extensions
			.addCase(fetchExtensions.fulfilled, (state, action) => {
				state.extensions = action.payload;
			})
			// Fetch server IPs
			.addCase(fetchServerIPs.fulfilled, (state, action) => {
				state.ips = action.payload;
			});
	},
});

export const { clearError, setConnectionStatus } = pleskSlice.actions;
export default pleskSlice.reducer;
