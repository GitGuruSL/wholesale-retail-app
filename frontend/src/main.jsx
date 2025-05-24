import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Assuming AuthProvider is here
import { StoreProvider } from './context/StoreContext'; // Assuming StoreProvider is here
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- THIS IS THE SINGLE, TOP-LEVEL ROUTER */}
      <AuthProvider>
        <StoreProvider> {/* Ensure StoreProvider wraps App if needed */}
          <App />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);