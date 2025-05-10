import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

export const StoreContext = createContext(null);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};

export const StoreProvider = ({ children }) => {
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Store-specific loading state
    const [error, setError] = useState(null);

    const fetchStoresForUser = useCallback(async () => {
        // Ensure user and essential properties are available before fetching
        if (!isAuthenticated || !user || !user.id || !user.role_name) {
            // console.log('[StoreContext] Pre-conditions not met for fetching stores. Auth/User invalid.');
            setStores([]);
            return;
        }
    
        console.log(`[StoreContext] Attempting to fetch stores for user ID: ${user.id}, Role: ${user.role_name}`);
        setIsLoading(true);
        setError(null);
    
        try {
            let response;
            if (user.role_name === 'global_admin') {
                response = await apiInstance.get('/stores?type=selector'); // Assuming this endpoint returns all stores for selection
                console.log('[StoreContext] Fetched all stores for global_admin:', response.data);
                setStores(Array.isArray(response.data) ? response.data : []);
            } else if (user.store_id) { // User has a specific store assigned
                response = await apiInstance.get(`/stores/${user.store_id}`);
                console.log(`[StoreContext] Fetched store ${user.store_id} for user ${user.id}:`, response.data);
                // API for a single store might return an object directly, ensure it's wrapped in an array
                setStores(response.data ? [response.data] : []);
            } else {
                // Non-global admin without a specific store_id
                console.warn(`[StoreContext] User ${user.id} (${user.role_name}) has no associated store_id and is not global_admin. No stores to fetch.`);
                setStores([]);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Failed to fetch stores.";
            console.error('[StoreContext] Error fetching stores:', errorMessage, err);
            setError(errorMessage);
            setStores([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user]); // Removed apiInstance as it's stable and imported directly

    // Effect to fetch stores when auth state is ready and user is available
    useEffect(() => {
        // console.log(`[StoreContext] Auth state monitor. IsAuth: ${isAuthenticated}, UserID: ${user?.id}, AuthLoading: ${authIsLoading}`);
        if (!authIsLoading && isAuthenticated && user && user.id) {
            fetchStoresForUser();
        } else if (!authIsLoading && !isAuthenticated) {
            // console.log('[StoreContext] User logged out or not authenticated (and auth not loading). Clearing stores.');
            setStores([]);
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        }
    }, [isAuthenticated, user, authIsLoading, fetchStoresForUser]);

    // Effect to initialize or update selected store from localStorage or available stores
    useEffect(() => {
        // console.log(`[StoreContext] Selected store init. AuthLoading: ${authIsLoading}, StoreLoading: ${isLoading}, Stores: ${stores.length}`);
        if (authIsLoading || isLoading) { // isLoading is store-specific loading
            // console.log('[StoreContext] Skipping selected store initialization: Auth or Stores still loading.');
            return;
        }

        if (!isAuthenticated || !user) {
            // console.log('[StoreContext] Skipping selected store initialization: User not authenticated.');
            setSelectedStore(null); // Ensure cleanup if user becomes unauthenticated
            localStorage.removeItem('selectedStoreId');
            return;
        }
        
        const storedStoreIdString = localStorage.getItem('selectedStoreId');
        let storeToSelect = null;

        if (stores.length > 0) {
            if (storedStoreIdString) {
                const storedStoreId = parseInt(storedStoreIdString, 10);
                const foundStore = stores.find(s => s.id === storedStoreId);
                if (foundStore) {
                    storeToSelect = foundStore;
                    // console.log('[StoreContext] Using store from localStorage:', storeToSelect);
                }
            }
            // If no valid stored ID, or stored ID not in current list, and user is not global_admin,
            // default to the first store if it's a single-store user (store_admin).
            // Global admins should actively select.
            if (!storeToSelect && user.store_id && stores.length === 1 && stores[0].id === user.store_id) {
                storeToSelect = stores[0];
                // console.log('[StoreContext] Defaulting store_admin to their assigned store:', storeToSelect);
            } else if (!storeToSelect && user.role_name === 'global_admin' && stores.length > 0 && !storedStoreIdString) {
                 // For global_admin, if no selection in local storage, don't auto-select the first one.
                 // Let them pick, or if you want to default, uncomment next line.
                 // storeToSelect = stores[0]; 
                 // console.log('[StoreContext] Global admin, no stored selection. Awaiting manual selection or defaulting to first.');
            } else if (!storeToSelect && stores.length > 0 && user.role_name !== 'global_admin') {
                // Fallback for non-global admin if no specific logic met, could be first store
                storeToSelect = stores[0];
                // console.log('[StoreContext] Fallback: Selecting first available store for non-global_admin:', storeToSelect);
            }
        }
        
        if (storeToSelect) {
            if (!selectedStore || selectedStore.id !== storeToSelect.id) {
                setSelectedStore(storeToSelect);
                localStorage.setItem('selectedStoreId', storeToSelect.id.toString());
                // console.log('[StoreContext] Store selected:', storeToSelect);
            }
        } else if (stores.length === 0 || (user.role_name === 'global_admin' && !storedStoreIdString)) {
            // If no stores, or global admin with no preference, clear selection
            if (selectedStore !== null) { // only update if it's actually changing
                setSelectedStore(null);
                localStorage.removeItem('selectedStoreId');
                // console.log('[StoreContext] No stores available or global admin awaiting selection. Selection cleared.');
            }
        }

    }, [stores, isLoading, authIsLoading, isAuthenticated, user, selectedStore]);

    const selectStore = useCallback((storeToSet) => {
        if (storeToSet && storeToSet.id) {
            // console.log('[StoreContext] Manually selecting store:', storeToSet);
            setSelectedStore(storeToSet);
            localStorage.setItem('selectedStoreId', storeToSet.id.toString());
        } else if (storeToSet === null) { // Allow explicitly clearing the store
            // console.log('[StoreContext] Manually clearing store selection.');
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        } else {
            console.warn('[StoreContext] Attempted to select an invalid store object.');
        }
    }, []);

    return (
        <StoreContext.Provider value={{
            stores,
            selectedStore,
            isLoading, // Store-specific loading
            error,
            selectStore,
            // fetchStoresForUser, // Expose if manual refresh is needed outside of auth changes
        }}>
            {children}
        </StoreContext.Provider>
    );
};