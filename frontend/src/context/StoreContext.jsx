import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const StoreContext = createContext(null); // Keep as is

export const useStore = () => useContext(StoreContext);

// Add this export if absolutely necessary for an external file
export { StoreContext }; // <--- ADD THIS LINE

export const StoreProvider = ({ children }) => {
    // ... rest of your StoreProvider code
    const { user, ROLES: AUTH_ROLES, api, isLoading: isAuthLoading } = useAuth();
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const GLOBAL_STORE_VIEW_ID = 'all_stores';

    useEffect(() => {
        const fetchStoresForUser = async () => {
            if (isAuthLoading || !user || !api) {
                if (!user && !isAuthLoading) {
                    setStores([]);
                    setSelectedStore(null);
                }
                return;
            }

            console.log("StoreContext: fetchStoresForUser triggered. User Role:", user.role);
            setIsLoading(true);
            setError(null);
            try {
                let response;
                if (user.role === AUTH_ROLES.GLOBAL_ADMIN) {
                    console.log("StoreContext: User is global_admin, fetching all stores for selector.");
                    response = await api.get('/stores');
                    setStores(response.data || []);
                } else if (user.role === AUTH_ROLES.STORE_ADMIN || user.role === AUTH_ROLES.STORE_STAFF) {
                    console.log(`StoreContext: User is ${user.role}, fetching stores for user ID: ${user.employeeId || user.id}`);
                    const userIdParam = user.employeeId || user.id;
                    response = await api.get(`/users/${userIdParam}/stores`);
                    setStores(response.data || []);
                } else {
                    console.log("StoreContext: User role not recognized for store fetching or no permission.");
                    setStores([]);
                }
            } catch (err) {
                console.error("StoreContext: Failed to fetch stores:", err.response?.data?.message || err.message, err);
                setError(err.response?.data?.message || "Failed to load stores.");
                setStores([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoresForUser();
    }, [api, user, isAuthLoading, AUTH_ROLES]);

    useEffect(() => {
        if (isAuthLoading || !user) return;

        console.log("StoreContext: useEffect for selecting store. Stores count:", stores.length, "User role:", user.role);
        const storageKey = `selectedStoreId_${user.id}`;
        const previouslySelectedId = localStorage.getItem(storageKey);

        if (user.role === AUTH_ROLES.GLOBAL_ADMIN) {
            let storeToSet = { id: GLOBAL_STORE_VIEW_ID, name: 'All Stores' };
            if (previouslySelectedId) {
                if (previouslySelectedId === GLOBAL_STORE_VIEW_ID) {
                    // "All Stores" was previously selected
                } else {
                    const foundStore = stores.find(s => s.id.toString() === previouslySelectedId);
                    if (foundStore) {
                        storeToSet = foundStore;
                    }
                }
            }
            setSelectedStore(storeToSet);
            if (storeToSet.id !== GLOBAL_STORE_VIEW_ID) {
                 localStorage.setItem(storageKey, storeToSet.id.toString());
            }

        } else if (stores.length > 0) {
            let storeToSelect = null;
            if (previouslySelectedId) {
                storeToSelect = stores.find(s => s.id.toString() === previouslySelectedId);
            }
            
            if (storeToSelect) {
                setSelectedStore(storeToSelect);
            } else {
                setSelectedStore(stores[0]);
                localStorage.setItem(storageKey, stores[0].id.toString());
            }
        } else if (!isLoading && stores.length === 0 && user.role !== AUTH_ROLES.GLOBAL_ADMIN) {
            setSelectedStore(null);
            console.warn("StoreContext: Non-global admin has no stores associated or fetched.");
        } else if (user.role !== AUTH_ROLES.GLOBAL_ADMIN) {
            setSelectedStore(null);
        }

    }, [stores, user, isLoading, isAuthLoading, AUTH_ROLES, GLOBAL_STORE_VIEW_ID]); // Added GLOBAL_STORE_VIEW_ID

    const selectStore = useCallback((store) => {
        if (user && store) {
            setSelectedStore(store);
            localStorage.setItem(`selectedStoreId_${user.id}`, store.id.toString());
            console.log("StoreContext: Store selected:", store);
        } else if (user && !store) {
            setSelectedStore(null);
            localStorage.removeItem(`selectedStoreId_${user.id}`);
        }
    }, [user]);

    const contextValue = {
        stores,
        selectedStore,
        isLoading,
        error,
        selectStore,
        GLOBAL_STORE_VIEW_ID,
    };

    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
};