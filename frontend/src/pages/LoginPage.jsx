import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { loginUser, isLoading, error: authError, setError, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setError(null);
    }, [setError]);

    useEffect(() => {
        if (user) {
            const from = location.state?.from?.pathname || '/';
            console.log("LoginPage: User already authenticated, redirecting to:", from);
            navigate(from, { replace: true });
        }
    }, [user, navigate, location.state]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("LoginPage: Attempting login with credentials:", { username, password });
        
        const result = await loginUser({ username, password });

        if (result && result.success) {
            console.log("LoginPage: Login successful, navigating to dashboard. User:", result.user);
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } else {
            console.error("LoginPage: Login failed. AuthContext error:", authError, "LoginUser result error:", result?.error);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Login</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="password" style={styles.label}>Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                    />
                </div>
                <button type="submit" disabled={isLoading} style={styles.button}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                {authError && <p style={styles.error}>{authError}</p>}
            </form>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px',
    },
    title: {
        marginBottom: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    button: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    error: {
        color: 'red',
        marginTop: '10px',
        textAlign: 'center',
    }
};

export default LoginPage;