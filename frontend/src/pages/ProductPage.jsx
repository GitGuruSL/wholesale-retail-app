// Example structure for your ProductPage.jsx or similar component
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

function ProductPage() {
    const { user, ROLES: AUTH_ROLES, api } = useAuth();
    const { selectedStore, GLOBAL_STORE_VIEW_ID } = useStore();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pageTitle, setPageTitle] = useState("Products");

    useEffect(() => {
        const fetchProducts = async () => {
            if (!user || !api || (user.role !== AUTH_ROLES.GLOBAL_ADMIN && !selectedStore)) {
                 if (user && user.role !== AUTH_ROLES.GLOBAL_ADMIN && !selectedStore) {
                    setError("Please select a store to view products.");
                    setProducts([]);
                 }
                return;
            }

            setIsLoading(true);
            setError(null);
            const params = {};
            let currentTitle = "Products";

            if (user.role === AUTH_ROLES.GLOBAL_ADMIN) {
                if (selectedStore && selectedStore.id === GLOBAL_STORE_VIEW_ID) {
                    console.log("ProductPage: GLOBAL_ADMIN viewing all products.");
                    // No storeId param, or your backend might expect a specific flag e.g., params.view = 'all';
                    currentTitle = "Products (All Stores)";
                } else if (selectedStore) { // Global admin selected a specific store
                    console.log(`ProductPage: GLOBAL_ADMIN viewing products for specific store: ${selectedStore.name}`);
                    params.storeId = selectedStore.id;
                    currentTitle = `Products (Store: ${selectedStore.name})`;
                } else {
                     // Should not happen if StoreContext defaults GA to "All Stores"
                    console.log("ProductPage: GLOBAL_ADMIN has no store selection (edge case).");
                    setIsLoading(false);
                    return;
                }
            } else if (selectedStore && selectedStore.id) { // Non-GA users
                console.log(`ProductPage: User ${user.username} viewing products for store: ${selectedStore.name}`);
                params.storeId = selectedStore.id;
                currentTitle = `Products (Store: ${selectedStore.name})`;
            } else {
                console.log("ProductPage: Conditions for fetching products not met.");
                setIsLoading(false);
                setProducts([]); // Clear products if no valid selection
                return;
            }
            setPageTitle(currentTitle);

            try {
                const response = await api.get('/products', { params });
                setProducts(response.data || []);
            } catch (err) {
                console.error("ProductPage: Failed to fetch products:", err.response?.data?.message || err.message, err);
                setError(err.response?.data?.message || "Failed to load products.");
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [user, selectedStore, api, AUTH_ROLES, GLOBAL_STORE_VIEW_ID]);

    if (isLoading) return <p>Loading products...</p>;
    // Error display should be more prominent if it's a fetch error
    // The "Forbidden" error you saw is a fetch error.

    return (
        <div>
            <h2>{pageTitle}</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {products.length === 0 && !isLoading && !error && <p>No products found.</p>}
            <ul>
                {products.map(product => (
                    <li key={product.id}>{product.name}</li> // Adjust to your product structure
                ))}
            </ul>
        </div>
    );
}

export default ProductPage;