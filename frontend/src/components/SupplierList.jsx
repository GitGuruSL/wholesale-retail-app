// frontend/src/components/SupplierList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SupplierList() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchSuppliers = useCallback(async () => { /* ... same as before ... */
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/suppliers`);
            setSuppliers(response.data);
        } catch (err) { console.error("Error fetching suppliers:", err); setError(err.response?.data?.message || 'Failed to fetch suppliers.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleDelete = async (supplierId, supplierName) => { /* ... same as before ... */
        if (!window.confirm(`Are you sure you want to delete supplier: "${supplierName}" (ID: ${supplierId})?\nThis might fail if they are linked to products or purchase orders.`)) return;
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/suppliers/${supplierId}`);
            setFeedback({ message: `Supplier "${supplierName}" deleted successfully.`, type: 'success' });
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        } catch (err) { console.error(`Error deleting supplier ${supplierId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete supplier.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
    };

    // Helper to format boolean
    const renderBoolean = (value) => (value ? <span style={{ color: 'green' }}>Yes</span> : <span style={{ color: 'grey' }}>No</span>);
    // Helper to format date
    const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleDateString() : '-');


    if (loading) return <p>Loading suppliers...</p>;
    if (error && suppliers.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Suppliers</h2>

            {/* Feedback Area */}
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && suppliers.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/suppliers/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Supplier</button> </Link>

            {suppliers.length === 0 && !loading ? ( <p>No suppliers found.</p> ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            {/* <th style={tableCellStyle}>Code</th> */} {/* REMOVED Code Header */}
                            <th style={tableCellStyle}>Name</th>
                            <th style={tableCellStyle}>City</th>
                            <th style={tableCellStyle}>Telephone</th>
                            <th style={tableCellStyle}>Email</th>
                            <th style={tableCellStyle}>Since</th>
                            <th style={tableCellStyle}>Default?</th>
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.map((supplier, index) => (
                            <tr key={supplier.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{supplier.id}</td>
                                {/* <td style={tableCellStyle}>{supplier.code || '-'}</td> */} {/* REMOVED Code Cell */}
                                <td style={tableCellStyle}>{supplier.name}</td>
                                <td style={tableCellStyle}>{supplier.city || '-'}</td>
                                <td style={tableCellStyle}>{supplier.telephone || '-'}</td>
                                <td style={tableCellStyle}>{supplier.email || '-'}</td>
                                <td style={tableCellStyle}>{formatDate(supplier.since_date)}</td>
                                <td style={tableCellStyle}>{renderBoolean(supplier.is_default_supplier)}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/suppliers/edit/${supplier.id}`)} style={actionButtonStyle} title="Edit Supplier"> Edit </button>
                                    <button onClick={() => handleDelete(supplier.id, supplier.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Supplier"> Delete </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// Basic styles
const tableCellStyle = { padding: '8px 6px', textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #eee' };
const actionButtonStyle = { marginRight: '5px', padding: '4px 8px', fontSize: '0.85em', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', backgroundColor:'#eee' };


export default SupplierList;
