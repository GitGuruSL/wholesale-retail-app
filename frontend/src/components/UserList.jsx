import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrashAlt, FaPlus, FaEye } from 'react-icons/fa';
import styles from '../styles/ListStyles';

const UserList = () => {
    const { apiInstance, isAuthenticated, isLoading: authLoading, user: loggedInUser, userCan } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchUsers = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/users');
            if (response && Array.isArray(response.data)) {
                setUsers(response.data.map(u => ({
                    ...u,
                    role_label: u.role_display_name || u.role_name || 'N/A',
                    current_store_display: u.current_store_name || (u.current_store_id ? `Store ID: ${u.current_store_id}` : 'Not Assigned')
                })));
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error("[UserList] Error fetching users:", err);
            setPageError(err.response?.data?.message || "Failed to fetch users.");
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchUsers();
        } else if (!authLoading && !isAuthenticated) {
            setPageError("Please log in to view users.");
        }
    }, [authLoading, isAuthenticated, fetchUsers]);

    const handleDeleteUser = async (userIdToDelete, username) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}" (ID: ${userIdToDelete})? This action cannot be undone.`)) {
            return;
        }
        setIsLoading(true);
        try {
            await apiInstance.delete(`/users/${userIdToDelete}`);
            setSuccessMessage(`User "${username}" deleted successfully.`);
            setUsers(prevUsers => prevUsers.filter(u => u.user_id !== userIdToDelete));
        } catch (err) {
            console.error("Error deleting user:", err);
            setPageError(err.response?.data?.message || "Failed to delete user.");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && users.length === 0) return <p style={styles.centeredMessage}>Loading users...</p>;
    if (pageError) return <p style={styles.errorBox}>{pageError}</p>;

    // For now, force showing the edit button by default.
    const canCreateUser = (typeof userCan === 'function' ? userCan('user:create') : true);
    const canDeleteUser = (typeof userCan === 'function' ? userCan('user:delete') : true);
    const canViewUser   = (typeof userCan === 'function' ? userCan('user:read_self') : true);

    return (
        <div style={styles.container}>
            <div style={styles.titleContainer}>
                <h1 style={styles.title}>User Management</h1>
                {canCreateUser && (
                    <Link to="/dashboard/users/new" style={styles.addButton}>
                        <FaPlus /> Add New User
                    </Link>
                )}
            </div>
            {successMessage && <p style={styles.successMessage}>{successMessage}</p>}
            {users.length === 0 && !isLoading ? (
                <p style={styles.noUsersText}>No users found.</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeadCell}>ID</th>
                            <th style={styles.tableHeadCell}>Username</th>
                            <th style={styles.tableHeadCell}>Full Name</th>
                            <th style={styles.tableHeadCell}>Email</th>
                            <th style={styles.tableHeadCell}>Role</th>
                            <th style={styles.tableHeadCell}>Current Store</th>
                            <th style={styles.tableHeadCell}>Active</th>
                            <th style={styles.tableHeadCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(userItem => (
                            <tr key={userItem.user_id}>
                                <td style={styles.tableCell}>{userItem.user_id}</td>
                                <td style={styles.tableCell}>{userItem.username}</td>
                                <td style={styles.tableCell}>
                                    {`${userItem.user_first_name || userItem.first_name || ''} ${userItem.user_last_name || userItem.last_name || ''}`.trim() || '-'}
                                </td>
                                <td style={styles.tableCell}>{userItem.user_email || userItem.email || '-'}</td>
                                <td style={styles.tableCell}>{userItem.role_label}</td>
                                <td style={styles.tableCell}>{userItem.current_store_display}</td>
                                <td style={styles.tableCell}>{userItem.is_active ? 'Yes' : 'No'}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    {canViewUser && (
                                        <Link 
                                            to={`/dashboard/users/view/${userItem.user_id}`} 
                                            style={{...styles.actionButton, ...styles.viewButton}}
                                        >
                                            View
                                        </Link>
                                    )}
                                    {/* Always show the Edit button */}
                                    <Link 
                                        to={`/dashboard/users/edit/${userItem.user_id}`} 
                                        style={{...styles.actionButton, ...styles.editButton}}
                                    >
                                        <FaEdit /> Edit
                                    </Link>
                                    {canDeleteUser && loggedInUser?.id !== userItem.user_id && (
                                        <button 
                                            onClick={() => handleDeleteUser(userItem.user_id, userItem.username)}
                                            style={{...styles.actionButton, ...styles.deleteButton}}
                                            disabled={isLoading}
                                        >
                                            <FaTrashAlt /> Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserList;