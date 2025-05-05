// frontend/src/components/DiscountTypeList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function DiscountTypeList() {
    const [discountTypes, setDiscountTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchDiscountTypes = useCallback(async () => {
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/discount-types`);
            setDiscountTypes(response.data);
        } catch (err) { console.error("Error fetching discount types:", err); setError(err.response?.data?.message || 'Failed to fetch discount types.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDiscountTypes(); }, [fetchDiscountTypes]);

    const handleDelete = async (typeId, typeName) => {
        if (!window.confirm(`Are you sure you want to delete discount type: "${typeName}" (ID: ${typeId})?\nThis might fail if it's linked to products.`)) return;
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/discount-types/${typeId}`);
            setFeedback({ message: `Discount type "${typeName}" deleted successfully.`, type: 'success' });
            setDiscountTypes(prev => prev.filter(t => t.id !== typeId));
        } catch (err) { console.error(`Error deleting discount type ${typeId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete discount type.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
    };

    if (loading) return <p>Loading discount types...</p>;
    if (error && discountTypes.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Discount Types</h2>
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && discountTypes.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/discount-types/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Discount Type</button> </Link>

            {discountTypes.length === 0 && !loading ? ( <p>No discount types found.</p> ) : (
                <table style={{ width: '100%', maxWidth:'500px', borderCollapse: 'collapse' }}>
                    <thead> <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}> <th style={tableCellStyle}>ID</th> <th style={tableCellStyle}>Name</th> <th style={tableCellStyle}>Actions</th> </tr> </thead>
                    <tbody>
                        {discountTypes.map((type, index) => (
                            <tr key={type.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{type.id}</td>
                                <td style={tableCellStyle}>{type.name}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/discount-types/edit/${type.id}`)} style={actionButtonStyle} title="Edit Discount Type"> Edit </button>
                                    <button onClick={() => handleDelete(type.id, type.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Discount Type"> Delete </button>
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

export default DiscountTypeList;
