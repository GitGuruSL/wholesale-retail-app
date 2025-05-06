import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { ROLES } from '../utils/roles'; // Adjust path as needed

const MainLayout = () => {
    const { user, logoutUser } = useAuth();

    const handleLogout = () => {
        if (logoutUser) logoutUser();
    };

    const styles = {
        appContainer: { display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
        sidebar: { width: '250px', borderRight: '1px solid #ccc', padding: '20px', backgroundColor: '#f8f9fa', overflowY: 'auto', flexShrink: 0 },
        sidebarTitle: { marginBottom: '15px', fontSize: '1.2em', color: '#343a40' },
        userInfo: { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ddd' },
        username: { fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' },
        role: { fontSize: '0.9em', color: '#555', marginBottom: '10px', textTransform: 'capitalize' },
        navList: { listStyle: 'none', padding: 0, margin: 0 },
        navItem: { marginBottom: '8px' },
        navLink: { textDecoration: 'none', color: '#495057', padding: '8px 12px', display: 'block', borderRadius: '4px', transition: 'background-color 0.2s ease, color 0.2s ease' },
        navLinkActive: { backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' },
        mainContent: { flexGrow: 1, padding: '20px 30px', backgroundColor: '#ffffff', overflowY: 'auto' },
        logoutButton: { width: '100%', padding: '10px', marginTop: '30px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' },
        sectionTitle: { marginTop: '20px', marginBottom: '10px', fontSize: '0.9em', fontWeight: 'bold', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }
    };
    
    const StyledNavLink = ({ to, children }) => {
        const location = useLocation();
        const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to + "/"));
        return (
            <NavLink to={to} style={{ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) }}>
                {children}
            </NavLink>
        );
    };

    const hasAnyRole = (allowedRoles) => {
        if (!user || !user.role) {
            return false;
        }
        return allowedRoles.some(role => role === user.role);
    };

    return (
        <div style={styles.appContainer}>
            <nav style={styles.sidebar}>
                <h3 style={styles.sidebarTitle}>Menu</h3>
                {user && (
                    <div style={styles.userInfo}>
                        <p style={styles.username}>User: {user.username || 'N/A'}</p>
                        <p style={styles.role}>
                            Role: {user.role && typeof user.role === 'string' ? user.role.replace(/_/g, ' ') : (user.role || 'N/A')}
                        </p>
                    </div>
                )}
                <ul style={styles.navList}>
                    <li style={styles.navItem}><StyledNavLink to="/">Dashboard</StyledNavLink></li>
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_STAFF]) && ( // Added STORE_STAFF for products view
                        <>
                            <h4 style={styles.sectionTitle}>Product Management</h4>
                            <li style={styles.navItem}><StyledNavLink to="/products">Products</StyledNavLink></li>
                            {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && ( // More restrictive for these
                                <>
                                    <li style={styles.navItem}><StyledNavLink to="/categories">Categories</StyledNavLink></li>
                                    <li style={styles.navItem}><StyledNavLink to="/sub-categories">Sub-Categories</StyledNavLink></li>
                                    <li style={styles.navItem}><StyledNavLink to="/brands">Brands</StyledNavLink></li>
                                    <li style={styles.navItem}><StyledNavLink to="/units">Units</StyledNavLink></li>
                                    <li style={styles.navItem}><StyledNavLink to="/special-categories">Special Categories</StyledNavLink></li>
                                </>
                            )}
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Supply Chain</h4>
                            <li style={styles.navItem}><StyledNavLink to="/suppliers">Suppliers</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/manufacturers">Manufacturers</StyledNavLink></li>
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Configuration</h4>
                            <li style={styles.navItem}><StyledNavLink to="/tax-types">Tax Types</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/taxes">Taxes</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/warranties">Warranties</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/barcode-symbologies">Barcode Types</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/discount-types">Discount Types</StyledNavLink></li>
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Administration</h4>
                            <li style={styles.navItem}><StyledNavLink to="/users">Users</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/stores">Stores</StyledNavLink></li>
                        </>
                    )}
                </ul>
                {user && <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>}
            </nav>
            <main style={styles.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;