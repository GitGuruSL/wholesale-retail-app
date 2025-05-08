import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4A90E2', // cool blue
    },
    secondary: {
      main: '#50E3C2', // fresh greenish teal
    },
    error: {
      main: '#D0021B', // deep red
    },
    warning: {
      main: '#F5A623', // warm orange
    },
    success: {
      main: '#7ED321', // lively green
    },
    background: {
      default: '#F2F2F2',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: ['Poppins', 'sans-serif'].join(','),
    h5: {
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '6px',
        },
      },
    },
  },
});

export default theme;