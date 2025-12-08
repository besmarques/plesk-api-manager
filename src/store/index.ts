import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import domainSlice from './slices/domainSlice';
import userSlice from './slices/userSlice';
import uiSlice from './slices/uiSlice';
import pleskSlice from './slices/pleskSlice';

export const store = configureStore({
	reducer: {
		auth: authSlice,
		domains: domainSlice,
		users: userSlice,
		ui: uiSlice,
		plesk: pleskSlice,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: ['persist/PERSIST'],
			},
		}),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
