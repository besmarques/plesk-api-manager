import React, { useState } from 'react';
import { Box, Button, Container, Paper, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AppDispatch, RootState } from '@/store';
import { loginUser, clearError } from '@/store/slices/authSlice';

const schema = yup.object().shape({
	username: yup.string().required('Username is required'),
	password: yup.string().required('Password is required'),
});

interface FormData {
	username: string;
	password: string;
}

const LoginPage: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();
	const location = useLocation();
	const { loading, error } = useSelector((state: RootState) => state.auth);
	const [showRegister, setShowRegister] = useState(false);

	// Get the intended destination from location state
	const from = (location.state as any)?.from?.pathname || '/dashboard';

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>({
		resolver: yupResolver(schema),
	});

	const onSubmit = async (data: FormData) => {
		try {
			await dispatch(loginUser(data)).unwrap();
			toast.success('Login successful!');
			// Redirect to the intended page or dashboard
			navigate(from, { replace: true });
		} catch (err: any) {
			toast.error(err.message || 'Login failed');
		}
	};

	React.useEffect(() => {
		return () => {
			dispatch(clearError());
		};
	}, []);

	return (
		<Container component="main" maxWidth="xs">
			<Box
				sx={{
					marginTop: 8,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
					<Typography component="h1" variant="h4" align="center" gutterBottom>
						Plesk API Manager
					</Typography>
					<Typography variant="h6" align="center" color="text.secondary" gutterBottom>
						Sign in to your account
					</Typography>

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					<Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
						<TextField margin="normal" required fullWidth id="username" label="Username" autoComplete="username" autoFocus {...register('username')} error={!!errors.username} helperText={errors.username?.message} />
						<TextField margin="normal" required fullWidth label="Password" type="password" id="password" autoComplete="current-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
						<Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
							{loading ? <CircularProgress size={24} /> : 'Sign In'}
						</Button>
					</Box>
				</Paper>
			</Box>
		</Container>
	);
};

export default LoginPage;
