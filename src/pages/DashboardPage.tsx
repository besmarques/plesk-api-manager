import React, { useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, Chip, Button } from '@mui/material';
import { Domain, People, Storage, Security } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '@/store';
import { fetchServerInfo, testPleskConnection } from '@/store/slices/pleskSlice';
import { fetchDomains } from '@/store/slices/domainSlice';

const DashboardPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { serverInfo, connectionStatus } = useSelector((state: RootState) => state.plesk);
	const { domains } = useSelector((state: RootState) => state.domains);
	const { user } = useSelector((state: RootState) => state.auth);

	useEffect(() => {
		dispatch(fetchServerInfo());
		dispatch(fetchDomains());
	}, []);

	const handleTestConnection = () => {
		dispatch(testPleskConnection());
	};

	const stats = [
		{
			title: 'Total Domains',
			value: Array.isArray(domains) ? domains.length : 0,
			icon: <Domain />,
			color: 'primary.main',
		},
		{
			title: 'Active Domains',
			value: Array.isArray(domains) ? domains.filter((d) => d.status === 'active').length : 0,
			icon: <Security />,
			color: 'success.main',
		},
		{
			title: 'Server Status',
			value: connectionStatus,
			icon: <Storage />,
			color: connectionStatus === 'connected' ? 'success.main' : 'error.main',
		},
	];

	return (
		<Box>
			<Typography variant="h4" gutterBottom>
				Dashboard
			</Typography>
			<Typography variant="subtitle1" color="text.secondary" gutterBottom>
				Welcome back, {user?.firstName}! Here's your server overview.
			</Typography>

			{/* Connection Status */}
			<Paper sx={{ p: 2, mb: 3 }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box>
						<Typography variant="h6">Plesk Connection</Typography>
						<Chip label={connectionStatus} color={connectionStatus === 'connected' ? 'success' : 'error'} sx={{ mt: 1 }} />
					</Box>
					<Button variant="outlined" onClick={handleTestConnection}>
						Test Connection
					</Button>
				</Box>
			</Paper>

			{/* Statistics Cards */}
			<Grid container spacing={3} sx={{ mb: 3 }}>
				{stats.map((stat, index) => (
					<Grid item xs={12} sm={6} md={4} key={index}>
						<Card>
							<CardContent>
								<Box display="flex" alignItems="center">
									<Box
										sx={{
											backgroundColor: stat.color,
											borderRadius: 1,
											p: 1,
											mr: 2,
											color: 'white',
										}}
									>
										{stat.icon}
									</Box>
									<Box>
										<Typography variant="h4">{stat.value}</Typography>
										<Typography variant="body2" color="text.secondary">
											{stat.title}
										</Typography>
									</Box>
								</Box>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Server Information */}
			{serverInfo && (
				<Paper sx={{ p: 2 }}>
					<Typography variant="h6" gutterBottom>
						Server Information
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<Typography variant="body2" color="text.secondary">
								Version: {serverInfo.version}
							</Typography>
						</Grid>
						<Grid item xs={12} sm={6}>
							<Typography variant="body2" color="text.secondary">
								Platform: {serverInfo.platform}
							</Typography>
						</Grid>
						<Grid item xs={12} sm={6}>
							<Typography variant="body2" color="text.secondary">
								Hostname: {serverInfo.hostname}
							</Typography>
						</Grid>
					</Grid>
				</Paper>
			)}
		</Box>
	);
};

export default DashboardPage;
