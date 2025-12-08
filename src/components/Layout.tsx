import React from 'react';
import { AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Domain, People, Settings, Logout } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

import { RootState, AppDispatch } from '@/store';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { logoutUser } from '@/store/slices/authSlice';

const drawerWidth = 240;

interface Props {
	children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch<AppDispatch>();

	const { sidebarOpen } = useSelector((state: RootState) => state.ui);
	const { user } = useSelector((state: RootState) => state.auth);

	const menuItems = [
		{ text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
		{ text: 'Domains', icon: <Domain />, path: '/domains' },
		{ text: 'Users', icon: <People />, path: '/users' },
		{ text: 'Settings', icon: <Settings />, path: '/settings' },
	];

	const handleDrawerToggle = () => {
		dispatch(toggleSidebar());
	};

	const handleLogout = () => {
		dispatch(logoutUser());
	};

	const handleNavigation = (path: string) => {
		navigate(path);
	};

	const drawer = (
		<Box>
			<Toolbar>
				<Typography variant="h6" noWrap component="div">
					Plesk Manager
				</Typography>
			</Toolbar>
			<List>
				{menuItems.map((item) => (
					<ListItem key={item.text} disablePadding>
						<ListItemButton selected={location.pathname === item.path} onClick={() => handleNavigation(item.path)}>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.text} />
						</ListItemButton>
					</ListItem>
				))}
				<ListItem disablePadding>
					<ListItemButton onClick={handleLogout}>
						<ListItemIcon>
							<Logout />
						</ListItemIcon>
						<ListItemText primary="Logout" />
					</ListItemButton>
				</ListItem>
			</List>
		</Box>
	);

	return (
		<Box sx={{ display: 'flex' }}>
			<CssBaseline />
			<AppBar
				position="fixed"
				sx={{
					width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
					ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
				}}
			>
				<Toolbar>
					<IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
						<MenuIcon />
					</IconButton>
					<Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
						Plesk API Manager
					</Typography>
					<Typography variant="body2">
						Welcome, {user?.firstName} {user?.lastName}
					</Typography>
				</Toolbar>
			</AppBar>

			<Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
				<Drawer
					variant="persistent"
					open={sidebarOpen}
					sx={{
						'& .MuiDrawer-paper': {
							boxSizing: 'border-box',
							width: drawerWidth,
						},
					}}
				>
					{drawer}
				</Drawer>
			</Box>

			<Box
				component="main"
				sx={{
					flexGrow: 1,
					p: 3,
					width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
					ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
				}}
			>
				<Toolbar />
				{children}
			</Box>
		</Box>
	);
};

export default Layout;
