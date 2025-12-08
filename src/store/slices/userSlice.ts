import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

interface User {
	id: number;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	role: 'admin' | 'user';
	isActive: boolean;
	createdAt: string;
	lastLogin?: string;
}

interface UserActivity {
	id: number;
	user_id: number;
	activity_type: string;
	description: string;
	ip_address: string;
	created_at: string;
	username?: string;
}

interface UserState {
	users: User[];
	activities: UserActivity[];
	loading: boolean;
	error: string | null;
}

const initialState: UserState = {
	users: [],
	activities: [],
	loading: false,
	error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
	const response = await authAPI.getUsers();
	return response.data.data; // Extract data array from API response
});

export const fetchUserActivity = createAsyncThunk('users/fetchUserActivity', async (params?: { limit?: number; offset?: number; user_id?: number }) => {
	const response = await authAPI.getUserActivity(params);
	return response.data.data; // Extract data array from API response
});

export const updateUser = createAsyncThunk('users/updateUser', async ({ id, userData }: { id: number; userData: { firstName: string; lastName: string; email: string; role: string; isActive: boolean } }) => {
	await authAPI.updateUser(id, userData);
	return id;
});

export const deleteUser = createAsyncThunk('users/deleteUser', async (id: number) => {
	await authAPI.deleteUser(id);
	return id;
});

const userSlice = createSlice({
	name: 'users',
	initialState,
	reducers: {
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch users
			.addCase(fetchUsers.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchUsers.fulfilled, (state, action) => {
				state.loading = false;
				state.users = Array.isArray(action.payload) ? action.payload : [];
			})
			.addCase(fetchUsers.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to fetch users';
			})
			// Fetch user activity
			.addCase(fetchUserActivity.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchUserActivity.fulfilled, (state, action) => {
				state.loading = false;
				state.activities = Array.isArray(action.payload) ? action.payload : [];
			})
			.addCase(fetchUserActivity.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to fetch user activity';
			})
			// Update user
			.addCase(updateUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updateUser.fulfilled, (state) => {
				state.loading = false;
				// Refresh users list after update
			})
			.addCase(updateUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to update user';
			})
			// Delete user
			.addCase(deleteUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteUser.fulfilled, (state, action) => {
				state.loading = false;
				// Remove user from state
				state.users = state.users.filter((user) => user.id !== action.payload);
			})
			.addCase(deleteUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Failed to delete user';
			});
	},
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
