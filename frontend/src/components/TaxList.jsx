// frontend/src/components/TaxList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function TaxList() {
    const [taxes, setTaxes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchTaxes = useCallback(async () => {
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/taxes`);
            setTaxes(response.data);
        } catch (err) { console.error("Error fetching taxes:", err); setError(err.response?.data?.message || 'Failed to fetch taxes.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTaxes(); }, [fetchTaxes]);

    const handleDelete = async (taxId, taxName) => {
        if (!window.confirm(`Are you sure you want to delete tax: "${taxName}" (ID: ${taxId})?\nThis might fail if it's linked to products.`)) return;
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/taxes/${taxId}`);
            setFeedback({ message: `Tax "${taxName}" deleted successfully.`, type: 'success' });
            setTaxes(prev => prev.filter(t => t.id !== taxId));
        } catch (err) { console.error(`Error deleting tax ${taxId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete tax.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
    };

    if (loading) return <p>Loading taxes...</p>;
    if (error && taxes.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Taxes</h2>
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && taxes.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/taxes/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Tax</button> </Link>

            {taxes.length === 0 && !loading ? ( <p>No taxes found.</p> ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead> <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}> <th style={tableCellStyle}>ID</th> <th style={tableCellStyle}>Name</th> <th style={tableCellStyle}>Rate</th> <th style={tableCellStyle}>Type</th> <th style={tableCellStyle}>Actions</th> </tr> </thead>
                    <tbody>
                        {taxes.map((tax, index) => (
                            <tr key={tax.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{tax.id}</td>
                                <td style={tableCellStyle}>{tax.name}</td>
                                <td style={tableCellStyle}>{tax.rate} {tax.tax_type_name === 'Percentage' ? '%' : ''}</td> {/* Indicate % */}
                                <td style={tableCellStyle}>{tax.tax_type_name} (ID: {tax.tax_type_id})</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/taxes/edit/${tax.id}`)} style={actionButtonStyle} title="Edit Tax"> Edit </button>
                                    <button onClick={() => handleDelete(tax.id, tax.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Tax"> Delete </button>
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

export default TaxList;
