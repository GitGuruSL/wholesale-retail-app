import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext'; // Assuming AuthProvider is here
import { StoreProvider } from './context/StoreContext'; // Assuming StoreProvider is here
import { SecondaryMenuProvider } from './context/SecondaryMenuContext'; // <-- Import this
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- THIS IS THE SINGLE, TOP-LEVEL ROUTER */}
      <AuthProvider>
        <StoreProvider> {/* Ensure StoreProvider wraps App if needed */}
          <SecondaryMenuProvider> {/* <-- Wrap App with SecondaryMenuProvider */}
            <App />
          </SecondaryMenuProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);