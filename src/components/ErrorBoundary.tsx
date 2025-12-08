import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('Error Boundary caught an error:', error);
		console.error('Error Info:', errorInfo);
		this.setState({ error, errorInfo });
	}

	render() {
		if (this.state.hasError) {
			return (
				<Box
					sx={{
						height: '100vh',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						p: 4,
					}}
				>
					<Typography variant="h4" color="error" gutterBottom>
						Oops! Something went wrong
					</Typography>
					<Typography variant="body1" color="text.secondary" gutterBottom>
						An error occurred while rendering the application.
					</Typography>
					{this.state.error && (
						<Box sx={{ mt: 2, mb: 2 }}>
							<Typography variant="h6">Error Details:</Typography>
							<pre
								style={{
									background: '#f5f5f5',
									padding: '16px',
									borderRadius: '4px',
									maxWidth: '600px',
									overflow: 'auto',
								}}
							>
								{this.state.error.toString()}
								{this.state.errorInfo?.componentStack}
							</pre>
						</Box>
					)}
					<Button
						variant="contained"
						onClick={() => {
							this.setState({ hasError: false, error: undefined, errorInfo: undefined });
							window.location.reload();
						}}
					>
						Reload Page
					</Button>
				</Box>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
