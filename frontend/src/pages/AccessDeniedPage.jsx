import React from 'react';
import { Link } from 'react-router-dom';

const AccessDeniedPage = () => {
    return (
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: '#dc3545' }}>Access Denied</h1>
            <p style={{ fontSize: '1.2em', marginBottom: '30px' }}>
                You do not have the necessary permissions to view this page.
            </p>
            <Link 
                to="/" 
                style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    textDecoration: 'none', 
                    borderRadius: '5px' 
                }}
            >
                Go to Dashboard
            </Link>
        </div>
    );
};

export default AccessDeniedPage;