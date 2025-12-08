import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
	sidebarOpen: boolean;
	currentPage: string;
	loading: boolean;
	notification: {
		open: boolean;
		message: string;
		severity: 'success' | 'error' | 'warning' | 'info';
	} | null;
	theme: 'light' | 'dark';
}

const initialState: UIState = {
	sidebarOpen: true,
	currentPage: 'dashboard',
	loading: false,
	notification: null,
	theme: 'light',
};

const uiSlice = createSlice({
	name: 'ui',
	initialState,
	reducers: {
		toggleSidebar: (state) => {
			state.sidebarOpen = !state.sidebarOpen;
		},
		setSidebarOpen: (state, action: PayloadAction<boolean>) => {
			state.sidebarOpen = action.payload;
		},
		setCurrentPage: (state, action: PayloadAction<string>) => {
			state.currentPage = action.payload;
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		showNotification: (
			state,
			action: PayloadAction<{
				message: string;
				severity: 'success' | 'error' | 'warning' | 'info';
			}>
		) => {
			state.notification = {
				open: true,
				message: action.payload.message,
				severity: action.payload.severity,
			};
		},
		hideNotification: (state) => {
			state.notification = null;
		},
		toggleTheme: (state) => {
			state.theme = state.theme === 'light' ? 'dark' : 'light';
		},
		setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
			state.theme = action.payload;
		},
	},
});

export const { toggleSidebar, setSidebarOpen, setCurrentPage, setLoading, showNotification, hideNotification, toggleTheme, setTheme } = uiSlice.actions;

export default uiSlice.reducer;
