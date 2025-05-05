// frontend/src/components/BrandList.jsx
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
        setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/brands`);
            setBrands(response.data);
        } catch (err) {
            console.error("Error fetching brands:", err);
            setError(err.response?.data?.message || 'Failed to fetch brands.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    const handleDelete = async (brandId, brandName) => {
        if (!window.confirm(`Are you sure you want to delete brand: "${brandName}" (ID: ${brandId})?\nThis might fail if it's linked to products.`)) {
            return;
        }

        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/brands/${brandId}`);
            setFeedback({ message: `Brand "${brandName}" deleted successfully.`, type: 'success' });
            setBrands(prev => prev.filter(b => b.id !== brandId));
        } catch (err) {
            console.error(`Error deleting brand ${brandId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete brand.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg);
        } finally {
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <p>Loading brands...</p>;
    if (error && brands.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Brands</h2>

            {/* Feedback Area */}
            {feedback.message && (
                <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}>
                    {feedback.message}
                </div>
            )}
            {error && brands.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}


            <Link to="/brands/new">
                <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Brand</button>
            </Link>

            {brands.length === 0 && !loading ? (
                <p>No brands found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Name</th>
                            <th style={tableCellStyle}>Description</th>
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brands.map((brand, index) => (
                            <tr key={brand.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{brand.id}</td>
                                <td style={tableCellStyle}>{brand.name}</td>
                                <td style={tableCellStyle}>{brand.description || '-'}</td>
                                <td style={tableCellStyle}>
                                    <button
                                        onClick={() => navigate(`/brands/edit/${brand.id}`)}
                                        style={{ marginRight: '5px', padding: '5px 8px', cursor:'pointer' }}
                                        title="Edit Brand"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(brand.id, brand.name)}
                                        style={{ padding: '5px 8px', cursor:'pointer', backgroundColor: '#f44336', color: 'white', border:'none', borderRadius:'3px'}}
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

// Basic styles
const tableCellStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    verticalAlign: 'top',
};

export default BrandList;
