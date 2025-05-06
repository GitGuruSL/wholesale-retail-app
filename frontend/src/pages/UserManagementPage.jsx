import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Define roles available for selection in the form
const ROLES_OPTIONS = [
    { value: 'store_admin', label: 'Store Admin' },
    { value: 'sales_person', label: 'Sales Person' },
    // Add other assignable roles here if needed
];

function UserManagementPage() {
    // --- State Variables ---
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { api } = useAuth();

    // State for the "Add User" form
    const [newUserUsername, setNewUserUsername] = useState(''); // Changed from newUserName
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState(ROLES_OPTIONS[0]?.value || '');
    const [newUserEmployeeId, setNewUserEmployeeId] = useState(''); // Added
    const [addUserError, setAddUserError] = useState('');

    // State for reset password
    const [resetPasswordError, setResetPasswordError] = useState('');
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');

    // State for Editing User
    const [isEditing, setIsEditing] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editUserUsername, setEditUserUsername] = useState(''); // Changed
    const [editUserRole, setEditUserRole] = useState('');
    const [editUserEmployeeId, setEditUserEmployeeId] = useState(''); // Added
    const [editUserError, setEditUserError] = useState('');
    const [editUserSuccess, setEditUserSuccess] = useState('');
    const [allStores, setAllStores] = useState([]);
    const [assignedStoreIds, setAssignedStoreIds] = useState(new Set());
    const [isLoadingStores, setIsLoadingStores] = useState(false);

    // --- API Call Functions ---
    const fetchUsers = useCallback(async () => {
        console.log("UserManagementPage: fetchUsers called");
        setIsLoading(true);
        setError(null);
        setAddUserError('');
        setResetPasswordError('');
        setResetPasswordSuccess('');
        try {
            const response = await api.get('/users');
            console.log("UserManagementPage: Users fetched", response.data);
            setUsers(response.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.response?.data?.message || 'Failed to fetch users. Please check permissions or network.');
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    // --- Event Handlers ---
    const handleAddUserSubmit = async (event) => {
        event.preventDefault();
        setAddUserError('');
        setError(null);
        setResetPasswordError('');
        setResetPasswordSuccess('');

        if (!newUserUsername || !newUserPassword || !newUserRole) { // Check newUserUsername
            setAddUserError('Username, password, and role are required.');
            return;
        }
        if (newUserPassword.length < 6) {
            setAddUserError('Password must be at least 6 characters long.');
            return;
        }
        // Basic validation for employee_id if provided
        if (newUserEmployeeId && isNaN(parseInt(newUserEmployeeId, 10))) {
            setAddUserError('Employee ID must be a number if provided.');
            return;
        }

        try {
            const newUserPayload = {
                username: newUserUsername, // Changed
                password: newUserPassword,
                role: newUserRole,
                employee_id: newUserEmployeeId ? parseInt(newUserEmployeeId, 10) : null, // Added
            };
            const response = await api.post('/users', newUserPayload);
            console.log("User added:", response.data);

            setUsers(prevUsers => [...prevUsers, response.data]);

            setNewUserUsername(''); // Changed
            setNewUserPassword('');
            setNewUserRole(ROLES_OPTIONS[0]?.value || '');
            setNewUserEmployeeId(''); // Added
            setAddUserError('');

        } catch (err) {
            console.error("Error adding user:", err);
            setAddUserError(err.response?.data?.message || 'Failed to add user. Please try again.');
        }
    };

    const handleDeleteUser = async (userIdToDelete) => { // Renamed parameter for clarity
        setError(null);
        setAddUserError('');
        setResetPasswordError('');
        setResetPasswordSuccess('');

        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/users/${userIdToDelete}`);
            console.log(`User deleted: ID ${userIdToDelete}`);
            setUsers(prevUsers => prevUsers.filter(user => user.user_id !== userIdToDelete)); // Use user_id
        } catch (err) {
            console.error(`Error deleting user ${userIdToDelete}:`, err);
            setError(err.response?.data?.message || `Failed to delete user ${userIdToDelete}.`);
        }
    };

    const handleResetPassword = async (userIdToReset) => { // Renamed parameter
        setError(null);
        setAddUserError('');
        setResetPasswordError('');
        setResetPasswordSuccess('');

        const newPassword = prompt("Enter a new temporary password for the user (min 6 characters):");

        if (!newPassword) {
            setResetPasswordError("Password reset cancelled.");
            return;
        }
        if (newPassword.length < 6) {
            setResetPasswordError("Password must be at least 6 characters long.");
            return;
        }

        try {
            const response = await api.put(`/users/${userIdToReset}/reset-password`, { newPassword });
            console.log(`Password reset for user ID: ${userIdToReset}`);
            setResetPasswordSuccess(response.data?.message || `Password for user ID ${userIdToReset} reset successfully.`);
        } catch (err) {
            console.error(`Error resetting password for user ${userIdToReset}:`, err);
            setResetPasswordError(err.response?.data?.message || `Failed to reset password for user ${userIdToReset}.`);
        }
    };

    const handleOpenEditModal = async (userToEdit) => { // Renamed parameter
        setEditingUser(userToEdit);
        setEditUserUsername(userToEdit.username); // Use username
        setEditUserRole(userToEdit.role);
        setEditUserEmployeeId(userToEdit.employee_id || ''); // Use employee_id
        setIsEditing(true);
        setEditUserError('');
        setEditUserSuccess('');
        setError(null);
        setResetPasswordError('');
        setResetPasswordSuccess('');
        setAddUserError('');
        setIsLoadingStores(true);
        setAssignedStoreIds(new Set());

        try {
            const storesResponse = await api.get('/stores');
            setAllStores(storesResponse.data || []);
            // Backend returns user_id for the user object
            const assignedResponse = await api.get(`/users/${userToEdit.user_id}/stores`);
            setAssignedStoreIds(new Set(assignedResponse.data || []));
        } catch (err) {
            console.error("Error fetching store data for edit modal:", err);
            setEditUserError("Failed to load store assignment data. Please try again.");
        } finally {
            setIsLoadingStores(false);
        }
    };

    const handleCloseEditModal = () => {
        setIsEditing(false);
        setEditingUser(null);
        setEditUserError('');
        setEditUserSuccess('');
        setAllStores([]);
        setAssignedStoreIds(new Set());
    };

    const handleStoreCheckboxChange = (storeId) => {
        setAssignedStoreIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(storeId)) {
                newSet.delete(storeId);
            } else {
                newSet.add(storeId);
            }
            return newSet;
        });
    };

    const handleEditUserSubmit = async (event) => {
        event.preventDefault();
        setEditUserError('');
        setEditUserSuccess('');

        if (!editingUser) {
            setEditUserError("No user selected for editing.");
            return;
        }
        if (!editUserUsername || !editUserRole) { // Check editUserUsername
            setEditUserError("Username and Role cannot be empty.");
            return;
        }
        if (editUserEmployeeId && isNaN(parseInt(editUserEmployeeId, 10))) {
            setEditUserError('Employee ID must be a number if provided.');
            return;
        }

        const storeIdsToAssign = Array.from(assignedStoreIds);

        try {
            await Promise.all([
                api.put(`/users/${editingUser.user_id}`, { // Use user_id
                    username: editUserUsername, // Changed
                    role: editUserRole,
                    employee_id: editUserEmployeeId ? parseInt(editUserEmployeeId, 10) : null, // Added
                }),
                api.put(`/users/${editingUser.user_id}/stores`, { // Use user_id
                    storeIds: storeIdsToAssign
                })
            ]);

            console.log(`User ${editingUser.user_id} details and store assignments updated.`);
            // Fetch the updated user data to reflect changes immediately in the table
            const updatedUserResponse = await api.get(`/users/${editingUser.user_id}`); // Use user_id

            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.user_id === editingUser.user_id ? updatedUserResponse.data : user // Use user_id
                )
            );

            setEditUserSuccess("User updated successfully!");
            setTimeout(() => {
                handleCloseEditModal();
            }, 1500);

        } catch (err) {
            console.error(`Error updating user ${editingUser.user_id}:`, err);
            const detailError = err.response?.data?.message || 'Failed to update user.';
            const assignmentError = err.response?.config?.url?.includes('/stores') ? ' (Store assignment failed)' : '';
            setEditUserError(`${detailError}${assignmentError}`);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const styles = { /* ... your existing styles ... */ 
        page: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' },
        section: { marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
        sectionTitle: { marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '20px', color: '#333', fontSize: '1.4em' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
        th: { border: '1px solid #ddd', padding: '10px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', fontWeight: 'bold', whiteSpace: 'nowrap' },
        td: { border: '1px solid #ddd', padding: '10px 12px', verticalAlign: 'middle' },
        formGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' },
        input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '400px' },
        select: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '400px', height: '40px' /* Align height with input */ },
        button: {
            padding: '8px 15px', // Slightly smaller padding
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            marginRight: '8px',
            transition: 'background-color 0.2s ease, transform 0.1s ease',
            lineHeight: '1.5', // Ensure text vertical alignment
            display: 'inline-flex', // Align icon/text if needed later
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '80px', // Minimum width for consistency
            textAlign: 'center',
        },
        addButton: { backgroundColor: '#28a745', color: 'white', ':hover': { backgroundColor: '#218838' } },
        deleteButton: { backgroundColor: '#dc3545', color: 'white', ':hover': { backgroundColor: '#c82333' } },
        resetButton: { backgroundColor: '#ffc107', color: '#212529', ':hover': { backgroundColor: '#e0a800' } },
        actionButtons: { display: 'flex', gap: '5px', flexWrap: 'wrap' }, // Allow wrapping on small screens
        error: { color: '#dc3545', marginTop: '10px', fontSize: '14px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '8px', borderRadius: '4px' },
        success: { color: '#155724', marginTop: '10px', fontSize: '14px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', padding: '8px', borderRadius: '4px' },
        loading: { textAlign: 'center', padding: '20px', color: '#555', fontSize: '1.1em' },
        editButton: { backgroundColor: '#007bff', color: 'white', ':hover': { backgroundColor: '#0056b3' } }, // Style for Edit button
        // Styles for Modal (basic example)
        modalOverlay: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        },
        modalContent: {
            backgroundColor: 'white', padding: '30px', borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)', minWidth: '400px', maxWidth: '90%',
        },
        modalActions: { marginTop: '20px', textAlign: 'right' },
        // Add styles for checkbox layout if desired
        checkboxGroup: {
            maxHeight: '150px', // Limit height and make scrollable
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: '#fff',
        },
        checkboxItem: {
            display: 'block', // Each checkbox on its own line
            marginBottom: '5px',
        },
        checkboxLabel: {
            marginLeft: '8px',
            cursor: 'pointer',
        },
    };


    return (
        <div style={styles.page}>
            <h1>User Management</h1>

            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Add New User</h2>
                <form onSubmit={handleAddUserSubmit}>
                    <div style={styles.formGroup}>
                        <label htmlFor="newUserUsername" style={styles.label}>Username:</label> {/* Changed */}
                        <input
                            type="text"
                            id="newUserUsername" // Changed
                            value={newUserUsername} // Changed
                            onChange={(e) => setNewUserUsername(e.target.value)} // Changed
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.formGroup}> {/* Added Employee ID field */}
                        <label htmlFor="newUserEmployeeId" style={styles.label}>Employee ID (Optional):</label>
                        <input
                            type="number" // Or text, backend will parse
                            id="newUserEmployeeId"
                            value={newUserEmployeeId}
                            onChange={(e) => setNewUserEmployeeId(e.target.value)}
                            style={styles.input}
                            placeholder="Enter numeric Employee ID"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newUserPassword" style={styles.label}>Password:</label>
                        <input
                            type="password"
                            id="newUserPassword"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            style={styles.input}
                            required
                            minLength="6"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newUserRole" style={styles.label}>Role:</label>
                        <select
                            id="newUserRole"
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            style={styles.select}
                            required
                        >
                            {ROLES_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {addUserError && <p style={styles.error}>{addUserError}</p>}
                    <button type="submit" style={{ ...styles.button, ...styles.addButton }}>
                        Add User
                    </button>
                </form>
            </section>

            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Existing Users</h2>
                {isLoading && <p style={styles.loading}>Loading users...</p>}
                {error && <p style={styles.error}>{error}</p>}
                {resetPasswordError && <p style={styles.error}>{resetPasswordError}</p>}
                {resetPasswordSuccess && <p style={styles.success}>{resetPasswordSuccess}</p>}

                {!isLoading && !error && (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>User ID</th> {/* Changed */}
                                <th style={styles.th}>Username</th> {/* Changed */}
                                <th style={styles.th}>First Name</th> {/* Added */}
                                <th style={styles.th}>Last Name</th> {/* Added */}
                                <th style={styles.th}>Employee Email</th> {/* Changed */}
                                <th style={styles.th}>Role</th>
                                <th style={styles.th}>Created At</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.user_id}> {/* Use user_id */}
                                        <td style={styles.td}>{user.user_id}</td> {/* Use user_id */}
                                        <td style={styles.td}>{user.username}</td> {/* Use username */}
                                        <td style={styles.td}>{user.first_name || 'N/A'}</td> {/* Display first_name */}
                                        <td style={styles.td}>{user.last_name || 'N/A'}</td> {/* Display last_name */}
                                        <td style={styles.td}>{user.employee_email || 'N/A'}</td> {/* Use employee_email */}
                                        <td style={styles.td}>{user.role}</td>
                                        <td style={styles.td}>{new Date(user.created_at).toLocaleString()}</td>
                                        <td style={styles.td}>
                                            <div style={styles.actionButtons}>
                                                <button
                                                    style={{ ...styles.button, ...styles.editButton }}
                                                    onClick={() => handleOpenEditModal(user)}
                                                    title="Edit User Details"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    style={{ ...styles.button, ...styles.resetButton }}
                                                    onClick={() => handleResetPassword(user.user_id)} // Use user_id
                                                    title="Reset User Password"
                                                >
                                                    Reset PW
                                                </button>
                                                <button
                                                    style={{ ...styles.button, ...styles.deleteButton }}
                                                    onClick={() => handleDeleteUser(user.user_id)} // Use user_id
                                                    title="Delete User"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ ...styles.td, textAlign: 'center' }}> {/* Adjusted colSpan */}
                                        No users found. Add a user using the form above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </section>

            {isEditing && editingUser && (
                <div style={styles.modalOverlay} onClick={handleCloseEditModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.sectionTitle}>Edit User: {editingUser.username}</h2> {/* Use username */}
                        <form onSubmit={handleEditUserSubmit}>
                            <div style={styles.formGroup}>
                                <label htmlFor="editUserUsername" style={styles.label}>Username:</label> {/* Changed */}
                                <input
                                    type="text"
                                    id="editUserUsername" // Changed
                                    value={editUserUsername} // Changed
                                    onChange={(e) => setEditUserUsername(e.target.value)} // Changed
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}> {/* Added Employee ID field */}
                                <label htmlFor="editUserEmployeeId" style={styles.label}>Employee ID (Optional):</label>
                                <input
                                    type="number" // Or text
                                    id="editUserEmployeeId"
                                    value={editUserEmployeeId}
                                    onChange={(e) => setEditUserEmployeeId(e.target.value)}
                                    style={styles.input}
                                    placeholder="Enter numeric Employee ID"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="editUserRole" style={styles.label}>Role:</label>
                                <select
                                    id="editUserRole"
                                    value={editUserRole}
                                    onChange={(e) => setEditUserRole(e.target.value)}
                                    style={styles.select}
                                    required
                                >
                                    {ROLES_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Assign Stores:</label>
                                {isLoadingStores ? (
                                    <p>Loading stores...</p>
                                ) : allStores.length > 0 ? (
                                    <div style={styles.checkboxGroup}>
                                        {allStores.map(store => (
                                            <div key={store.id} style={styles.checkboxItem}>
                                                <input
                                                    type="checkbox"
                                                    id={`store-${store.id}`}
                                                    checked={assignedStoreIds.has(store.id)}
                                                    onChange={() => handleStoreCheckboxChange(store.id)}
                                                />
                                                <label htmlFor={`store-${store.id}`} style={styles.checkboxLabel}>
                                                    {store.name} (ID: {store.id})
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p>No stores available to assign.</p>
                                )}
                            </div>

                            {editUserError && <p style={styles.error}>{editUserError}</p>}
                            {editUserSuccess && <p style={styles.success}>{editUserSuccess}</p>}
                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    style={{ ...styles.button, backgroundColor: '#6c757d', color: 'white' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ ...styles.button, ...styles.addButton }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagementPage;