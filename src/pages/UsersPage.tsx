import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, IconButton } from '@mui/material';
import { Refresh, PersonAdd, Edit, Delete } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '@/store';
import { fetchUsers, fetchUserActivity, updateUser, deleteUser } from '@/store/slices/userSlice';
import { registerUser } from '@/store/slices/authSlice';

const UsersPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { users, activities, loading, error } = useSelector((state: RootState) => state.users);
	const { user: currentUser, isAuthenticated, token } = useSelector((state: RootState) => state.auth);
	const [openAddDialog, setOpenAddDialog] = useState(false);
	const [openEditDialog, setOpenEditDialog] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const [newUser, setNewUser] = useState({
		username: '',
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		role: 'user',
	});
	const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

	const validateNewUser = () => {
		const errors: { [key: string]: string } = {};

		if (!newUser.username.trim()) {
			errors.username = 'Username is required';
		} else if (newUser.username.length < 3 || newUser.username.length > 30) {
			errors.username = 'Username must be 3-30 characters';
		} else if (!/^[a-zA-Z0-9]+$/.test(newUser.username)) {
			errors.username = 'Username must be alphanumeric only';
		}

		if (!newUser.email.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
			errors.email = 'Please enter a valid email address';
		}

		if (!newUser.password) {
			errors.password = 'Password is required';
		} else if (newUser.password.length < 6) {
			errors.password = 'Password must be at least 6 characters';
		}

		if (!newUser.firstName.trim()) {
			errors.firstName = 'First name is required';
		} else if (newUser.firstName.trim().length < 2 || newUser.firstName.trim().length > 50) {
			errors.firstName = 'First name must be 2-50 characters';
		}

		if (!newUser.lastName.trim()) {
			errors.lastName = 'Last name is required';
		} else if (newUser.lastName.trim().length < 2 || newUser.lastName.trim().length > 50) {
			errors.lastName = 'Last name must be 2-50 characters';
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const validateEditUser = () => {
		if (!editingUser) return false;

		const errors: { [key: string]: string } = {};

		if (!editingUser.firstName?.trim()) {
			errors.firstName = 'First name is required';
		} else if (editingUser.firstName.trim().length < 2 || editingUser.firstName.trim().length > 50) {
			errors.firstName = 'First name must be 2-50 characters';
		}

		if (!editingUser.lastName?.trim()) {
			errors.lastName = 'Last name is required';
		} else if (editingUser.lastName.trim().length < 2 || editingUser.lastName.trim().length > 50) {
			errors.lastName = 'Last name must be 2-50 characters';
		}

		if (!editingUser.email?.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
			errors.email = 'Please enter a valid email address';
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	};

	useEffect(() => {
		console.log('UsersPage - Auth state:', { currentUser: currentUser?.username, role: currentUser?.role, isAuthenticated, hasToken: !!token });
		if (currentUser?.role === 'admin') {
			console.log('Fetching users and activity for admin user');
			dispatch(fetchUsers());
			dispatch(fetchUserActivity());
		}
	}, [dispatch, currentUser]);

	const handleAddUser = async () => {
		if (!validateNewUser()) {
			return; // Don't submit if validation fails
		}

		try {
			await dispatch(registerUser(newUser)).unwrap();
			setOpenAddDialog(false);
			setNewUser({
				username: '',
				email: '',
				password: '',
				firstName: '',
				lastName: '',
				role: 'user',
			});
			setValidationErrors({});
			dispatch(fetchUsers()); // Refresh users list
		} catch (error) {
			console.error('Failed to add user:', error);
		}
	};

	const handleEditUser = (user: any) => {
		setEditingUser({
			...user,
			isActive: user.isActive,
		});
		setValidationErrors({}); // Clear previous validation errors
		setOpenEditDialog(true);
	};

	const handleUpdateUser = async () => {
		if (!validateEditUser()) {
			return; // Don't submit if validation fails
		}

		if (editingUser) {
			try {
				await dispatch(
					updateUser({
						id: editingUser.id,
						userData: {
							firstName: editingUser.firstName,
							lastName: editingUser.lastName,
							email: editingUser.email,
							role: editingUser.role,
							isActive: editingUser.isActive,
						},
					})
				).unwrap();
				setOpenEditDialog(false);
				setEditingUser(null);
				setValidationErrors({});
				dispatch(fetchUsers()); // Refresh users list
			} catch (error) {
				console.error('Failed to update user:', error);
			}
		}
	};

	const handleDeleteUser = async (userId: number, username: string) => {
		if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
			try {
				await dispatch(deleteUser(userId)).unwrap();
			} catch (error) {
				console.error('Failed to delete user:', error);
			}
		}
	};

	// Show loading if not authenticated yet
	if (!isAuthenticated && !currentUser) {
		return (
			<Box>
				<Alert severity="info">Loading user information...</Alert>
			</Box>
		);
	}

	if (currentUser?.role !== 'admin') {
		return (
			<Box>
				<Alert severity="warning">You don't have permission to view this page. Admin access required.</Alert>
			</Box>
		);
	}

	return (
		<Box>
			<Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
				<Typography variant="h4">User Management</Typography>
				<Box>
					<Button startIcon={<Refresh />} onClick={() => dispatch(fetchUsers())} sx={{ mr: 1 }}>
						Refresh
					</Button>
					<Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenAddDialog(true)}>
						Add User
					</Button>
				</Box>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<Paper sx={{ mb: 3 }}>
				<Box p={2}>
					<Typography variant="h6" gutterBottom>
						Users
					</Typography>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Username</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Name</TableCell>
									<TableCell>Role</TableCell>
									<TableCell>Status</TableCell>
									<TableCell>Last Login</TableCell>
									<TableCell>Actions</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Array.isArray(users) &&
									users.map((user) => (
										<TableRow key={user.id}>
											<TableCell>{user.username}</TableCell>
											<TableCell>{user.email}</TableCell>
											<TableCell>
												{user.firstName} {user.lastName}
											</TableCell>
											<TableCell>
												<Chip label={user.role} color={user.role === 'admin' ? 'primary' : 'default'} size="small" />
											</TableCell>
											<TableCell>
												<Chip label={user.isActive ? 'Active' : 'Inactive'} color={user.isActive ? 'success' : 'error'} size="small" />
											</TableCell>
											<TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</TableCell>
											<TableCell>
												<IconButton size="small" onClick={() => handleEditUser(user)} disabled={user.id === currentUser?.id}>
													<Edit />
												</IconButton>
												<IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id, user.username)} disabled={user.id === currentUser?.id}>
													<Delete />
												</IconButton>
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			</Paper>

			<Paper>
				<Box p={2}>
					<Typography variant="h6" gutterBottom>
						Recent Activity
					</Typography>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>User</TableCell>
									<TableCell>Activity</TableCell>
									<TableCell>Description</TableCell>
									<TableCell>IP Address</TableCell>
									<TableCell>Date</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Array.isArray(activities) &&
									activities.slice(0, 10).map((activity) => (
										<TableRow key={activity.id}>
											<TableCell>{activity.username || activity.user_id}</TableCell>
											<TableCell>
												<Chip label={activity.activity_type} size="small" color={activity.activity_type === 'LOGIN' ? 'success' : 'default'} />
											</TableCell>
											<TableCell>{activity.description}</TableCell>
											<TableCell>{activity.ip_address}</TableCell>
											<TableCell>{new Date(activity.created_at).toLocaleString()}</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			</Paper>

			{/* Add User Dialog */}
			<Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Add New User</DialogTitle>
				<DialogContent>
					<TextField fullWidth margin="normal" label="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} error={!!validationErrors.username} helperText={validationErrors.username} />
					<TextField fullWidth margin="normal" label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} error={!!validationErrors.email} helperText={validationErrors.email} />
					<TextField fullWidth margin="normal" label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} error={!!validationErrors.password} helperText={validationErrors.password} />
					<TextField fullWidth margin="normal" label="First Name" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} error={!!validationErrors.firstName} helperText={validationErrors.firstName} />
					<TextField fullWidth margin="normal" label="Last Name" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} error={!!validationErrors.lastName} helperText={validationErrors.lastName} />
					<FormControl fullWidth margin="normal">
						<InputLabel>Role</InputLabel>
						<Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
							<MenuItem value="user">User</MenuItem>
							<MenuItem value="admin">Admin</MenuItem>
						</Select>
					</FormControl>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
					<Button onClick={handleAddUser} variant="contained">
						Add User
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Edit User</DialogTitle>
				<DialogContent>
					{editingUser && (
						<>
							<TextField fullWidth margin="normal" label="First Name" value={editingUser.firstName} onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })} error={!!validationErrors.firstName} helperText={validationErrors.firstName} />
							<TextField fullWidth margin="normal" label="Last Name" value={editingUser.lastName} onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })} error={!!validationErrors.lastName} helperText={validationErrors.lastName} />
							<TextField fullWidth margin="normal" label="Email" type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} error={!!validationErrors.email} helperText={validationErrors.email} />
							<FormControl fullWidth margin="normal">
								<InputLabel>Role</InputLabel>
								<Select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
									<MenuItem value="user">User</MenuItem>
									<MenuItem value="admin">Admin</MenuItem>
								</Select>
							</FormControl>
							<FormControlLabel control={<Switch checked={editingUser.isActive} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })} />} label="Active" />
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
					<Button onClick={handleUpdateUser} variant="contained">
						Update User
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default UsersPage;
