import React from 'react';
import { Typography } from '@mui/material';
import { Link } from 'react-router-dom'; // Optional: if you want the logo to be a link

const Logo = () => {
  return (
    <Typography
      variant="h5"
      component={Link}
      to="/dashboard" // Optional: link to dashboard or home
      sx={{
        textDecoration: 'none',
        color: 'inherit', // Inherit color from parent
        fontWeight: 'bold',
        // Add any other styling for your logo text/image container
      }}
    >
      AppLogo
      {/* Or replace 'AppLogo' with an <img> tag if you have an image file */}
      {/* e.g., <img src="/path-to-your-logo.png" alt="Application Logo" style={{ height: '40px' }} /> */}
    </Typography>
  );
};

export default Logo;