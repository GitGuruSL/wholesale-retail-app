import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SupplierList() {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    }, [location, navigate]);

    const fetchSuppliers = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/suppliers');
            setSuppliers(response.data || []);
        } catch (err) {
            console.error("[SupplierList] Error fetching suppliers:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch suppliers.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchSuppliers();
        } else if (!authLoading && !isAuthenticated) {
            setPageError("Please log in to view suppliers.");
            setIsLoading(false);
        } else if (!authLoading && !apiInstance) {
            setPageError("API client not available. Cannot fetch suppliers.");
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchSuppliers]);

    const handleDelete = async (supplierId, supplierName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete supplier: "${supplierName}" (ID: ${supplierId})?\nThis might fail if the supplier is linked to products.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/suppliers/${supplierId}`);
            setFeedback({ message: `Supplier "${supplierName}" deleted successfully.`, type: 'success' });
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        } catch (err) {
            console.error(`[SupplierList] Error deleting supplier ${supplierId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete supplier. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading suppliers...</div>;
    if (pageError && suppliers.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Suppliers</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {pageError && suppliers.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {pageError}
                 </p>
            )}
            {/* Ensure path matches App.jsx, e.g., /dashboard/suppliers/new */}
            <Link to="/dashboard/suppliers/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Supplier</button>
            </Link>

            {suppliers.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No suppliers found. Click "Add New Supplier" to create one.</p>
            ) : (
                <div style={{overflowX: 'auto'}}>
                    <table style={styles.table}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableCell}>ID</th>
                                <th style={styles.tableCell}>Name</th>
                                <th style={styles.tableCell}>Contact Person</th>
                                <th style={styles.tableCell}>Email</th>
                                <th style={styles.tableCell}>Telephone</th>
                                <th style={styles.tableCell}>City</th>
                                <th style={styles.tableCell}>Default?</th>
                                <th style={styles.tableCell}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((supplier, index) => (
                                <tr key={supplier.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                    <td style={styles.tableCell}>{supplier.id}</td>
                                    <td style={styles.tableCell}>{supplier.name}</td>
                                    <td style={styles.tableCell}>{supplier.contact_person || '-'}</td>
                                    <td style={styles.tableCell}>{supplier.email || '-'}</td>
                                    <td style={styles.tableCell}>{supplier.telephone || '-'}</td>
                                    <td style={styles.tableCell}>{supplier.city || '-'}</td>
                                    <td style={styles.tableCell}>{supplier.is_default_supplier ? 'Yes' : 'No'}</td>
                                    <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                        {/* Ensure path matches App.jsx, e.g., /dashboard/suppliers/edit/:id */}
                                        <button
                                            onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)}
                                            style={{...styles.button, ...styles.buttonEdit}}
                                            title="Edit Supplier"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(supplier.id, supplier.name)}
                                            style={{...styles.button, ...styles.buttonDelete}}
                                            title="Delete Supplier"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Consistent List Styles
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
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default SupplierList;