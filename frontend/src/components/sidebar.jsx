import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton,
    Typography, Box, Collapse, Tooltip, ListItemButton
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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import StraightenIcon from '@mui/icons-material/Straighten';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import StyleIcon from '@mui/icons-material/Style'; // Icon for Attributes

// Aliases for icons if needed (Consider using distinct icons if available)
const SubCategoryIcon = CategoryIcon;
const BrandIcon = StoreIcon; // Example: Using StoreIcon for Brand
const SpecialCategoryIcon = CategoryIcon;
const SupplierIcon = PeopleIcon; // Example: Using PeopleIcon for Supplier

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
    const { user, logout, userCan } = useAuth();
    const [openSections, setOpenSections] = useState({});

    const mainMenuItems = useMemo(() => [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', requiredPermission: 'user:read_self' },
        { text: 'Stores', icon: <StoreIcon />, path: '/dashboard/stores', requiredPermission: 'store:read' },
        { text: 'Products', icon: <ListAltIcon />, path: '/dashboard/products', requiredPermission: 'product:read' },
        { text: 'Customers', icon: <PeopleIcon />, path: '/dashboard/customers', requiredPermission: 'customer:read' },
        { text: 'Suppliers', icon: <SupplierIcon />, path: '/dashboard/suppliers', requiredPermission: 'supplier:read' },
    ], []);

    const collapsibleSectionsData = useMemo(() => [
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
            id: "productAttributesManagement",
            label: "Attributes",
            icon: <StyleIcon />,
            requiredPermission: 'product_attribute:read',
            items: [
                { text: 'Manage Attributes', icon: <ListAltIcon />, path: '/dashboard/attributes', requiredPermission: 'product_attribute:read' },
            ]
        },
        {
            id: "productSettings", label: "Product Settings", icon: <SettingsSuggestIcon />, requiredPermission: 'product_settings:read',
            items: [
                { text: 'Tax Types', icon: <MonetizationOnIcon />, path: '/dashboard/tax-types', requiredPermission: 'tax:read' },
                { text: 'Taxes', icon: <MonetizationOnIcon />, path: '/dashboard/taxes', requiredPermission: 'tax:manage' },
                { text: 'Units of Measure', icon: <StraightenIcon />, path: '/dashboard/units', requiredPermission: 'unit:read' },
                { text: 'Barcode Symbologies', icon: <QrCodeScannerIcon />, path: '/dashboard/barcode-symbologies', requiredPermission: 'barcodesymbology:read' },
                { text: 'Discount Types', icon: <LocalOfferIcon />, path: '/dashboard/discount-types', requiredPermission: 'discounttype:read' },
                { text: 'Manufacturers', icon: <PrecisionManufacturingIcon />, path: '/dashboard/manufacturers', requiredPermission: 'manufacturer:read' },
                { text: 'Warranties', icon: <VerifiedUserIcon />, path: '/dashboard/warranties', requiredPermission: 'warranty:read' },
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
    ], []);

    const hasPermission = useCallback((requiredPermission) => {
        if (!requiredPermission) return true; // No permission required
        if (userCan) return userCan(requiredPermission); // Use context's userCan if available
        if (!user || !user.permissions) return false; // Fallback if userCan is not ready or user has no permissions array
        return user.permissions.includes(requiredPermission);
    }, [user, userCan]);

    useEffect(() => {
        if (open && collapsibleSectionsData) {
            const activeSection = collapsibleSectionsData.find(section =>
                section.items.some(item => location.pathname.startsWith(item.path))
            );
            if (activeSection && !openSections[activeSection.id]) {
                setOpenSections(prev => ({ ...prev, [activeSection.id]: true }));
            }
        }
    }, [location.pathname, open, collapsibleSectionsData, openSections]);

    const handleMenuClick = (sectionId) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const filteredMainMenuItems = useMemo(() =>
        mainMenuItems.filter(item => hasPermission(item.requiredPermission)),
        [mainMenuItems, hasPermission]
    );

    const renderCollapsibleMenu = useCallback((section) => {
        if (!hasPermission(section.requiredPermission)) {
            return null;
        }
        const filteredSubItems = section.items.filter(subItem => hasPermission(subItem.requiredPermission));

        if (section.path && filteredSubItems.length === 0) {
            return (
                <Tooltip title={!open ? section.label : ""} placement="right" key={section.id} disableHoverListener={open}>
                    <ListItem disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={section.path}
                            selected={location.pathname === section.path || location.pathname.startsWith(section.path + '/')}
                        >
                            <ListItemIcon>{section.icon}</ListItemIcon>
                            {open && <ListItemText primary={section.label} />}
                        </ListItemButton>
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
                    <ListItemButton onClick={() => handleMenuClick(section.id)}> {/* Changed ListItem to ListItemButton for consistent behavior */}
                        <ListItemIcon>{section.icon}</ListItemIcon>
                        {open && <ListItemText primary={section.label} />}
                        {open && (filteredSubItems.length > 0 ? (openSections[section.id] ? <ExpandLess /> : <ExpandMore />) : null)}
                    </ListItemButton>
                </Tooltip>
                {filteredSubItems.length > 0 && (
                    <Collapse in={openSections[section.id]} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ pl: open ? 4 : 1 }}>
                            {filteredSubItems.map((item) => (
                                <Tooltip title={!open ? item.text : ""} placement="right" key={item.text} disableHoverListener={open}>
                                    <ListItem disablePadding sx={{ py: open ? 0 : 0.25 }}>
                                        <ListItemButton
                                            component={RouterLink}
                                            to={item.path}
                                            selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                                        >
                                            <ListItemIcon>{item.icon}</ListItemIcon>
                                            {open && <ListItemText primary={item.text} />}
                                        </ListItemButton>
                                    </ListItem>
                                </Tooltip>
                            ))}
                        </List>
                    </Collapse>
                )}
            </React.Fragment>
        );
    }, [open, openSections, hasPermission, location.pathname, handleMenuClick]); // Added handleMenuClick to dependencies

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
                    <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ ml: 1, flexGrow: 1 }}>
                        App Name
                    </Typography>
                )}
                <IconButton onClick={handleDrawerToggle}>
                    {open ? <ChevronLeftIcon /> : <MenuIcon />}
                </IconButton>
            </Box>
            <Divider />

            {open && user && (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <AccountCircleIcon sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1" noWrap>
                        {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.username || user.email || "User")}
                    </Typography>
                    {(user.role_display_name || user.role_name) && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user.role_display_name || user.role_name}
                        </Typography>
                    )}
                </Box>
            )}
            {open && user && <Divider sx={{ mb: 1 }} />}

            <List component="nav" sx={{ pt: 0, pb: 0, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {filteredMainMenuItems.map((item) => (
                    <Tooltip title={!open ? item.text : ""} placement="right" key={item.text} disableHoverListener={open}>
                        <ListItem disablePadding>
                            <ListItemButton
                                component={RouterLink}
                                to={item.path}
                                selected={item.path === '/dashboard' ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                {open && <ListItemText primary={item.text} />}
                            </ListItemButton>
                        </ListItem>
                    </Tooltip>
                ))}
                <Divider sx={{ my: 1 }} />
                {collapsibleSectionsData.map(section => renderCollapsibleMenu(section))}
            </List>
            <Divider />
            <Tooltip title={!open ? "Logout" : ""} placement="right" disableHoverListener={open}>
                <ListItemButton onClick={logout}> {/* Changed ListItem to ListItemButton */}
                    <ListItemIcon><LogoutIcon /></ListItemIcon>
                    {open && <ListItemText primary="Logout" />}
                </ListItemButton>
            </Tooltip>
        </StyledDrawer>
    );
};

export default Sidebar;