import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserList = () => {
    const { api } = useAuth(); // ROLES_OPTIONS could be fetched here if needed for display mapping
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        // Do not clear feedback here, so it persists across re-fetches if an action caused it
        try {
            const response = await api.get('/users');
            setUsers(response.data || []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch users.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch users. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        if (api) {
            fetchUsers();
        } else {
            setError("API client not available. Cannot fetch users.");
            setLoading(false);
        }
    }, [api, fetchUsers]);

    const handleDelete = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to delete user: "${username}" (ID: ${userId})?`)) {
            return;
        }
        setError(null); // Clear general error before attempting delete
        setFeedback({ message: null, type: null }); // Clear previous feedback
        try {
            await api.delete(`/users/${userId}`);
            setFeedback({ message: `User "${username}" deleted successfully.`, type: 'success' });
            // Refetch users to get the updated list from the server
            // Or, for optimistic update: setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
            fetchUsers(); 
        } catch (err) {
            console.error(`Error deleting user ${userId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete user.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete user. Please log in again.', type: 'error' });
            } else {
                 setFeedback({ message: errorMsg, type: 'error' });
            }
        } finally {
            // Feedback will be cleared by next action or fetch, or a timeout if preferred
            // setTimeout(() => setFeedback({ message: null, type: null }), 5000); // Optional: auto-clear feedback
        }
    };


    if (loading && users.length === 0) return <div style={styles.centeredMessage}>Loading users...</div>;
    if (error && users.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

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
            {/* Display general error if it occurred during fetch and there's no specific feedback */}
            {error && !feedback.message && users.length > 0 && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: {error}
                 </p>
            )}

            <Link to="/users/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New User</button>
            </Link>

            {users.length === 0 && !loading && !error ? (
                <p style={styles.centeredMessage}>No users found. Click "Add New User" to create one.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Username</th>
                            <th style={styles.tableCell}>Email</th>
                            <th style={styles.tableCell}>Role</th>
                            <th style={styles.tableCell}>Store</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr key={user.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{user.id}</td>
                                <td style={styles.tableCell}>{user.username}</td>
                                <td style={styles.tableCell}>{user.email || '-'}</td>
                                <td style={styles.tableCell}>{user.role_display_name || user.role}</td>
                                <td style={styles.tableCell}>{user.store_name || (user.store_id ? `Store ID: ${user.store_id}`: '-')}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/users/edit/${user.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit User"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id, user.username)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete User"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// Consistent List Styles
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'inline-block', marginBottom: '15px' },
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default UserList;