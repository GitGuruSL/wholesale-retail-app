import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext'; // If store selection influences user list

function UserPage() {
    const { user: currentUser, ROLES: AUTH_ROLES, api } = useAuth();
    // selectedStore might be used if you want GA to filter users by store,
    // or if store admins can only see users associated with their selectedStore.
    const { selectedStore, GLOBAL_STORE_VIEW_ID } = useStore(); 
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pageTitle, setPageTitle] = useState("Users");

    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser || !api) {
                return;
            }

            setIsLoading(true);
            setError(null);
            const params = {};
            let currentTitle = "User Management";

            // Primary logic: Global admin sees all users.
            // Other roles typically don't see a general user list unless specifically designed.
            if (currentUser.role === AUTH_ROLES.GLOBAL_ADMIN) {
                console.log("UserPage: GLOBAL_ADMIN fetching all users.");
                // If GA can filter users by a selected store (optional feature):
                if (selectedStore && selectedStore.id !== GLOBAL_STORE_VIEW_ID) {
                    params.storeId = selectedStore.id; // Backend needs to support filtering users by storeId
                    currentTitle = `Users (Store: ${selectedStore.name})`;
                } else {
                    currentTitle = "All Users";
                }
            } else {
                // For other roles, you might not fetch any users, or fetch users specific to their store
                // This part depends heavily on your application's requirements.
                // For now, let's assume non-GAs don't see a general user list here.
                console.log(`UserPage: ${currentUser.role} does not have permission to view general user list.`);
                setError("You do not have permission to view this page.");
                setUsers([]);
                setIsLoading(false);
                setPageTitle(currentTitle); // Or a more specific title
                return;
            }
            setPageTitle(currentTitle);

            try {
                // Backend endpoint for users.
                // For GA, it might be /api/users
                // If filtering by store for GA, /api/users?storeId=...
                console.log("UserPage: Attempting to fetch users. Current user role:", currentUser.role, "Expected GA role:", AUTH_ROLES.GLOBAL_ADMIN, "Params:", params);
                const response = await api.get('/users', { params });
                setUsers(response.data || []);
            } catch (err) {
                console.error("UserPage: Failed to fetch users:", err.response?.data?.message || err.message, err);
                setError(err.response?.data?.message || "Failed to load users.");
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser, selectedStore, api, AUTH_ROLES, GLOBAL_STORE_VIEW_ID]);

    if (isLoading) return <p>Loading users...</p>;

    return (
        <div>
            <h2>{pageTitle}</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {currentUser && currentUser.role === AUTH_ROLES.GLOBAL_ADMIN && users.length === 0 && !isLoading && !error && (
                <p>No users found.</p>
            )}
            {currentUser && currentUser.role === AUTH_ROLES.GLOBAL_ADMIN && users.length > 0 && (
                <ul>
                    {users.map(u => ( // Changed variable name from 'user' to 'u' to avoid conflict
                        <li key={u.id}>{u.username} - {u.role} - {u.email}</li> // Adjust to your user structure
                    ))}
                </ul>
            )}
        </div>
    );
}

export default UserPage;