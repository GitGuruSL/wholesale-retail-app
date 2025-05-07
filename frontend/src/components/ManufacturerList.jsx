import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Ensure Link and useNavigate are imported
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Assuming you use apiInstance directly or via useAuth

// Make sure this function is named ManufacturerList
function ManufacturerList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth(); // Or however you get apiInstance

    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    // Callback to fetch manufacturers
    const fetchManufacturers = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setError("User not authenticated or API not available.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await apiInstance.get('/manufacturers');
            setManufacturers(response.data || []);
            console.log("[ManufacturerList] Manufacturers fetched:", response.data);
        } catch (err) {
            console.error("[ManufacturerList] Error fetching manufacturers:", err);
            setError(err.response?.data?.message || "Failed to load manufacturers.");
            setManufacturers([]); // Clear data on error
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, apiInstance]); // Dependencies for useCallback

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            // Clear the location state to prevent message from re-appearing on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchManufacturers();
        } else if (!authLoading && !isAuthenticated) {
            setError("Please log in to view manufacturers.");
            setLoading(false);
        }
    }, [isAuthenticated, authLoading, fetchManufacturers]);


    const handleDelete = async (id, name) => {
        if (!apiInstance) {
            setFeedback({ message: "API service not available.", type: 'error' });
            return;
        }
        if (window.confirm(`Are you sure you want to delete manufacturer "${name}" (ID: ${id})?`)) {
            try {
                await apiInstance.delete(`/manufacturers/${id}`);
                setFeedback({ message: `Manufacturer "${name}" deleted successfully.`, type: 'success' });
                fetchManufacturers(); // Refresh the list
            } catch (err) {
                console.error("[ManufacturerList] Error deleting manufacturer:", err);
                setFeedback({ message: err.response?.data?.message || "Failed to delete manufacturer.", type: 'error' });
            }
        }
    };

    if (authLoading || loading) {
        return <p style={styles.centeredMessage}>Loading manufacturers...</p>;
    }

    // Render error state if error exists and feedback message is not set (to avoid duplicate error display)
    if (error && !feedback.message) {
        return <p style={{ ...styles.errorText, textAlign: 'center' }}>Error: {error}</p>;
    }


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Manufacturers</h2>
            {feedback.message && (
                <div style={{
                    ...styles.feedbackBox,
                    ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {/* Corrected Link path */}
            <Link to="/dashboard/manufacturers/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Manufacturer</button>
            </Link>

            {manufacturers.length === 0 && !loading && !error ? (
                <p style={styles.centeredMessage}>No manufacturers found. Click "Add New Manufacturer" to create one.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Contact Person</th>
                            <th style={styles.tableCell}>Email</th>
                            <th style={styles.tableCell}>Telephone</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manufacturers.map((manufacturer, index) => (
                            <tr key={manufacturer.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{manufacturer.id}</td>
                                <td style={styles.tableCell}>{manufacturer.name}</td>
                                <td style={styles.tableCell}>{manufacturer.contact_person || 'N/A'}</td>
                                <td style={styles.tableCell}>{manufacturer.email || 'N/A'}</td>
                                <td style={styles.tableCell}>{manufacturer.telephone || 'N/A'}</td>
                                <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                                    {/* Corrected navigate path */}
                                    <button
                                        onClick={() => navigate(`/dashboard/manufacturers/edit/${manufacturer.id}`)}
                                        style={{ ...styles.button, ...styles.buttonEdit }}
                                        title="Edit Manufacturer"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
                                        style={{ ...styles.button, ...styles.buttonDelete }}
                                        title="Delete Manufacturer"
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

const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' },
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
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6', wordBreak: 'break-word', fontSize: '0.9em' },
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

// Ensure this is ManufacturerList
export default ManufacturerList;