import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import { store } from '@/store';
import App from './App';
import ErrorBoundary from '@/components/ErrorBoundary';

const theme = createTheme({
	palette: {
		mode: 'light',
		primary: {
			main: '#1976d2',
		},
		secondary: {
			main: '#dc004e',
		},
	},
});

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<Provider store={store}>
				<BrowserRouter>
					<ThemeProvider theme={theme}>
						<CssBaseline />
						<App />
						<Toaster position="top-right" />
					</ThemeProvider>
				</BrowserRouter>
			</Provider>
		</ErrorBoundary>
	</React.StrictMode>
);
