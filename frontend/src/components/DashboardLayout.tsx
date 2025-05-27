import React from 'react';
import { Outlet } from 'react-router-dom';
import HorizontalMenu from './HorizontalMenu';
import Box from '@mui/material/Box';

const DashboardLayout = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <HorizontalMenu />
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        pt: '80px', // Adjust if your HorizontalMenu is taller/shorter
        background: '#f5f6fa', // Light background like Dynamics
        minHeight: '100vh',
      }}
    >
      <Outlet />
    </Box>
  </Box>
);

export default DashboardLayout;