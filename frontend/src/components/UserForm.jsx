import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import { useStoreContext } from '../context/StoreContext'; // If you have a store context for available stores

const styles = {
    container: { padding: '20px', maxWidth: '700px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    formSpecificErrorText: { color: 'red', fontSize: '0.9em', marginTop: '5px'},
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    select: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em', backgroundColor: 'white' },
    checkboxLabel: { marginLeft: '8px', fontWeight: 'normal', color: '#555' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

function UserForm() {
    const { userId } = useParams(); // Matches :userId in App.jsx route
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading, ROLES_OPTIONS } = useAuth();
    // const { stores, isLoading: storesLoading } = useStoreContext(); // Example for stores

    const isEditing = Boolean(userId);

    // Form state based on your users table schema
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [roleId, setRoleId] = useState(''); // Store role_id
    const [isActive, setIsActive] = useState(true);
    const [employeeId, setEmployeeId] = useState('');
    // const [assignedStoreIds, setAssignedStoreIds] = useState([]); // For multi-store assignment

    const [availableRoles, setAvailableRoles] = useState([]);
    // const [availableStores, setAvailableStores] = useState([]);


    const [isLoading, setIsLoading] = useState(false); // Form-specific loading
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState(''); // For field-specific errors or general form error

    // Fetch roles (example, adapt if ROLES_OPTIONS from context is sufficient or you have an API)
    useEffect(() => {
        if (ROLES_OPTIONS) {
            setAvailableRoles(ROLES_OPTIONS);
            if (!isEditing && ROLES_OPTIONS.length > 0) {
                 // Set a default role for new users if desired, e.g., Sales Person
                const defaultRole = ROLES_OPTIONS.find(r => r.label === 'Sales Person');
                if (defaultRole) setRoleId(defaultRole.value);
            }
        }
        // else if (apiInstance) { /* Fetch roles from API if not in context */ }
    }, [ROLES_OPTIONS, apiInstance, isEditing]);

    // Fetch user data if editing
    const fetchUserData = useCallback(async () => {
        if (!isEditing || !apiInstance || !isAuthenticated || !userId) {
            console.warn("[UserForm fetchUserData] Pre-conditions not met.");
            return;
        }
        console.log(`[UserForm] Fetching user data for ID: ${userId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/users/${userId}`); // API uses the ID from the URL
            const userData = response.data;
            setUsername(userData.username || '');
            setFirstName(userData.first_name || '');
            setLastName(userData.last_name || '');
            setEmail(userData.email || '');
            setRoleId(userData.role_id || ''); // Assuming API returns role_id
            setIsActive(userData.is_active !== undefined ? userData.is_active : true);
            setEmployeeId(userData.employee_id || '');
            // setAssignedStoreIds(userData.stores?.map(s => s.id) || []); // Example for assigned stores
            console.log("[UserForm] User data fetched:", userData);
        } catch (err) {
            console.error("[UserForm] Failed to fetch user data:", err);
            setPageError(err.response?.data?.message || "Failed to load user data. User may not exist or an error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, apiInstance, isAuthenticated, isEditing]);

    useEffect(() => {
        if (ROLES_OPTIONS) {
            setAvailableRoles(ROLES_OPTIONS);
            if (!isEditing && ROLES_OPTIONS.length > 0) {
                const defaultRole = ROLES_OPTIONS.find(r => r.label === 'Sales Person');
                if (defaultRole) {
                    setRoleId(defaultRole.value);
                } else if (ROLES_OPTIONS.length > 0) { // Fallback if 'Sales Person' not found
                    setRoleId(ROLES_OPTIONS[0].value);
                }
            } else if (!isEditing && ROLES_OPTIONS.length === 0) {
                setRoleId(''); // Explicitly clear if no roles
            }
        } else {
            // ROLES_OPTIONS is null or undefined
            setAvailableRoles([]);
            if (!isEditing) {
                setRoleId('');
            }
        }
    }, [ROLES_OPTIONS, isEditing]); // Effect for handling ROLES_OPTIONS

    useEffect(() => {
        if (authLoading) return; 

        if (!isAuthenticated) {
            setPageError("Authentication required.");
            return;
        }
        if (isEditing) {
            fetchUserData();
        } else {
            // Reset form for "Add New" mode
            setUsername('');
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            // This part ensures roleId is set based on availableRoles when creating a new user
            if (availableRoles.length > 0) {
                const defaultRole = availableRoles.find(r => r.label === 'Sales Person');
                if (defaultRole) {
                    setRoleId(defaultRole.value);
                } else {
                    setRoleId(availableRoles[0].value); // Fallback to first role
                }
            } else {
                setRoleId(''); // If no roles available (yet)
            }
            setIsActive(true);
            setEmployeeId('');
            setPageError(null);
            setFormError('');
        }
    }, [isEditing, fetchUserData, authLoading, isAuthenticated, availableRoles]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setPageError(null);

        if (!username.trim()) {
            setFormError("Username is required.");
            return;
        }
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
            setFormError("A valid email is required.");
            return;
        }
        if (!isEditing && !password) { // Password required for new users
            setFormError("Password is required for new users.");
            return;
        }
        if (password && password !== confirmPassword) {
            setFormError("Passwords do not match.");
            return;
        }
        if (!roleId) {
            setFormError("Role is required.");
            return;
        }

        setIsLoading(true);

        const userDataPayload = {
            username: username.trim(),
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
            email: email.trim(),
            role_id: parseInt(roleId, 10), // Ensure role_id is an integer
            is_active: isActive,
            employee_id: employeeId.trim() || null,
            // store_ids: assignedStoreIds, // Example for store assignment
        };

        if (password) { // Only include password if it's being set/changed
            userDataPayload.password = password;
        }

        console.log("[UserForm] Submitting data:", userDataPayload);

        try {
            if (isEditing) {
                await apiInstance.put(`/users/${userId}`, userDataPayload);
            } else {
                await apiInstance.post('/users', userDataPayload);
            }
            navigate('/dashboard/users', {
                state: {
                    message: `User "${userDataPayload.username}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[UserForm] Error saving user:", err.response || err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'save' : 'create'} user.`;
            // If backend sends specific field errors, you might want to parse them
            // e.g., if (err.response?.data?.errors) { setFormError(Object.values(err.response.data.errors).join(', ')); }
            setFormError(errMsg); // Display as a general form error for now
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    // Initial loading for edit mode before data is fetched
    if (isEditing && isLoading && !username && !pageError) return <p style={styles.centeredMessage}>Loading user details...</p>;
    if (pageError) return <p style={styles.errorBox}>Error: {pageError}</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit User (ID: ${userId})` : 'Add New User'}</h2>
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>{formError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Username: *</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="firstName" style={styles.label}>First Name:</label>
                    <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="lastName" style={styles.label}>Last Name:</label>
                    <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email: *</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="password" style={styles.label}>{isEditing ? 'New Password (leave blank to keep current):' : 'Password: *'}</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="confirmPassword" style={styles.label}>{isEditing ? 'Confirm New Password:' : 'Confirm Password: *'}</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} disabled={isLoading} />
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="roleId" style={styles.label}>Role: *</label>
                    <select id="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} required style={styles.select} disabled={isLoading || availableRoles.length === 0}>
                        <option value="">-- Select Role --</option>
                        {availableRoles.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="employeeId" style={styles.label}>Employee ID:</label>
                    <input type="text" id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={styles.input} disabled={isLoading} />
                </div>
                <div style={styles.formGroup}>
                    <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isLoading} />
                    <label htmlFor="isActive" style={styles.checkboxLabel}>User is Active</label>
                </div>

                {/* Placeholder for store assignment - this would require more complex UI and state */}
                {/* <div style={styles.formGroup}>
                    <label style={styles.label}>Assign Stores:</label>
                    {availableStores.map(store => (
                        <div key={store.id}>
                            <input
                                type="checkbox"
                                id={`store-${store.id}`}
                                checked={assignedStoreIds.includes(store.id)}
                                onChange={(e) => {
                                    const storeIdNum = parseInt(store.id, 10);
                                    if (e.target.checked) {
                                        setAssignedStoreIds(prev => [...prev, storeIdNum]);
                                    } else {
                                        setAssignedStoreIds(prev => prev.filter(id => id !== storeIdNum));
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <label htmlFor={`store-${store.id}`} style={styles.checkboxLabel}>{store.name}</label>
                        </div>
                    ))}
                </div> */}

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/users')} style={styles.buttonSecondary} disabled={isLoading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default UserForm;