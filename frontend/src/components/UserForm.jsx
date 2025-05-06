import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import { ROLES_OPTIONS } from '../utils/roles'; // No longer needed, get from AuthContext

const UserForm = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { api, ROLES_OPTIONS } = useAuth(); // Get ROLES_OPTIONS from AuthContext
    const isEditing = Boolean(userId);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Initialize role state after ROLES_OPTIONS is available from context
    const [role, setRole] = useState('');
    const [storeId, setStoreId] = useState('');
    const [availableStores, setAvailableStores] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [loadingStoresError, setLoadingStoresError] = useState(null);

    useEffect(() => {
        // Set initial role once ROLES_OPTIONS is loaded from context
        if (ROLES_OPTIONS && ROLES_OPTIONS.length > 0) {
            if (!isEditing || !role) { // Only set default if not editing or role isn't already set
                 setRole(ROLES_OPTIONS[0].value);
            }
        }
    }, [ROLES_OPTIONS, isEditing, role]);


    const fetchUserData = useCallback(async () => {
        if (!isEditing || !api) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/users/${userId}`);
            const userData = response.data;
            setUsername(userData.username);
            setEmail(userData.email || '');
            setRole(userData.role); // This will be the role value e.g., "store_admin"
            setStoreId(userData.store_id?.toString() || '');
        } catch (err) {
            console.error("Error fetching user details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load user data.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch user. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [userId, isEditing, api]);

    const fetchAvailableStores = useCallback(async () => {
        if (!api) return;
        setLoadingStoresError(null);
        try {
            const response = await api.get('/stores');
            setAvailableStores(response.data || []);
        } catch (err) {
            console.error("Failed to fetch stores", err);
            const errorMsg = err.response?.data?.message || 'Failed to load stores for assignment.';
             if (err.response?.status === 401 || err.response?.status === 403) {
                setLoadingStoresError('Unauthorized: Could not fetch stores. Please log in again.');
            } else {
                setLoadingStoresError(errorMsg);
            }
        }
    }, [api]);

    useEffect(() => {
        fetchAvailableStores();
        if (isEditing) {
            fetchUserData();
        } else {
            // Reset form for new entry
            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            // Role is set by the other useEffect based on ROLES_OPTIONS
            setStoreId('');
            setError(null);
            setSuccessMessage(null);
        }
    }, [isEditing, fetchUserData, fetchAvailableStores]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        if (!username.trim()) { setError("Username is required."); setLoading(false); return; }
        if (!email.trim()) { setError("Email is required."); setLoading(false); return; }
        if (!/\S+@\S+\.\S+/.test(email.trim())) { setError("Please enter a valid email address."); setLoading(false); return; }
        if (!role) { setError("Role is required."); setLoading(false); return; }

        if (!isEditing) {
            if (!password) { setError("Password is required for new users."); setLoading(false); return; }
            if (password !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
        } else {
            if (password && confirmPassword && password !== confirmPassword) {
                setError("Passwords do not match.");
                setLoading(false);
                return;
            }
        }

        const userData = {
            username: username.trim(),
            email: email.trim(),
            role,
            store_id: (role === 'store_admin' || role === 'sales_person') && storeId ? parseInt(storeId) : null,
        };

        if (password) { // Only include password if it's being set/changed
            userData.password = password;
        }

        try {
            if (isEditing) {
                await api.put(`/users/${userId}`, userData);
                setSuccessMessage('User updated successfully!');
            } else {
                await api.post('/users', userData);
                setSuccessMessage('User created successfully!');
            }
            setTimeout(() => {
                navigate('/users');
            }, 1500);
        } catch (err) {
            console.error("Error saving user:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save user. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && isEditing && !username && !error) return <p style={styles.centeredMessage}>Loading user data...</p>;
    if (!ROLES_OPTIONS) return <p style={styles.centeredMessage}>Loading configuration...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit User' : 'Create New User'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            {successMessage && <p style={styles.successBox}>{successMessage}</p>}
            {loadingStoresError && <p style={styles.errorBox}>Store Loading Error: {loadingStoresError}</p>}

            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Username: *</label>
                    <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} required style={styles.input} disabled={loading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email: *</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input} disabled={loading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="password" style={styles.label}>Password: {isEditing ? '(Leave blank to keep current)' : '*'}</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} disabled={loading} />
                </div>
                
                <div style={styles.formGroup}>
                    <label htmlFor="confirmPassword" style={styles.label}>Confirm Password: {isEditing && !password ? '(Only if changing password)' : (isEditing && password ? '*' : '*')}</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={styles.input} disabled={loading || (isEditing && !password)} required={!isEditing || (isEditing && password)} />
                </div>
                
                <div style={styles.formGroup}>
                    <label htmlFor="role" style={styles.label}>Role: *</label>
                    <select id="role" value={role} onChange={e => setRole(e.target.value)} required style={styles.input} disabled={loading || !ROLES_OPTIONS}>
                        {ROLES_OPTIONS && ROLES_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                {(role === 'store_admin' || role === 'sales_person') && (
                     <div style={styles.formGroup}>
                        <label htmlFor="storeId" style={styles.label}>Assign to Store:</label>
                        <select 
                            id="storeId" 
                            value={storeId} 
                            onChange={e => setStoreId(e.target.value)} 
                            style={styles.input} 
                            disabled={loading || availableStores.length === 0}
                            required // Store assignment is required if the role needs it
                        >
                            <option value="">-- Select Store --</option>
                            {availableStores.map(store => (
                                <option key={store.id} value={store.id.toString()}>{store.name}</option>
                            ))}
                        </select>
                        {availableStores.length === 0 && !loadingStoresError && <p style={styles.fieldHelperText}>No stores available for assignment.</p>}
                    </div>
                )}

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                    </button>
                    <button type="button" onClick={() => navigate('/users')} style={styles.buttonSecondary} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

// Consistent Form Styles
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    successBox: { color: '#2F855A', border: '1px solid #C6F6D5', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#E6FFFA' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    fieldHelperText: { fontSize: '0.9em', color: '#666', marginTop: '5px' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default UserForm;