import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiInstance from '../services/api'; // Ensure this path is correct

const ProductPage = () => {
    console.log('[ProductPage] Component rendering/rendered.'); // LOG 1: Is the component body even executing?

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('[ProductPage] useEffect hook triggered.'); // LOG 2: Is the useEffect itself running?

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            console.log('[ProductPage] Attempting to fetch products...'); // LOG 3
            console.log('[ProductPage] Using apiInstance (check interceptors in console):', apiInstance); // LOG 4

            try {
                const response = await apiInstance.get('/products');
                
                if (Array.isArray(response.data)) {
                    console.log('[ProductPage] Products fetched successfully. Count:', response.data.length);
                    setProducts(response.data);
                } else {
                    console.error("[ProductPage] API did not return an array for products. Received:", response.data);
                    setProducts([]);
                    setError('Received invalid data format for products from the server.');
                }
            } catch (err) {
                console.error("[ProductPage] Failed to fetch products. Full error object:", err);
                if (err.response) {
                    console.error("[ProductPage] Error response data:", err.response.data);
                    console.error("[ProductPage] Error response status:", err.response.status);
                    if (err.response.status === 401) {
                        setError('Unauthorized: You do not have permission to view products. Please ensure you are logged in.');
                    } else {
                        setError(`Error ${err.response.status}: ${err.response.data?.message || 'Failed to load products.'}`);
                    }
                } else if (err.request) {
                     setError('No response from server. Please check your network or if the server is running.');
                } else {
                    setError(`Error fetching products: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const addNewLinkPath = "/dashboard/products/new";

    console.log('[ProductPage] Returning JSX. Loading:', loading, 'Error:', error); // LOG 5

    if (loading) {
        return <p>Loading products...</p>;
    }

    if (error) {
        return <p style={{ color: 'red' }}>Error: {error}</p>;
    }

    return (
        <div>
            <h2>Products</h2>
            <Link to={addNewLinkPath} style={{ marginBottom: '20px', display: 'inline-block' }} className="btn btn-primary">
                Add New Product
            </Link>
            
            {products.length === 0 ? (
                <p>No products found.</p>
            ) : (
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => {
                            if (!product || typeof product.id === 'undefined') {
                                console.warn("[ProductPage] Skipping rendering of invalid product data in map:", product);
                                return null; 
                            }
                            const editLinkPath = `/dashboard/products/edit/${product.id}`;
                            return (
                                <tr key={product.id}>
                                    <td>{product.id}</td>
                                    <td>{product.name || 'N/A'}</td>
                                    <td>
                                        <Link to={editLinkPath} className="btn btn-sm btn-outline-secondary me-2">
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ProductPage;