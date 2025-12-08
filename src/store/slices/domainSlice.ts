import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pleskAPI } from '../../services/api';

interface Domain {
	id: number;
	name: string;
	status: 'active' | 'suspended' | 'disabled' | 'unknown';
	created: string;
	owner: string;
	ipAddresses?: string[];
}

interface DomainState {
	domains: Domain[];
	currentDomain: Domain | null;
	loading: boolean;
	error: string | null;
	filters: {
		name?: string;
		status?: string;
	};
}

const initialState: DomainState = {
	domains: [],
	currentDomain: null,
	loading: false,
	error: null,
	filters: {},
};

// Async thunks
export const fetchDomains = createAsyncThunk('domains/fetchDomains', async (filters?: { name?: string }) => {
	const response = await pleskAPI.getDomains(filters);
	return response.data.data; // Extract the data array from the API response
});

export const fetchDomainById = createAsyncThunk('domains/fetchDomainById', async (id: number) => {
	const response = await pleskAPI.getDomainById(id);
	return response.data.data; // Extract the data from the API response
});

export const createDomain = createAsyncThunk('domains/createDomain', async (domainData: { name: string; owner?: string; password?: string; description?: string }) => {
	const response = await pleskAPI.createDomain(domainData);
	return response.data.data; // Extract the data from the API response
});

export const deleteDomain = createAsyncThunk('domains/deleteDomain', async (id: number) => {
	await pleskAPI.deleteDomain(id);
	return id;
});

export const updateDomainStatus = createAsyncThunk('domains/updateDomainStatus', async ({ id, status }: { id: number; status: string }) => {
	const response = await pleskAPI.updateDomainStatus(id, status);
	return { id, status };
});

export const updateDomain = createAsyncThunk('domains/updateDomain', async ({ id, ...domainData }: { id: number; name?: string; owner?: string; description?: string }) => {
	const response = await pleskAPI.updateDomain(id, domainData);
	return { id, ...domainData };
});

const domainSlice = createSlice({
	name: 'domains',
	initialState,
	reducers: {
		clearError: (state) => {
			state.error = null;
		},
		setFilters: (state, action: PayloadAction<{ name?: string; status?: string }>) => {
			state.filters = action.payload;
		},
		clearCurrentDomain: (state) => {
			state.currentDomain = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch domains
			.addCase(fetchDomains.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchDomains.fulfilled, (state, action) => {
				state.loading = false;
				const domains = Array.isArray(action.payload) ? action.payload : [];
				// Map domains and preserve status from backend, fallback only if not provided
				state.domains = domains.map((domain: any) => ({
					...domain,
					status: domain.status || 'unknown', // Trust the backend status
					ipAddresses: domain.ipAddresses || domain.ip_addresses || [],
				}));
			})
			.addCase(fetchDomains.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to fetch domains';
			})
			// Fetch domain by ID
			.addCase(fetchDomainById.fulfilled, (state, action) => {
				state.currentDomain = action.payload;
			})
			// Create domain
			.addCase(createDomain.fulfilled, (state, action) => {
				state.domains.push(action.payload);
			})
			// Delete domain
			.addCase(deleteDomain.fulfilled, (state, action) => {
				state.domains = state.domains.filter((domain) => domain.id !== action.payload);
			})
			// Update domain status
			.addCase(updateDomainStatus.fulfilled, (state, action) => {
				const domain = state.domains.find((d) => d.id === action.payload.id);
				if (domain) {
					domain.status = action.payload.status as Domain['status'];
				}
			})
			// Update domain
			.addCase(updateDomain.fulfilled, (state, action) => {
				const domain = state.domains.find((d) => d.id === action.payload.id);
				if (domain) {
					Object.assign(domain, action.payload);
				}
			});
	},
});

export const { clearError, setFilters, clearCurrentDomain } = domainSlice.actions;
export default domainSlice.reducer;
