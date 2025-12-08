import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';

import { RootState, AppDispatch } from '@/store';
import { fetchUserProfile } from '@/store/slices/authSlice';

import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import DomainsPage from '@/pages/DomainsPage';
import UsersPage from '@/pages/UsersPage';
import SettingsPage from '@/pages/SettingsPage';

function App() {
	const dispatch = useDispatch<AppDispatch>();
	const { isAuthenticated, token, loading } = useSelector((state: RootState) => state.auth);
	const [isInitializing, setIsInitializing] = useState(true);
	const location = useLocation();

	useEffect(() => {
		// Check if user is logged in on app start
		if (token && !isAuthenticated) {
			dispatch(fetchUserProfile()).finally(() => {
				setIsInitializing(false);
			});
		} else {
			setIsInitializing(false);
		}
	}, [dispatch, token, isAuthenticated]);

	// Show loading spinner while checking authentication
	if (isInitializing || (token && !isAuthenticated && loading)) {
		return (
			<Box
				sx={{
					height: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	if (!isAuthenticated) {
		return (
			<Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} />
				</Routes>
			</Box>
		);
	}

	return (
		<Layout>
			<Routes>
				<Route path="/" element={<Navigate to="/dashboard" replace />} />
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route path="/domains" element={<DomainsPage />} />
				<Route path="/users" element={<UsersPage />} />
				<Route path="/settings" element={<SettingsPage />} />
				<Route path="*" element={<Navigate to="/dashboard" replace />} />
			</Routes>
		</Layout>
	);
}

export default App;
