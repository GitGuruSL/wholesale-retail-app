import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    // Alias setError from useAuth to avoid conflict
    const { loginUser, isLoading, error: authErrorFromContext, setError: setAuthError, user } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();
    // This is the local error state for the LoginPage
    const [error, setError] = useState(null); 
    const [loading, setLoading] = useState(false);

    // This useEffect might not be necessary or should have different dependencies.
    // If you want to clear the local error when the component mounts or authErrorFromContext changes:
    useEffect(() => {
        setError(null); // Clears local error
        // If you also want to clear the context error when this page loads:
        // setAuthError(null); 
    }, [setAuthError]); // Or an empty array [] if only on mount, or [authErrorFromContext]

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
        setLoading(true);
        setError(null); // Clear local error before attempting login
        // setAuthError(null); // Optionally clear context error too

        try {
            const result = await loginUser({ username, password });

            if (result && result.success) {
                console.log("LoginPage: Login successful, navigating to dashboard. User:", result.user);
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
            } else {
                // Use the local setError for login attempt failures
                const errorMessage = result?.error || authErrorFromContext || "Login failed. Please try again.";
                setError(errorMessage);
                console.error("LoginPage: Login failed. AuthContext error:", authErrorFromContext, "LoginUser result error:", result?.error);
            }
        } catch (err) {
            // Use the local setError for network/other errors
            const errorMessage = err.response?.data?.message || "Login failed. Please try again.";
            setError(errorMessage);
            console.error("Login error:", err);
        } finally {
            setLoading(false);
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
                <button type="submit" disabled={isLoading || loading} style={styles.button}>
                    {(isLoading || loading) ? 'Logging in...' : 'Login'}
                </button>
                {/* Display the local error state */}
                {error && <p style={styles.error}>{error}</p>}
                {/* You might also want to display authErrorFromContext if it's different and relevant */}
                {/* {authErrorFromContext && !error && <p style={styles.error}>{authErrorFromContext}</p>} */}
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