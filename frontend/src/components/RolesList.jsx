import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/ListStyles";

function RolesList() {
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(''); // For delete success
    const { apiInstance, fetchRoles: fetchRolesFromContext } = useAuth(); // Renamed to avoid conflict
    const navigate = useNavigate();

    const fetchRolesList = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        // setSuccessMessage(''); // Clear previous success messages
        try {
            const response = await apiInstance.get('/roles');
            setRoles(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch roles.');
            console.error("Error fetching roles:", err.response?.data || err.message);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        fetchRolesList();
    }, [fetchRolesList]);

    const handleEdit = (roleId) => {
        navigate(`/dashboard/roles/edit/${roleId}`);
    };

    const handleDelete = async (roleId, roleName) => {
        if (window.confirm(`Are you sure you want to delete the role "${roleName}" (ID: ${roleId})? This action cannot be undone.`)) {
            setIsLoading(true); // Indicate loading state for delete operation
            setError(null);
            setSuccessMessage('');
            try {
                await apiInstance.delete(`/roles/${roleId}`);
                setSuccessMessage(`Role "${roleName}" (ID: ${roleId}) deleted successfully.`);
                // Refresh the list of roles
                fetchRolesList(); 
                // Also, refresh roles in context if other components depend on it immediately
                if (typeof fetchRolesFromContext === 'function') {
                    fetchRolesFromContext();
                }
            } catch (err) {
                const errMsg = err.response?.data?.message || `Failed to delete role "${roleName}".`;
                setError(errMsg);
                console.error(`Error deleting role ID ${roleId}:`, err.response?.data || err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (isLoading && roles.length === 0) return <p style={styles.centeredMessage}>Loading roles...</p>;
    // Keep error display prominent
    if (error && roles.length === 0) return <p style={{...styles.errorBox, textAlign: 'center'}}>{error}</p>;


    return (
        <div style={styles.container}>
            <div style={styles.titleContainer}>
                <h2 style={styles.title}>Manage Roles</h2>
                <Link to="/dashboard/roles/add" style={styles.addButton}>
                    Add New Role
                </Link>
            </div>

            {/* Display general error or success messages */}
            {error && <p style={{ ...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red', marginTop: '10px', marginBottom: '10px' }}>{error}</p>}
            {successMessage && <p style={{ ...styles.successBox, backgroundColor: '#e6fffa', borderColor: 'green', color: 'green', marginTop: '10px', marginBottom: '10px' }}>{successMessage}</p>}
            
            {isLoading && roles.length > 0 && <p style={styles.centeredMessage}>Updating roles list...</p>}


            {roles.length === 0 && !isLoading ? (
                <p style={styles.centeredMessage}>No roles found. Click "Add New Role" to create one.</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Display Name</th>
                            <th style={styles.th}>Machine Name</th>
                            <th style={styles.th}>Description</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(role => (
                            <tr key={role.id}>
                                <td style={styles.td}>{role.id}</td>
                                <td style={styles.td}>{role.display_name}</td>
                                <td style={styles.td}>{role.name}</td>
                                <td style={styles.td}>{role.description || '-'}</td>
                                <td style={styles.td}>
                                    <button
                                        onClick={() => handleEdit(role.id)}
                                        style={{...styles.actionButton, ...styles.editButton}}
                                        disabled={isLoading} // Disable buttons during any loading state
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(role.id, role.display_name)}
                                        style={{...styles.actionButton, ...styles.deleteButton}}
                                        disabled={isLoading} // Disable buttons during any loading state
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
}

export default RolesList;