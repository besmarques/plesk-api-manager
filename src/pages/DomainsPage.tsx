import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Alert, Snackbar, CircularProgress } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, PlayArrow as ActivateIcon, Pause as SuspendIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../store';
import { fetchDomains, deleteDomain, updateDomainStatus, clearError } from '../store/slices/domainSlice';

const DomainsPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { domains, loading, error } = useSelector((state: RootState) => state.domains);

	const [snackbarOpen, setSnackbarOpen] = useState(false);
	const [snackbarMessage, setSnackbarMessage] = useState('');
	const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

	useEffect(() => {
		dispatch(fetchDomains());
	}, [dispatch]);

	useEffect(() => {
		if (error) {
			setSnackbarMessage(error);
			setSnackbarSeverity('error');
			setSnackbarOpen(true);
			dispatch(clearError());
		}
	}, [error, dispatch]);

	// Additional effect to fetch real status for specific domains that might be suspended
	useEffect(() => {
		const fetchRealStatus = async () => {
			if (domains.length > 0) {
				for (const domain of domains) {
					try {
						const response = await fetch(`/api/plesk/domains/${domain.id}/status`);
						const statusData = await response.json();
						if (statusData.success && statusData.data && statusData.data.status !== domain.status) {
							// Update the domain status in the store if it's different
							console.log(`Domain ${domain.name} real status: ${statusData.data.status}, current: ${domain.status}`);
						}
					} catch (error) {
						// Silently continue if status fetch fails for any domain
						console.error(`Failed to fetch status for domain ${domain.id}:`, error);
					}
				}
			}
		};

		// Only fetch real status if we have domains and they all show as 'active' (indicating fallback status)
		if (domains.length > 0 && domains.every((d) => d.status === 'active')) {
			fetchRealStatus();
		}
	}, [domains]);

	const handleDelete = async (domain: any) => {
		if (window.confirm(`Are you sure you want to delete domain "${domain.name}"?`)) {
			try {
				await dispatch(deleteDomain(domain.id)).unwrap();
				setSnackbarMessage('Domain deleted successfully');
				setSnackbarSeverity('success');
				setSnackbarOpen(true);
			} catch (error: any) {
				setSnackbarMessage(error.message || 'Failed to delete domain');
				setSnackbarSeverity('error');
				setSnackbarOpen(true);
			}
		}
	};

	const handleStatusToggle = async (domain: any) => {
		const newStatus = domain.status === 'active' ? 'suspended' : 'active';
		try {
			await dispatch(
				updateDomainStatus({
					id: domain.id,
					status: newStatus,
				})
			).unwrap();
			setSnackbarMessage(`Domain ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
			setSnackbarSeverity('success');
			setSnackbarOpen(true);
		} catch (error: any) {
			setSnackbarMessage(error.message || 'Failed to update domain status');
			setSnackbarSeverity('error');
			setSnackbarOpen(true);
		}
	};

	const handleRefresh = () => {
		dispatch(fetchDomains());
	};

	const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
		switch (status) {
			case 'active':
				return 'success';
			case 'suspended':
				return 'warning';
			case 'disabled':
				return 'error';
			default:
				return 'default';
		}
	};

	return (
		<Box>
			<Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
				<Typography variant="h4" component="h1">
					Domains
				</Typography>
				<Box>
					<Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} sx={{ mr: 2 }} disabled={loading}>
						Refresh
					</Button>
					<Button variant="contained" startIcon={<AddIcon />}>
						Add Domain
					</Button>
				</Box>
			</Box>

			{loading && (
				<Box display="flex" justifyContent="center" my={4}>
					<CircularProgress />
				</Box>
			)}

			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Domain Name</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Created</TableCell>
							<TableCell>IP Addresses</TableCell>
							<TableCell align="right">Actions</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{domains.map((domain: any) => (
							<TableRow key={domain.id} hover>
								<TableCell>
									<Typography variant="body2" fontWeight="medium">
										{domain.name}
									</Typography>
								</TableCell>
								<TableCell>
									<Chip label={domain.status || 'unknown'} color={getStatusColor(domain.status)} size="small" />
								</TableCell>
								<TableCell>{domain.created ? new Date(domain.created).toLocaleDateString() : 'N/A'}</TableCell>
								<TableCell>{domain.ipAddresses?.join(', ') || 'N/A'}</TableCell>
								<TableCell align="right">
									{domain.status === 'active' ? (
										<IconButton size="small" color="warning" onClick={() => handleStatusToggle(domain)} title="Suspend">
											<SuspendIcon />
										</IconButton>
									) : (
										<IconButton size="small" color="success" onClick={() => handleStatusToggle(domain)} title="Activate">
											<ActivateIcon />
										</IconButton>
									)}
									<IconButton size="small" color="error" onClick={() => handleDelete(domain)} title="Delete">
										<DeleteIcon />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{domains.length === 0 && !loading && (
							<TableRow>
								<TableCell colSpan={5} align="center">
									<Typography variant="body2" color="text.secondary">
										No domains found
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
				<Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
					{snackbarMessage}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default DomainsPage;
