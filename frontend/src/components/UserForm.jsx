import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Define the styles object (assuming it's correctly defined as in previous responses)
const styles = {
    container: {
        maxWidth: '600px',
        margin: '20px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
    },
    title: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        color: '#555',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: '16px',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: '16px',
        backgroundColor: 'white',
    },
    checkboxLabel: {
        marginLeft: '8px',
        color: '#555',
        fontWeight: 'normal',
        verticalAlign: 'middle',
    },
    buttonGroup: {
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
    },
    buttonPrimary: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    buttonSecondary: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    errorBox: {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    formSpecificErrorText: {
        color: 'red',
        fontSize: '0.9em',
        marginTop: '5px',
    },
    centeredMessage: {
        textAlign: 'center',
        padding: '20px',
        color: '#555',
    }
};

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
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        console.log('[UserForm Effect 1] ROLES_OPTIONS from context:', JSON.parse(JSON.stringify(ROLES_OPTIONS)));
        if (ROLES_OPTIONS && Array.isArray(ROLES_OPTIONS)) {
            setAvailableRoles(ROLES_OPTIONS);
            console.log('[UserForm Effect 1] availableRoles state set to:', JSON.parse(JSON.stringify(ROLES_OPTIONS)));

            if (!isEditing) {
                const defaultRoleOption = ROLES_OPTIONS.find(r => r.machineName === 'sales_person');
                let newRoleIdToSet = '';
                if (defaultRoleOption) {
                    newRoleIdToSet = defaultRoleOption.value;
                } else if (ROLES_OPTIONS.length > 0) {
                    newRoleIdToSet = ROLES_OPTIONS[0].value;
                }
                setRoleId(newRoleIdToSet);
                console.log('[UserForm Effect 1] For NEW user, roleId state set to:', newRoleIdToSet);
            }
        } else {
            setAvailableRoles([]);
            console.log('[UserForm Effect 1] ROLES_OPTIONS from context is empty or not an array. availableRoles set to [].');
            if (!isEditing) {
                setRoleId('');
            }
        }
    }, [ROLES_OPTIONS, isEditing]);

    const fetchUserData = useCallback(async () => {
        if (!userId || !apiInstance || !isAuthenticated) {
            if (!userId) setIsLoading(false); // Ensure loading is stopped if userId is missing
            return;
        }
        console.log(`[UserForm fetchUserData] Attempting to fetch user data for ID: ${userId}`);
        setIsLoading(true); setPageError(null);
        try {
            const response = await apiInstance.get(`/users/${userId}`);
            const userData = response.data;
            console.log("[UserForm fetchUserData] Raw user data from API:", JSON.parse(JSON.stringify(userData)));

            setUsername(userData.username || '');
            setFirstName(userData.first_name || '');
            setLastName(userData.last_name || '');
            setEmail(userData.email || '');

            const fetchedRoleId = userData.role_id;
            const roleIdToSet = fetchedRoleId !== null && fetchedRoleId !== undefined ? String(fetchedRoleId) : '';
            setRoleId(roleIdToSet);
            console.log(`[UserForm fetchUserData] Fetched role_id: ${fetchedRoleId} (type: ${typeof fetchedRoleId}). roleId state will be set to: '${roleIdToSet}' (type: ${typeof roleIdToSet})`);

            setIsActive(userData.is_active !== undefined ? userData.is_active : true);
            setEmployeeId(userData.employee_id || '');
        } catch (err) {
            console.error("[UserForm fetchUserData] Failed to fetch user data:", err.response?.data?.message || err.message, err);
            setPageError(err.response?.data?.message || "Failed to load user data.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, apiInstance, isAuthenticated]);

    useEffect(() => {
        console.log('[UserForm Effect 2] Running. AuthLoading:', authLoading, 'IsAuthenticated:', isAuthenticated, 'IsEditing:', isEditing, 'UserId:', userId);
        if (authLoading) return;

        if (!isAuthenticated) {
            setPageError("Authentication required. Please log in.");
            setUsername(''); setFirstName(''); setLastName(''); setEmail('');
            setPassword(''); setConfirmPassword(''); setRoleId('');
            setIsActive(true); setEmployeeId(''); setFormError('');
            return;
        }
        setPageError(null);

        if (isEditing && userId) {
            console.log('[UserForm Effect 2] Is editing mode. Calling fetchUserData.');
            fetchUserData();
        } else if (!isEditing) {
            console.log('[UserForm Effect 2] Is NEW user mode. Resetting form fields (role handled by Effect 1).');
            setUsername(''); setFirstName(''); setLastName(''); setEmail('');
            setPassword(''); setConfirmPassword('');
            // Default role for new users is handled by Effect 1
            setIsActive(true); setEmployeeId(''); setFormError('');
        }
    }, [isEditing, userId, authLoading, isAuthenticated, fetchUserData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditing && !password) {
            setFormError("Password is required for new users."); return;
        }
        if (password && password !== confirmPassword) {
            setFormError("Passwords do not match."); return;
        }
        if (password && password.length < 6) {
            setFormError("Password must be at least 6 characters long."); return;
        }
        if (!roleId || roleId === "") {
            setFormError("Role is required. Please select a role."); return;
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
        };
        if (password) { userDataPayload.password = password; }

        console.log("[UserForm handleSubmit] Submitting data:", userDataPayload);
        try {
            if (isEditing) {
                await apiInstance.put(`/users/${userId}`, userDataPayload);
            } else {
                await apiInstance.post('/users', userDataPayload);
            }
            navigate('/dashboard/users', {
                state: { message: `User "${userDataPayload.username}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[UserForm handleSubmit] Error saving user:", err.response || err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'save' : 'create'} user.`;
            setFormError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Enhanced Logging before return ---
    console.log(`%c[UserForm Render] Key States:
    isEditing: ${isEditing}, userId: ${userId}
    roleId state: '${roleId}' (type: ${typeof roleId})
    availableRoles count: ${availableRoles.length}`, 'color: blue; font-weight: bold;');

    if (availableRoles.length > 0 && roleId !== '') {
        const selectedRoleExists = availableRoles.some(role => role.value === roleId);
        console.log(`%c[UserForm Render] Does current roleId ('${roleId}') exist in availableRoles? ${selectedRoleExists ? 'YES' : 'NO'}`, selectedRoleExists ? 'color: green;' : 'color: red;');
        if (!selectedRoleExists) {
            console.warn(`[UserForm Render] Mismatch Details: roleId '${roleId}' not found in availableRoles.
            Available role values: [${availableRoles.map(r => `'${r.value}'`).join(', ')}]
            Available roles full:`, JSON.parse(JSON.stringify(availableRoles)));
        }
    } else if (roleId === '' && availableRoles.length > 0) {
        console.log("[UserForm Render] roleId is empty, '-- Select Role --' should be chosen.");
    } else if (availableRoles.length === 0) {
        console.log("[UserForm Render] availableRoles is empty. Dropdown will be disabled or show no options.");
    }
    // --- End of Enhanced Logging ---

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (pageError && !isEditing && !authLoading) return <p style={styles.errorBox}>Error: {pageError}</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit User (ID: ${userId})` : 'Add New User'}</h2>
            {pageError && isEditing && <p style={styles.errorBox}>Error loading user data: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>{formError}</p>}
            
            {isEditing && isLoading && !pageError && <p style={styles.centeredMessage}>Loading user details...</p>}
            
            { !((isEditing && isLoading && !pageError) || (isEditing && pageError)) && (
                <form onSubmit={handleSubmit}>
                    {/* Username */}
                    <div style={styles.formGroup}>
                        <label htmlFor="username" style={styles.label}>Username: *</label>
                        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* First Name */}
                    <div style={styles.formGroup}>
                        <label htmlFor="firstName" style={styles.label}>First Name:</label>
                        <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Last Name */}
                    <div style={styles.formGroup}>
                        <label htmlFor="lastName" style={styles.label}>Last Name:</label>
                        <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Email */}
                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>Email: *</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Password */}
                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>{isEditing ? 'New Password (leave blank to keep current):' : 'Password: *'}</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Confirm Password */}
                    <div style={styles.formGroup}>
                        <label htmlFor="confirmPassword" style={styles.label}>{isEditing ? 'Confirm New Password:' : 'Confirm Password: *'}</label>
                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Role Dropdown */}
                    <div style={styles.formGroup}>
                        <label htmlFor="roleId" style={styles.label}>Role: *</label>
                        <select
                            id="roleId"
                            value={roleId} // This is the critical binding
                            onChange={(e) => {
                                console.log("Role selected via dropdown onChange:", e.target.value);
                                setRoleId(e.target.value);
                            }}
                            required
                            style={styles.select}
                            disabled={isLoading || authLoading || availableRoles.length === 0}
                        >
                            <option value="">-- Select Role --</option>
                            {availableRoles.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                        {availableRoles.length === 0 && !authLoading && <p style={styles.formSpecificErrorText}>No roles available to assign. Please check system configuration.</p>}
                    </div>
                    {/* Employee ID */}
                    <div style={styles.formGroup}>
                        <label htmlFor="employeeId" style={styles.label}>Employee ID:</label>
                        <input type="text" id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={styles.input} disabled={isLoading || authLoading} />
                    </div>
                    {/* Is Active Checkbox */}
                    <div style={styles.formGroup}>
                        <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isLoading || authLoading} style={{verticalAlign: 'middle'}} />
                        <label htmlFor="isActive" style={styles.checkboxLabel}>User is Active</label>
                    </div>

                    <div style={styles.buttonGroup}>
                        <button type="submit" disabled={isLoading || authLoading} style={styles.buttonPrimary}>
                            {isLoading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
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