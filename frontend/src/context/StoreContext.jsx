import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // Correctly import useAuth

// Create and export the context itself
export const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null); // Will store the full store object
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { api, user, isLoading: isAuthLoading } = useAuth();

    const fetchStoresForUser = useCallback(async () => {
        console.log("StoreContext: fetchStoresForUser triggered.");
        if (isAuthLoading) {
            console.log("StoreContext: Auth is still loading, deferring store fetch.");
            return;
        }

        // Ensure user object and its id property exist
        if (!api || !user || !user.id) { // CHANGED: !user.user_id to !user.id
            console.log("StoreContext: API, user, or user.id not ready. Clearing stores. User:", user, "API:", !!api);
            setStores([]);
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
            return;
        }

        setIsLoading(true);
        setError(null);
        // Use user.id for fetching stores
        console.log(`StoreContext: Fetching stores for user ID: ${user.id}, Role: ${user.role}`); // CHANGED: user.user_id to user.id

        try {
            let response;
            let endpoint = '';
            if (user.role === 'global_admin') {
                console.log("StoreContext: User is global_admin, fetching all stores.");
                endpoint = '/stores'; // API endpoint to get all stores
                response = await api.get(endpoint);
            } else {
                // Ensure this endpoint expects user.id
                console.log(`StoreContext: User is ${user.role}, fetching assigned stores for user ID: ${user.id}.`); // CHANGED: user.user_id to user.id
                endpoint = `/users/${user.id}/assigned-stores`; // CHANGED: user.user_id to user.id
                response = await api.get(endpoint);
            }
            console.log(`StoreContext: API call to ${endpoint} successful.`);
            console.log("StoreContext: Stores API response received (response.data):", response.data);
            setStores(Array.isArray(response.data) ? response.data : []); // Ensure stores is always an array

        } catch (err) {
            console.error("StoreContext: Error fetching stores:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || 'Failed to fetch stores.');
            setStores([]);
        } finally {
            setIsLoading(false);
        }
    }, [api, user, isAuthLoading]);

    // Effect to fetch stores when user or auth state changes
    useEffect(() => {
        console.log("StoreContext: useEffect for fetchStoresForUser is running due to dependency change (api, user, isAuthLoading).");
        if (user && api && !isAuthLoading) { // Only fetch if user and api are available and auth is not loading
            fetchStoresForUser();
        } else if (!user && !isAuthLoading) { // If no user and auth is done loading, clear stores
            setStores([]);
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        }
    }, [api, user, isAuthLoading, fetchStoresForUser]);

    // Effect to set selected store from localStorage or default when stores array changes
    useEffect(() => {
        console.log("StoreContext: useEffect for selecting store is running. Stores count:", stores.length);
        if (stores.length > 0) {
            const previouslySelectedId = localStorage.getItem('selectedStoreId');
            let storeToSelect = null;
            console.log("StoreContext: Previously selected store ID from localStorage:", previouslySelectedId);

            if (previouslySelectedId) {
                storeToSelect = stores.find(s => s.id.toString() === previouslySelectedId);
                console.log("StoreContext: Found store by previouslySelectedId:", storeToSelect);
            }

            if (storeToSelect) {
                setSelectedStore(storeToSelect);
                console.log("StoreContext: Setting selected store to (from localStorage):", storeToSelect);
            } else {
                // Default to the first store in the list if no valid selection or previous selection
                setSelectedStore(stores[0]);
                localStorage.setItem('selectedStoreId', stores[0].id.toString());
                console.log("StoreContext: Setting selected store to default (first in list):", stores[0]);
            }
        } else { // No stores available
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
            console.log("StoreContext: No stores available, clearing selected store.");
        }
    }, [stores]); // This effect depends only on the 'stores' array

    const selectStore = (storeObject) => {
        if (storeObject && storeObject.id) {
            console.log("StoreContext: selectStore called with object:", storeObject);
            setSelectedStore(storeObject); // storeObject is the full store object
            localStorage.setItem('selectedStoreId', storeObject.id.toString());
        } else if (storeObject === null) {
            console.log("StoreContext: selectStore called with null, clearing selection.");
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        }
    };

    const value = {
        stores,
        selectedStore, // This is the full store object or null
        selectStore,
        isLoading,
        error,
        refreshStores: fetchStoresForUser
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};