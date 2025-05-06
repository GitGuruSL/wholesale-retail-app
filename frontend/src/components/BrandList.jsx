import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BrandList() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null }); // Clear previous feedback
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const response = await axios.get(`${API_BASE_URL}/brands`, config);
            setBrands(response.data);
        } catch (err) {
            console.error("Error fetching brands:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch brands.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch brands. Please log in again.');
                // navigate('/login'); // Optionally redirect
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]); // Added navigate to dependency array if used for redirection

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    const handleDelete = async (brandId, brandName) => {
        if (!window.confirm(`Are you sure you want to delete brand: "${brandName}" (ID: ${brandId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setError(null); // Clear previous general errors
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFeedback({ message: 'Authentication token not found. Please log in.', type: 'error' });
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            await axios.delete(`${API_BASE_URL}/brands/${brandId}`, config);
            setFeedback({ message: `Brand "${brandName}" deleted successfully.`, type: 'success' });
            setBrands(prevBrands => prevBrands.filter(br => br.id !== brandId));
        } catch (err) {
            console.error(`Error deleting brand ${brandId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete brand. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
            // setError(errorMsg); // Also set general error if you want it displayed outside feedback
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading brands...</div>;
    // Show error prominently if list is empty and an error occurred
    if (error && brands.length === 0) {
        return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Brands</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {/* Display general error if list is populated but an error occurred (e.g. during delete that wasn't a feedback message) */}
            {error && brands.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>An error occurred: {error}</p>
            )}

            <Link to="/brands/new" style={styles.addButtonLink}>
                <button style={styles.button}>Add New Brand</button>
            </Link>

            {brands.length === 0 && !loading && !error ? (
                <p>No brands found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            {/* Brands typically don't have a description field shown in list, adjust if yours do */}
                            {/* <th style={styles.tableCell}>Description</th> */}
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brands.map((brand, index) => (
                            <tr key={brand.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{brand.id}</td>
                                <td style={styles.tableCell}>{brand.name}</td>
                                {/* <td style={styles.tableCell}>{brand.description || '-'}</td> */}
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/brands/edit/${brand.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Brand"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(brand.id, brand.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Brand"
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

// --- Basic Inline Styles (Consider moving to a separate CSS/SCSS file or a styled-components approach for larger apps) ---
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none' },
    button: { padding: '8px 12px', margin: '0 5px 5px 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default BrandList; // Corrected export name