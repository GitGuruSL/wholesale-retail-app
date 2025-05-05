// frontend/src/components/WarrantyList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function WarrantyList() {
    const [warranties, setWarranties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchWarranties = useCallback(async () => {
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/warranties`);
            setWarranties(response.data);
        } catch (err) { console.error("Error fetching warranties:", err); setError(err.response?.data?.message || 'Failed to fetch warranties.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchWarranties(); }, [fetchWarranties]);

    const handleDelete = async (warrantyId, warrantyName) => {
        if (!window.confirm(`Are you sure you want to delete warranty: "${warrantyName}" (ID: ${warrantyId})?\nThis might fail if it's linked to products.`)) return;
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/warranties/${warrantyId}`);
            setFeedback({ message: `Warranty "${warrantyName}" deleted successfully.`, type: 'success' });
            setWarranties(prev => prev.filter(w => w.id !== warrantyId));
        } catch (err) { console.error(`Error deleting warranty ${warrantyId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete warranty.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
    };

    if (loading) return <p>Loading warranties...</p>;
    if (error && warranties.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Warranties</h2>
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && warranties.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/warranties/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Warranty</button> </Link>

            {warranties.length === 0 && !loading ? ( <p>No warranties found.</p> ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead> <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}> <th style={tableCellStyle}>ID</th> <th style={tableCellStyle}>Name</th> <th style={tableCellStyle}>Duration (Months)</th> <th style={tableCellStyle}>Description</th> <th style={tableCellStyle}>Actions</th> </tr> </thead>
                    <tbody>
                        {warranties.map((warranty, index) => (
                            <tr key={warranty.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{warranty.id}</td>
                                <td style={tableCellStyle}>{warranty.name}</td>
                                <td style={tableCellStyle}>{warranty.duration_months ?? '-'}</td> {/* Show dash if null */}
                                <td style={tableCellStyle}>{warranty.description || '-'}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/warranties/edit/${warranty.id}`)} style={actionButtonStyle} title="Edit Warranty"> Edit </button>
                                    <button onClick={() => handleDelete(warranty.id, warranty.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Warranty"> Delete </button>
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

export default WarrantyList;
