import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../context/AuthContext';

// --- Define styles object BEFORE the component ---
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' },
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'block', textAlign: 'right', marginBottom: '15px' },
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

const UserList = () => {
    const { apiInstance, isAuthenticated, isLoading: authLoading, user, ROLES_OPTIONS } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // For receiving feedback from form

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Renamed from loading
    const [pageError, setPageError] = useState(null); // Renamed from error
    const [feedback, setFeedback] = useState({ message: null, type: null });

    // Effect to display feedback from navigation state
    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear state after showing
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const getRoleLabel = useCallback((roleValue) => {
        if (!ROLES_OPTIONS) return roleValue; // Fallback if ROLES_OPTIONS not loaded
        const roleOption = ROLES_OPTIONS.find(option => option.value === roleValue);
        return roleOption ? roleOption.label : roleValue;
    }, [ROLES_OPTIONS]);

    const fetchUsers = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            console.warn("[UserList fetchUsers] Prerequisites not met. Aborting fetch.");
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        console.log("[UserList fetchUsers] Attempting to fetch users...");
        setIsLoading(true); // Ensure loading is true for this specific fetch
        setPageError(null);

        try {
            const response = await apiInstance.get('/users');
            console.log("[UserList fetchUsers] API response received:", response);
            if (response && Array.isArray(response.data)) {
                setUsers(response.data.map(u => ({...u, role_label: getRoleLabel(u.role)}))); // Add role_label
                console.log(`[UserList fetchUsers] ${response.data.length} users set.`);
            } else {
                console.warn("[UserList fetchUsers] Fetched users data is not an array or response is invalid:", response?.data);
                setUsers([]);
                setPageError("Received invalid data format for users.");
            }
        } catch (err) {
            console.error("[UserList fetchUsers] Failed to fetch users:", err);
            const errorMsg = err.response?.data?.message || err.message || 'An unexpected error occurred.';
            setPageError(errorMsg);
        } finally {
            console.log("[UserList fetchUsers] finally block. Setting loading to false.");
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated, getRoleLabel]);

    useEffect(() => {
        console.log(
            "[UserList useEffect] AuthLoading:", authLoading,
            "IsAuthenticated:", isAuthenticated,
            "API Instance:", !!apiInstance,
            "Current User:", user?.username
        );
        if (authLoading) {
            console.log("[UserList useEffect] Still authenticating...");
            // setIsLoading(true); // Keep loading true while auth is pending
            return;
        }
        if (!isAuthenticated) {
            console.log("[UserList useEffect] Not authenticated.");
            setPageError("Please log in to view users.");
            setUsers([]);
            setIsLoading(false);
            return;
        }
        if (!apiInstance) {
            console.log("[UserList useEffect] API instance not available.");
            setPageError("API client is not available.");
            setUsers([]);
            setIsLoading(false);
            return;
        }
        console.log("[UserList useEffect] Prerequisites met. Calling fetchUsers.");
        fetchUsers();
    }, [authLoading, isAuthenticated, apiInstance, fetchUsers, user]);

    const handleDelete = async (userIdToDelete, username) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        // Prevent current user from deleting themselves
        if (user && user.user_id === userIdToDelete) {
             setFeedback({ message: "You cannot delete your own account.", type: 'error' });
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
             return;
        }

        if (!window.confirm(`Are you sure you want to delete user: "${username}" (ID: ${userIdToDelete})?`)) {
            return;
        }
        setPageError(null); // Clear previous page errors
        try {
            await apiInstance.delete(`/users/${userIdToDelete}`);
            setFeedback({ message: `User "${username}" deleted successfully.`, type: 'success' });
            setUsers(prev => prev.filter(u => u.user_id !== userIdToDelete));
        } catch (err) {
            console.error(`[UserList] Error deleting user ${userIdToDelete}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete user.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            // No explicit return cleanup needed here as it's a one-off
        }
    };


    if (isLoading) {
        console.log("[UserList Render] Rendering 'Loading users...'");
        return <div style={styles.centeredMessage}>Loading users...</div>;
    }

    if (pageError && users.length === 0) {
        console.log("[UserList Render] Rendering error message:", pageError);
        return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;
    }
    
    console.log("[UserList Render] Rendering user list or 'no users'. Users:", users.length, "Error:", pageError);
    return (
        <div style={styles.container}>
            <h2 style={styles.title}>User Management</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}

            {pageError && users.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: {pageError} (Displaying previously loaded data)
                 </p>
            )}
            {/* Ensure path matches App.jsx, e.g., /dashboard/users/new */}
            <Link to="/dashboard/users/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New User</button>
            </Link>

            {users.length === 0 && !pageError ? (
                <p style={styles.centeredMessage}>No users found. Click "Add New User" to create one.</p>
            ) : users.length > 0 ? (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Username</th>
                            <th style={styles.tableCell}>Full Name</th>
                            <th style={styles.tableCell}>Email</th>
                            <th style={styles.tableCell}>Role</th>
                            <th style={styles.tableCell}>Store</th>
                            <th style={styles.tableCell}>Active</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((userItem, index) => (
                            <tr key={userItem.user_id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{userItem.user_id}</td>
                                <td style={styles.tableCell}>{userItem.username}</td>
                                <td style={styles.tableCell}>
                                    {`${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() || '-'}
                                </td>
                                <td style={styles.tableCell}>{userItem.email || '-'}</td>
                                <td style={styles.tableCell}>{userItem.role_label || userItem.role || 'N/A'}</td>
                                <td style={styles.tableCell}>{userItem.store_name || (userItem.store_id ? `ID: ${userItem.store_id}`: '-')}</td>
                                <td style={styles.tableCell}>{userItem.is_active ? 'Yes' : 'No'}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    {/* Ensure path matches App.jsx, e.g., /dashboard/users/edit/:id */}
                                    <button
                                        onClick={() => navigate(`/dashboard/users/edit/${userItem.user_id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit User"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(userItem.user_id, userItem.username)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete User"
                                        disabled={user && user.user_id === userItem.user_id} // Disable delete for self
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : null }
        </div>
    );
};

export default UserList;