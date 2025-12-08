import React, { useEffect } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Switch, FormControlLabel, Divider, Alert, Card, CardContent, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Save, Refresh, Security, Storage } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';

import { AppDispatch, RootState } from '@/store';
import { fetchServerInfo, fetchExtensions, fetchServerIPs } from '@/store/slices/pleskSlice';
import { toggleTheme } from '@/store/slices/uiSlice';

const SettingsPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { serverInfo, extensions, ips } = useSelector((state: RootState) => state.plesk);
	const { theme } = useSelector((state: RootState) => state.ui);
	const { user } = useSelector((state: RootState) => state.auth);

	const { register, handleSubmit } = useForm({
		defaultValues: {
			pleskHost: '',
			pleskUser: '',
			dbHost: 'localhost',
			dbName: 'plesk_manager',
		},
	});

	useEffect(() => {
		dispatch(fetchServerInfo());
		dispatch(fetchExtensions());
		dispatch(fetchServerIPs());
	}, []);

	const handleSaveSettings = (data: any) => {
		console.log('Settings saved:', data);
		// Implement settings save functionality
	};

	return (
		<Box>
			<Typography variant="h4" gutterBottom>
				Settings
			</Typography>

			<Grid container spacing={3}>
				{/* General Settings */}
				<Grid item xs={12} md={6}>
					<Paper sx={{ p: 3 }}>
						<Typography variant="h6" gutterBottom>
							General Settings
						</Typography>

						<Box component="form" onSubmit={handleSubmit(handleSaveSettings)}>
							<TextField fullWidth label="Plesk Host" margin="normal" {...register('pleskHost')} />
							<TextField fullWidth label="Plesk Username" margin="normal" {...register('pleskUser')} />
							<TextField fullWidth label="Database Host" margin="normal" {...register('dbHost')} />
							<TextField fullWidth label="Database Name" margin="normal" {...register('dbName')} />

							<Divider sx={{ my: 2 }} />

							<FormControlLabel control={<Switch checked={theme === 'dark'} onChange={() => dispatch(toggleTheme())} />} label="Dark Mode" />

							<Box mt={2}>
								<Button variant="contained" startIcon={<Save />} type="submit">
									Save Settings
								</Button>
							</Box>
						</Box>
					</Paper>
				</Grid>

				{/* Server Information */}
				<Grid item xs={12} md={6}>
					<Paper sx={{ p: 3, mb: 2 }}>
						<Box display="flex" alignItems="center" mb={2}>
							<Storage sx={{ mr: 1 }} />
							<Typography variant="h6">Server Information</Typography>
							<Button size="small" startIcon={<Refresh />} onClick={() => dispatch(fetchServerInfo())} sx={{ ml: 'auto' }}>
								Refresh
							</Button>
						</Box>

						{serverInfo ? (
							<List dense>
								<ListItem>
									<ListItemText primary="Version" secondary={serverInfo.version} />
								</ListItem>
								<ListItem>
									<ListItemText primary="Platform" secondary={serverInfo.platform} />
								</ListItem>
								<ListItem>
									<ListItemText primary="Hostname" secondary={serverInfo.hostname} />
								</ListItem>
							</List>
						) : (
							<Alert severity="warning">Unable to fetch server information</Alert>
						)}
					</Paper>

					{/* Server IPs */}
					<Card sx={{ mb: 2 }}>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Server IP Addresses
							</Typography>
							<Box display="flex" flexWrap="wrap" gap={1}>
								{ips.map((ip, index) => (
									<Chip key={index} label={ip} variant="outlined" />
								))}
							</Box>
						</CardContent>
					</Card>
				</Grid>

				{/* Extensions */}
				<Grid item xs={12}>
					<Paper sx={{ p: 3 }}>
						<Box display="flex" alignItems="center" mb={2}>
							<Security sx={{ mr: 1 }} />
							<Typography variant="h6">Extensions</Typography>
							<Button size="small" startIcon={<Refresh />} onClick={() => dispatch(fetchExtensions())} sx={{ ml: 'auto' }}>
								Refresh
							</Button>
						</Box>

						<Grid container spacing={2}>
							{extensions.map((extension) => (
								<Grid item xs={12} sm={6} md={4} key={extension.id}>
									<Card variant="outlined">
										<CardContent>
											<Typography variant="h6" gutterBottom>
												{extension.name}
											</Typography>
											<Typography variant="body2" color="text.secondary" gutterBottom>
												Version: {extension.version}
											</Typography>
											<Chip label={extension.status} color={extension.status === 'enabled' ? 'success' : extension.status === 'disabled' ? 'warning' : 'default'} size="small" />
											{extension.description && (
												<Typography variant="body2" sx={{ mt: 1 }}>
													{extension.description}
												</Typography>
											)}
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
};

export default SettingsPage;
