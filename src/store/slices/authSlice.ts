import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';
import Cookies from 'js-cookie';

interface User {
	id: number;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	role: 'admin' | 'user';
	createdAt?: string;
	lastLogin?: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	loading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	token: Cookies.get('token') || null,
	isAuthenticated: false,
	loading: false,
	error: null,
};

// Async thunks
export const loginUser = createAsyncThunk('auth/loginUser', async (credentials: { username: string; password: string }) => {
	const response = await authAPI.login(credentials);
	const { user, token } = response.data.data; // Extract from data.data since API returns { success: true, data: { user, token } }

	// Store token in cookie
	Cookies.set('token', token, { expires: 1 }); // 1 day

	return { user, token };
});

export const registerUser = createAsyncThunk('auth/registerUser', async (userData: { username: string; email: string; password: string; firstName: string; lastName: string; role?: 'admin' | 'user' }) => {
	const response = await authAPI.register(userData);
	return response.data;
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
	await authAPI.logout();
	Cookies.remove('token');
});

export const fetchUserProfile = createAsyncThunk('auth/fetchUserProfile', async () => {
	const response = await authAPI.getProfile();
	return response.data.data; // Extract user data from API response
});

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		clearError: (state) => {
			state.error = null;
		},
		setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
			state.user = action.payload.user;
			state.token = action.payload.token;
			state.isAuthenticated = true;
		},
		clearCredentials: (state) => {
			state.user = null;
			state.token = null;
			state.isAuthenticated = false;
			Cookies.remove('token');
		},
	},
	extraReducers: (builder) => {
		builder
			// Login
			.addCase(loginUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(loginUser.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload.user;
				state.token = action.payload.token;
				state.isAuthenticated = true;
			})
			.addCase(loginUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Login failed';
			})
			// Register
			.addCase(registerUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(registerUser.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(registerUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Registration failed';
			})
			// Logout
			.addCase(logoutUser.fulfilled, (state) => {
				state.user = null;
				state.token = null;
				state.isAuthenticated = false;
			})
			// Fetch profile
			.addCase(fetchUserProfile.pending, (state) => {
				state.loading = true;
			})
			.addCase(fetchUserProfile.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload;
				state.isAuthenticated = true;
			})
			.addCase(fetchUserProfile.rejected, (state) => {
				state.loading = false;
				state.user = null;
				state.token = null;
				state.isAuthenticated = false;
				Cookies.remove('token');
			});
	},
});

export const { clearError, setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
