import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/FormStyles';

function UserForm() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading, ROLES_OPTIONS } = useAuth();

    const isEditing = Boolean(userId);

    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [roleId, setRoleId] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [employeeId, setEmployeeId] = useState('');
    
    const [availableRoles, setAvailableRoles] = useState([]);
    const [availableStores, setAvailableStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (ROLES_OPTIONS && Array.isArray(ROLES_OPTIONS)) {
            setAvailableRoles(ROLES_OPTIONS);
            if (!isEditing && ROLES_OPTIONS.length > 0) {
                const defaultRole = ROLES_OPTIONS.find(r => r.machineName === 'sales_person') || ROLES_OPTIONS[0];
                setRoleId(defaultRole.value);
            }
        }
    }, [ROLES_OPTIONS, isEditing]);

    const fetchAvailableStores = useCallback(async () => {
        if (!apiInstance || !isAuthenticated) return;
        try {
            const response = await apiInstance.get('/stores'); // Ensure this endpoint exists
            if (response.data && Array.isArray(response.data)) {
                setAvailableStores(response.data.map(store => ({ value: String(store.id), label: store.name })));
            } else {
                setAvailableStores([]);
            }
        } catch (err) {
            console.error("[UserForm] Failed to fetch stores:", err);
            setPageError(prev => prev ? `${prev}\nFailed to load stores.` : "Failed to load stores.");
            setAvailableStores([]);
        }
    }, [apiInstance, isAuthenticated]);

    const fetchUserData = useCallback(async () => {
        if (!userId || !apiInstance || !isAuthenticated) return;
        setIsLoading(true); 
        setPageError(null);
        try {
            const response = await apiInstance.get(`/users/${userId}`);
            const userData = response.data;
            setUsername(userData.username || '');
            setFirstName(userData.user_first_name || userData.first_name || '');
            setLastName(userData.user_last_name || userData.last_name || '');
            setEmail(userData.user_email || userData.email || '');
            setRoleId(userData.role_id ? String(userData.role_id) : '');
            setSelectedStoreId(userData.current_store_id ? String(userData.current_store_id) : '');
            setIsActive(userData.is_active !== undefined ? userData.is_active : true);
            setEmployeeId(userData.employee_id || '');
        } catch (err) {
            console.error("[UserForm] Failed to fetch user data:", err);
            setPageError(err.response?.data?.message || "Failed to load user data.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, apiInstance, isAuthenticated]);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setPageError("Authentication required.");
            return;
        }
        setPageError(null);
        fetchAvailableStores();
        if (isEditing && userId) {
            fetchUserData();
        } else if (!isEditing) {
            setUsername(''); setFirstName(''); setLastName(''); setEmail('');
            setPassword(''); setConfirmPassword(''); setSelectedStoreId('');
            setIsActive(true); setEmployeeId(''); setFormError('');
        }
    }, [isEditing, userId, authLoading, isAuthenticated, fetchUserData, fetchAvailableStores]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditing && !password) {
            setFormError("Password is required for new users."); 
            return;
        }
        if (password && password !== confirmPassword) {
            setFormError("Passwords do not match."); 
            return;
        }
        if (password && password.length < 6) {
            setFormError("Password must be at least 6 characters long."); 
            return;
        }
        if (!roleId) {
            setFormError("Role is required."); 
            return;
        }
        setFormError('');
        setIsLoading(true);

        const userDataPayload = {
            username: username.trim(),
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
            email: email.trim(),
            role_id: parseInt(roleId, 10),
            is_active: isActive,
            employee_id: employeeId.trim() || null,
            current_store_id: selectedStoreId ? parseInt(selectedStoreId, 10) : null,
        };
        if (password) { 
            userDataPayload.password = password; 
        }

        try {
            if (isEditing) {
                await apiInstance.put(`/users/${userId}`, userDataPayload);
            } else {
                await apiInstance.post('/users', userDataPayload);
            }
            navigate('/dashboard/users', {
                state: { message: `User "${userDataPayload.username}" ${isEditing ? 'updated' : 'created'} successfully.` }
            });
        } catch (err) {
            console.error("[UserForm] Error saving user:", err.response || err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user.`;
            setFormError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (pageError && !isEditing && !authLoading) return <p style={styles.errorBox}>Error: {pageError}</p>;

    const canAssignStore = true; // Replace with real permission check if needed

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit User (ID: ${userId})` : 'Add New User'}</h2>
            {pageError && isEditing && <p style={styles.errorBox}>Error loading user data: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>{formError}</p>}
            {isEditing && isLoading && !pageError && <p style={styles.centeredMessage}>Loading user details...</p>}
            { !((isEditing && isLoading && !pageError) || (isEditing && pageError)) && (
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label htmlFor="username" style={styles.label}>Username: *</label>
                        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="firstName" style={styles.label}>First Name:</label>
                        <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="lastName" style={styles.label}>Last Name:</label>
                        <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>Email: *</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>{isEditing ? 'New Password (leave blank to keep current):' : 'Password: *'}</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="confirmPassword" style={styles.label}>{isEditing ? 'Confirm New Password:' : 'Confirm Password: *'}</label>
                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="roleId" style={styles.label}>Role: *</label>
                        <select
                            id="roleId"
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            required
                            style={styles.select}
                            disabled={isLoading || authLoading || availableRoles.length === 0}
                        >
                            <option value="">-- Select Role --</option>
                            {availableRoles.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                        {availableRoles.length === 0 && !authLoading && <p style={styles.formSpecificErrorText}>No roles available.</p>}
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="storeId" style={styles.label}>Current Store:</label>
                        <select
                            id="storeId"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={styles.select}
                            disabled={isLoading || authLoading || availableStores.length === 0 || !canAssignStore}
                        >
                            <option value="">-- No Store Assigned --</option>
                            {availableStores.map(store => (
                                <option key={store.value} value={store.value}>{store.label}</option>
                            ))}
                        </select>
                        {availableStores.length === 0 && !authLoading && canAssignStore && <p style={styles.formSpecificErrorText}>No stores available to assign.</p>}
                        {!canAssignStore && <p style={styles.formSpecificErrorText}>You do not have permission to assign stores.</p>}
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="employeeId" style={styles.label}>Employee ID:</label>
                        <input type="text" id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    <div style={styles.formGroup}>
                        <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isLoading || authLoading} style={{verticalAlign: 'middle'}} />
                        <label htmlFor="isActive" style={styles.checkboxLabel}>User is Active</label>
                    </div>
                    <div style={styles.buttonGroup}>
                        <button type="submit" disabled={isLoading || authLoading} style={styles.buttonPrimary}>
                            {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update User' : 'Create User')}
                        </button>
                        <button type="button" onClick={() => navigate('/dashboard/users')} style={styles.buttonSecondary} disabled={isLoading || authLoading}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default UserForm;