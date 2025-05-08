import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import useParams
import { useAuth } from "../context/AuthContext";
import styles from "../styles/FormStyles";

function RoleForm() {
    const { roleId } = useParams(); // Get roleId from URL if present
    const isEditMode = Boolean(roleId);

    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false); // For loading existing role details

    const navigate = useNavigate();
    const { apiInstance, fetchRoles } = useAuth();

    // Fetch role details if in edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchRoleDetails = async () => {
                setIsFetchingDetails(true);
                setError(null);
                try {
                    // THIS IS THE API CALL THAT'S LIKELY FAILING
                    const response = await apiInstance.get(`/roles/${roleId}`); 
                    const roleData = response.data;
                    setName(roleData.name);
                    setDisplayName(roleData.display_name);
                    setDescription(roleData.description || '');
                } catch (err) {
                    // THIS IS WHERE YOUR ERROR MESSAGE IS BEING SET
                    setError(err.response?.data?.message || `Failed to fetch details for role ID ${roleId}.`);
                    console.error("Error fetching role details:", err);
                } finally {
                    setIsFetchingDetails(false);
                }
            };
            fetchRoleDetails();
        }
    }, [roleId, apiInstance, isEditMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');

        if (!name.trim() || !displayName.trim()) {
            setError("Machine Name and Display Name are required.");
            setIsLoading(false);
            return;
        }
        if (!/^[a-z0-9_]+$/.test(name)) {
            setError("Machine Name can only contain lowercase letters, numbers, and underscores.");
            setIsLoading(false);
            return;
        }

        const roleDataPayload = {
            name: name.toLowerCase(),
            display_name: displayName,
            description: description,
        };

        try {
            let response;
            if (isEditMode) {
                response = await apiInstance.put(`/roles/${roleId}`, roleDataPayload);
                setSuccessMessage(`Role "${response.data.display_name}" updated successfully!`);
            } else {
                response = await apiInstance.post('/roles', roleDataPayload);
                setSuccessMessage(`Role "${response.data.display_name}" created successfully!`);
                // Clear form only on successful creation
                setName('');
                setDisplayName('');
                setDescription('');
            }

            if (typeof fetchRoles === 'function') {
                await fetchRoles();
            } else {
                console.warn("RoleForm: fetchRoles function not found in AuthContext. Roles list might not be up-to-date globally.");
            }
            
            // Optional: navigate back to roles list after a short delay
            setTimeout(() => navigate('/dashboard/roles'), 1500);

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || `Failed to ${isEditMode ? 'update' : 'create'} role.`;
            setError(errorMessage);
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} role:`, err.response?.data || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isEditMode && isFetchingDetails) {
        return <p style={styles.centeredMessage}>Loading role details...</p>;
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditMode ? 'Edit Role' : 'Add New Role'}</h2>
            {error && <p style={{ ...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red' }}>{error}</p>}
            {successMessage && <p style={{ ...styles.successBox, backgroundColor: '#e6fffa', borderColor: 'green', color: 'green' }}>{successMessage}</p>}

            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="name" style={styles.label}>Machine Name: *</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading || isFetchingDetails}
                        placeholder="e.g., inventory_manager"
                    />
                    <small style={styles.helpText}>Lowercase letters, numbers, and underscores only.</small>
                </div>

                <div style={styles.formGroup}>
                    <label htmlFor="displayName" style={styles.label}>Display Name: *</label>
                    <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading || isFetchingDetails}
                        placeholder="e.g., Inventory Manager"
                    />
                </div>

                <div style={styles.formGroup}>
                    <label htmlFor="description" style={styles.label}>Description:</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={styles.textarea}
                        disabled={isLoading || isFetchingDetails}
                        rows="3"
                        placeholder="Optional: A brief description of the role's purpose."
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading || isFetchingDetails} style={styles.buttonPrimary}>
                        {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Role' : 'Create Role')}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} style={styles.buttonSecondary} disabled={isLoading || isFetchingDetails}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RoleForm;