import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton,
    Typography, Box, Collapse, Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles'; // Removed useTheme as it's available in sx prop
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
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'; // For Tax Types/Taxes

// --- Icons for new items ---
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'; // For Barcode Symbology
import LocalOfferIcon from '@mui/icons-material/LocalOffer';       // For Discount Type
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'; // For Manufacturer
import StraightenIcon from '@mui/icons-material/Straighten';       // For Unit
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';   // For Warranty
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'; // For the new section header

// Placeholder icons (replace with more specific ones if you have them)
const SubCategoryIcon = CategoryIcon;
const BrandIcon = StoreIcon;
const SpecialCategoryIcon = CategoryIcon;
const SupplierIcon = PeopleIcon; // Consider LocalShippingIcon or similar for Suppliers

import { useAuth } from '../context/AuthContext';

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
    const { user, logoutUser } = useAuth();
    const [openSections, setOpenSections] = useState({});

    useEffect(() => {
        if (user) {
            console.log("Sidebar: User permissions:", JSON.stringify(user?.permissions));
        }
    }, [user]);

    const hasPermission = (requiredPermission) => {
        if (!requiredPermission) return true;
        if (!user || !user.permissions) return false;
        return user.permissions.includes(requiredPermission);
    };

    const handleMenuClick = (sectionId) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const mainMenuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', requiredPermission: 'user:read_self' },
        { text: 'Stores', icon: <StoreIcon />, path: '/dashboard/stores', requiredPermission: 'store:read' },
        { text: 'Products', icon: <ListAltIcon />, path: '/dashboard/products', requiredPermission: 'product:read' },
        { text: 'Suppliers', icon: <SupplierIcon />, path: '/dashboard/suppliers', requiredPermission: 'supplier:read' },
    ];

    const collapsibleSectionsData = [
        {
            id: "productCatalog", label: "Product Catalog", icon: <CategoryIcon />, requiredPermission: 'product:read',
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
        { // NEW SECTION
            id: "productSettings",
            label: "Product Settings",
            icon: <SettingsSuggestIcon />,
            requiredPermission: 'product_settings:read', // Define this permission in backend
            items: [
                { text: 'Units', icon: <StraightenIcon />, path: '/dashboard/units', requiredPermission: 'unit:read' }, // Define unit:read
                { text: 'Manufacturers', icon: <PrecisionManufacturingIcon />, path: '/dashboard/manufacturers', requiredPermission: 'manufacturer:read' }, // Define manufacturer:read
                { text: 'Warranties', icon: <VerifiedUserIcon />, path: '/dashboard/warranties', requiredPermission: 'warranty:read' }, // Define warranty:read
                { text: 'Barcode Symbologies', icon: <QrCodeScannerIcon />, path: '/dashboard/barcode-symbologies', requiredPermission: 'barcode_symbology:read' }, // Define barcode_symbology:read
                { text: 'Discount Types', icon: <LocalOfferIcon />, path: '/dashboard/discount-types', requiredPermission: 'discount_type:read' }, // Define discount_type:read
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
        
        // If the section itself has a path and no visible sub-items, make the section header a direct link.
        // This is useful if a section's main permission implies access to a general page for that section.
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

        // If no sub-items are visible and the section header itself doesn't have a path, don't render the section.
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
                    justifyContent: 'space-between',
                    padding: theme.spacing(0, 1),
                    ...theme.mixins.toolbar,
                })}
            >
                {open && (
                    <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1, ml: 1 }}>
                        App Name
                    </Typography>
                )}
                {!open && <Box sx={{ flexGrow: 1 }} />}
                <IconButton onClick={handleDrawerToggle}>
                    {open ? <ChevronLeftIcon /> : <MenuIcon />}
                </IconButton>
            </Box>
            <Divider />
            <List component="nav" sx={{ pt: 0, pb: 0 }}>
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
            <Box sx={{ flexGrow: 1 }} />
            <Divider />
            <Tooltip title={!open ? "Logout" : ""} placement="right" disableHoverListener={open}>
                <ListItem button onClick={() => logoutUser ? logoutUser() : console.error("logoutUser function not available")}>
                    <ListItemIcon><LogoutIcon /></ListItemIcon>
                    {open && <ListItemText primary="Logout" />}
                </ListItem>
            </Tooltip>
        </StyledDrawer>
    );
};

export default Sidebar;