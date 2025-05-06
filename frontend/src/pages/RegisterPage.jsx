import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const { register } = useAuth(); // Use the register function from context
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsRegistering(true);

        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            setIsRegistering(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsRegistering(false);
            return;
        }

        if (password.length < 6) {
             setError('Password must be at least 6 characters long.');
             setIsRegistering(false);
             return;
        }

        try {
            const result = await register(name, email, password);

            if (result.success) {
                console.log("Registration successful, navigating to login...");
                // Optionally automatically log in the user here by calling login()
                // Or redirect to login page for them to log in manually
                navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
            } else {
                setError(result.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error("Register page error:", err);
            setError('An unexpected error occurred during registration.');
        } finally {
            setIsRegistering(false);
        }
    };

    // Reusing styles similar to LoginPage for consistency
    const styles = {
        container: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
        formGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '5px' },
        input: { width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
        button: { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
        buttonDisabled: { backgroundColor: '#aaa', cursor: 'not-allowed' },
        error: { color: 'red', marginBottom: '10px', textAlign: 'center' },
        linkContainer: { marginTop: '15px', textAlign: 'center' },
        link: { color: '#007bff', textDecoration: 'none' }
    };

    return (
        <div style={styles.container}>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                {error && <p style={styles.error}>{error}</p>}
                <div style={styles.formGroup}>
                    <label htmlFor="name" style={styles.label}>Name:</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={styles.input}
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
                    />
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="confirmPassword" style={styles.label}>Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={styles.input}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isRegistering}
                    style={isRegistering ? {...styles.button, ...styles.buttonDisabled} : styles.button}
                >
                    {isRegistering ? 'Registering...' : 'Register'}
                </button>
            </form>
            <div style={styles.linkContainer}>
                Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
            </div>
        </div>
    );
}

export default RegisterPage;