import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton,
    Typography, Box, Collapse, Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import SalesIcon from '@mui/icons-material/PointOfSale';
import ReportsIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // For user icon
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';

// --- Icons for new items ---
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import StraightenIcon from '@mui/icons-material/Straighten';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';


const SubCategoryIcon = CategoryIcon; // Placeholder
const BrandIcon = StoreIcon; // Placeholder
const SpecialCategoryIcon = CategoryIcon; // Placeholder
const SupplierIcon = PeopleIcon; // Placeholder

import { useAuth } from '../context/AuthContext'; // Ensure path is correct

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'drawerWidth' })(
    ({ theme, open, drawerWidth }) => ({
        '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            ...(!open && {
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: theme.spacing(7),
                [theme.breakpoints.up('sm')]: {
                    width: theme.spacing(9),
                },
            }),
        },
    }),
);

const Sidebar = ({ drawerWidth, open, handleDrawerToggle }) => {
    const location = useLocation();
    const { user, logout } = useAuth(); // Correctly destructure logout
    const [openSections, setOpenSections] = useState({});

    useEffect(() => {
        if (user) {
            // console.log("Sidebar: User data:", JSON.stringify(user));
            // console.log("Sidebar: User permissions:", JSON.stringify(user?.permissions));
        }
    }, [user]);

    const hasPermission = (requiredPermission) => {
        if (!requiredPermission) return true; // No permission needed
        if (!user || !user.permissions) return false; // User or permissions not available
        return user.permissions.includes(requiredPermission);
    };

    const handleMenuClick = (sectionId) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const mainMenuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', requiredPermission: 'user:read_self' }, // Example permission
        { text: 'Stores', icon: <StoreIcon />, path: '/dashboard/stores', requiredPermission: 'store:read' },
        { text: 'Products', icon: <ListAltIcon />, path: '/dashboard/products', requiredPermission: 'product:read' },
        { text: 'Customers', icon: <PeopleIcon />, path: '/dashboard/customers', requiredPermission: 'customer:read' },
        { text: 'Suppliers', icon: <SupplierIcon />, path: '/dashboard/suppliers', requiredPermission: 'supplier:read' },
    ];

    const collapsibleSectionsData = [
        {
            id: "productCatalog", label: "Product Catalog", icon: <CategoryIcon />, requiredPermission: 'product:read', // Broad permission for section
            items: [
                { text: 'Categories', icon: <CategoryIcon />, path: '/dashboard/categories', requiredPermission: 'category:read' },
                { text: 'Sub-Categories', icon: <SubCategoryIcon />, path: '/dashboard/sub-categories', requiredPermission: 'subcategory:read' },
                { text: 'Brands', icon: <BrandIcon />, path: '/dashboard/brands', requiredPermission: 'brand:read' },
                { text: 'Special Categories', icon: <SpecialCategoryIcon />, path: '/dashboard/special-categories', requiredPermission: 'specialcategory:read' },
            ]
        },
        {
            id: "productAttributes", label: "Product Attributes", icon: <SettingsIcon />, requiredPermission: 'product_attribute:read',
            items: [
                { text: 'Attributes List', icon: <ListAltIcon />, path: '/dashboard/product-attributes', requiredPermission: 'product_attribute:read' },
                { text: 'Tax Types', icon: <MonetizationOnIcon />, path: '/dashboard/tax-types', requiredPermission: 'tax:read' },
                { text: 'Taxes', icon: <MonetizationOnIcon />, path: '/dashboard/taxes', requiredPermission: 'tax:manage' },
            ]
        },
        {
            id: "productSettings", label: "Product Settings", icon: <SettingsSuggestIcon />, requiredPermission: 'product_settings:read',
            items: [
                { text: 'Units', icon: <StraightenIcon />, path: '/dashboard/units', requiredPermission: 'unit:read' },
                { text: 'Manufacturers', icon: <PrecisionManufacturingIcon />, path: '/dashboard/manufacturers', requiredPermission: 'manufacturer:read' },
                { text: 'Warranties', icon: <VerifiedUserIcon />, path: '/dashboard/warranties', requiredPermission: 'warranty:read' },
                { text: 'Barcode Symbologies', icon: <QrCodeScannerIcon />, path: '/dashboard/barcode-symbologies', requiredPermission: 'barcode_symbology:read' },
                { text: 'Discount Types', icon: <LocalOfferIcon />, path: '/dashboard/discount-types', requiredPermission: 'discount_type:read' },
            ]
        },
        {
            id: "inventoryManagement", label: "Inventory", icon: <InventoryIcon />, requiredPermission: 'inventory:read',
            items: [
                { text: 'Inventory List', icon: <InventoryIcon />, path: '/dashboard/inventory', requiredPermission: 'inventory:read' },
            ]
        },
        {
            id: "salesManagement", label: "Sales", icon: <SalesIcon />, requiredPermission: 'sale:read',
            items: [
                { text: 'New Sale (POS)', icon: <SalesIcon />, path: '/dashboard/sales/new', requiredPermission: 'sale:create' },
                { text: 'Sales History', icon: <ListAltIcon />, path: '/dashboard/sales', requiredPermission: 'sale:read' },
            ]
        },
        {
            id: "userManagement", label: "User Management", icon: <PeopleIcon />, requiredPermission: 'user:read_all',
            items: [
                { text: 'Users', icon: <PeopleIcon />, path: '/dashboard/users', requiredPermission: 'user:read_all' },
                { text: 'Roles', icon: <AssignmentIndIcon />, path: '/dashboard/roles', requiredPermission: 'role:read' },
                { text: 'Permissions', icon: <VpnKeyIcon />, path: '/dashboard/permissions', requiredPermission: 'permission:read' },
                { text: 'Permission Categories', icon: <SettingsApplicationsIcon />, path: '/dashboard/permission-categories', requiredPermission: 'system:manage_permission_categories' },
                { text: 'Access Control', icon: <AdminPanelSettingsIcon />, path: '/dashboard/access-control', requiredPermission: 'role:assign_permissions' },
            ]
        },
        {
            id: "reports", label: "Reports", icon: <ReportsIcon />, requiredPermission: 'report:read',
            items: [
                { text: 'Sales Report', icon: <ReportsIcon />, path: '/dashboard/reports/sales', requiredPermission: 'report:read_sales' },
                { text: 'Inventory Report', icon: <ReportsIcon />, path: '/dashboard/reports/inventory', requiredPermission: 'report:read_inventory' },
                { text: 'User Activity', icon: <ReportsIcon />, path: '/dashboard/reports/user-activity', requiredPermission: 'report:read_user_activity' },
            ]
        },
        {
            id: "settings", label: "System Settings", icon: <SettingsIcon />, requiredPermission: 'system:manage_settings',
            items: [
                { text: 'Company Profile', icon: <BusinessIcon />, path: '/dashboard/settings/company', requiredPermission: 'system:manage_settings' },
                { text: 'Store Settings', icon: <StoreIcon />, path: '/dashboard/settings/store', requiredPermission: 'store_settings:update' },
            ]
        },
    ];

    const filteredMainMenuItems = mainMenuItems.filter(item => hasPermission(item.requiredPermission));

    const renderCollapsibleMenu = (section) => {
        if (!hasPermission(section.requiredPermission)) {
            return null;
        }
        const filteredSubItems = section.items.filter(subItem => hasPermission(subItem.requiredPermission));
        
        if (section.path && filteredSubItems.length === 0) {
             return (
                <Tooltip title={!open ? section.label : ""} placement="right" key={section.id} disableHoverListener={open}>
                    <ListItem
                        button
                        component={RouterLink}
                        to={section.path}
                        selected={location.pathname === section.path || location.pathname.startsWith(section.path + '/')}
                    >
                        <ListItemIcon>{section.icon}</ListItemIcon>
                        {open && <ListItemText primary={section.label} />}
                    </ListItem>
                </Tooltip>
            );
        }

        if (filteredSubItems.length === 0 && !section.path) {
            return null;
        }

        return (
            <React.Fragment key={section.id}>
                <Tooltip title={!open ? section.label : ""} placement="right" disableHoverListener={open}>
                    <ListItem button onClick={() => handleMenuClick(section.id)}>
                        <ListItemIcon>{section.icon}</ListItemIcon>
                        {open && <ListItemText primary={section.label} />}
                        {open && (filteredSubItems.length > 0 ? (openSections[section.id] ? <ExpandLess /> : <ExpandMore />) : null)}
                    </ListItem>
                </Tooltip>
                {filteredSubItems.length > 0 && (
                    <Collapse in={openSections[section.id]} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ pl: open ? 4 : 1 }}>
                            {filteredSubItems.map((item) => (
                                <Tooltip title={!open ? item.text : ""} placement="right" key={item.text} disableHoverListener={open}>
                                    <ListItem
                                        button
                                        component={RouterLink}
                                        to={item.path}
                                        selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                                        sx={{ py: open ? 1 : 1.5, pl: open ? 2 : 'auto' }}
                                    >
                                        <ListItemIcon>{item.icon}</ListItemIcon>
                                        {open && <ListItemText primary={item.text} />}
                                    </ListItem>
                                </Tooltip>
                            ))}
                        </List>
                    </Collapse>
                )}
            </React.Fragment>
        );
    };

    return (
        <StyledDrawer variant="permanent" open={open} drawerWidth={drawerWidth}>
            <Box
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between', // Changed to space-between
                    padding: theme.spacing(0, 1),
                    ...theme.mixins.toolbar,
                })}
            >
                {open && (
                    <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ ml: 1 }}>
                        App Name
                    </Typography>
                )}
                {/* {!open && <Box sx={{ flexGrow: 1 }} />} Removed to allow IconButton to be at the end */}
                <IconButton onClick={handleDrawerToggle}>
                    {open ? <ChevronLeftIcon /> : <MenuIcon />}
                </IconButton>
            </Box>
            <Divider />

            {open && user && (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <AccountCircleIcon sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" noWrap>
                        {user.name || user.username || user.email || "User"}
                    </Typography>
                    {(user.role_display_name || user.role_name) && ( // Check for role_display_name first
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user.role_display_name || user.role_name} {/* Use role_display_name, fallback to role_name */}
                        </Typography>
                    )}
                </Box>
            )}
            {open && user && <Divider sx={{ mb: 1 }} />}

            <List component="nav" sx={{ pt: 0, pb: 0, flexGrow: 1, overflowY: 'auto' }}> {/* Added flexGrow and overflowY */}
                {filteredMainMenuItems.map((item) => (
                    <Tooltip title={!open ? item.text : ""} placement="right" key={item.text} disableHoverListener={open}>
                        <ListItem
                            button
                            component={RouterLink}
                            to={item.path}
                            selected={item.path === '/dashboard' ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            {open && <ListItemText primary={item.text} />}
                        </ListItem>
                    </Tooltip>
                ))}
                <Divider sx={{ my: 1 }} />
                {collapsibleSectionsData.map(section => renderCollapsibleMenu(section))}
            </List>
            {/* <Box sx={{ flexGrow: 1 }} /> Removed as List now handles flexGrow */}
            <Divider />
            <Tooltip title={!open ? "Logout" : ""} placement="right" disableHoverListener={open}>
                <ListItem button onClick={logout}> {/* Corrected to use logout directly */}
                    <ListItemIcon><LogoutIcon /></ListItemIcon>
                    {open && <ListItemText primary="Logout" />}
                </ListItem>
            </Tooltip>
        </StyledDrawer>
    );
};

export default Sidebar;