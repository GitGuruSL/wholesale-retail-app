import React, { useState, useEffect, useRef } from 'react';
import {
    AppBar, Toolbar, Typography, Button, IconButton, Tooltip, Box,
    Menu, MenuItem, Divider, ListItemIcon, ListItemText, InputBase, TextField
} from '@mui/material';
import {
    FilterList as FilterListIcon,
    InfoOutlined as InfoIcon,
    Share as ShareIcon,
    ViewList as ViewListIcon,
    Fullscreen as FullscreenIcon,
    BookmarkBorder as BookmarkIcon,
    ArrowDropDown as ArrowDropDownIcon,
    Add as AddIcon, // Standard for "New"
    Search as SearchIcon,
    Refresh as RefreshIcon,
    DeleteOutline as DeleteIcon, // Standard for "Delete"
    FileCopyOutlined as FileCopyIcon,
    Close as CloseIcon, // For clearing search
} from '@mui/icons-material';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import { styled, alpha } from '@mui/material/styles';


const TOP_BAR_HEIGHT = 48;
const PRIMARY_NAV_HEIGHT = 64;
const CONTEXTUAL_MENU_HEIGHT = 48;

const SearchBox = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.black, 0.05),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.black, 0.08),
    },
    marginRight: theme.spacing(1),
    marginLeft: 0,
    width: 'auto',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(0.5),
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(0.75, 1, 0.75, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(0.5)})`, // Adjust if SearchIcon is inside
        transition: theme.transitions.create('width'),
        width: '12ch', // Initial width
        '&:focus': {
            width: '20ch', // Expanded width on focus
        },
    },
}));


const SecondaryHorizontalMenu: React.FC = () => {
    const { menuProps, setMenuProps } = useSecondaryMenu();
    const [anchorElements, setAnchorElements] = useState<Record<string, HTMLElement | null>>({});

    const [isSearchInputVisible, setIsSearchInputVisible] = useState(false);
    const [searchTextInternal, setSearchTextInternal] = useState(menuProps.initialSearchText || '');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSearchTextInternal(menuProps.initialSearchText || '');
    }, [menuProps.initialSearchText]);


    const handleMenuOpen = (actionId: string, event: React.MouseEvent<HTMLElement>) => {
        setAnchorElements(prev => ({ ...prev, [actionId]: event.currentTarget }));
    };

    const handleMenuClose = (actionId: string) => {
        setAnchorElements(prev => ({ ...prev, [actionId]: null }));
    };

    const handleSearchIconClick = () => {
        const newVisibility = !isSearchInputVisible;
        setIsSearchInputVisible(newVisibility);
        if (newVisibility) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        } else {
            // Optionally clear search text and submit when closing via icon click
            // if (searchTextInternal && menuProps.onSearchSubmit) {
            //     menuProps.onSearchSubmit(''); 
            // }
            // setSearchTextInternal('');
        }
    };

    const handleSearchCloseOnEscOrClear = () => {
        setIsSearchInputVisible(false);
        setSearchTextInternal('');
        if (menuProps.onSearchSubmit) {
            menuProps.onSearchSubmit('');
        }
    };
    
    const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTextInternal(event.target.value);
    };

    const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            if (menuProps.onSearchSubmit) {
                menuProps.onSearchSubmit(searchTextInternal);
            }
            // setIsSearchInputVisible(false); // Keep it open after search
        } else if (event.key === 'Escape') {
            handleSearchCloseOnEscOrClear();
        }
    };


    const {
        pageTitle = "Page",
        viewSelector,
        actions = [], 
        isFilterSidebarVisible,
        toggleFilterSidebar,
        isDetailsSidebarVisible,
        toggleDetailsSidebar,
        showFilter = true,
        showShare = true,
        showViewToggle = true,
        showInfo = true,
        showFullscreen = true,
        showBookmark = true,

        showNewAction,
        onNewActionClick,
        isNewActionEnabled,
        newActionLabel,
        newActionIcon = <AddIcon fontSize="small" />,

        showDeleteAction,
        onDeleteActionClick,
        isDeleteActionEnabled,
        deleteActionLabel,
        deleteActionIcon = <DeleteIcon fontSize="small" />,

        showSearchAction,
        searchPlaceholder,
        // onSearchSubmit is used in handlers

    } = menuProps;

    return (
        <AppBar
            position="fixed"
            color="default"
            elevation={0}
            sx={{
                top: `${TOP_BAR_HEIGHT + PRIMARY_NAV_HEIGHT}px`,
                height: `${CONTEXTUAL_MENU_HEIGHT}px`,
                zIndex: (theme) => theme.zIndex.appBar,
                backgroundColor: (theme) => theme.palette.background.paper,
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Toolbar variant="dense" sx={{ minHeight: CONTEXTUAL_MENU_HEIGHT, height: CONTEXTUAL_MENU_HEIGHT, paddingLeft: '12px', paddingRight: '12px' }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'normal', fontSize: '1rem', mr: 1, whiteSpace: 'nowrap' }}>
                    {pageTitle}
                </Typography>

                {/* Store Selector or Store Name Display */}
                {menuProps.storeSelectorComponent && (
                    <Box sx={{ ml: 2, minWidth: 200 }}>
                        {menuProps.storeSelectorComponent}
                    </Box>
                )}
                {menuProps.storeNameDisplay && (
                    <Box sx={{ ml: 2, minWidth: 200 }}>
                        {menuProps.storeNameDisplay}
                    </Box>
                )}

                {/* Divider after Page Title */}
                {(showSearchAction || showNewAction || showDeleteAction || (viewSelector && viewSelector.options.length > 0)) && (
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                )}

                {/* Standard Search Action - MOVED FIRST */}
                {showSearchAction && (
                    <>
                        {!isSearchInputVisible ? (
                            <Tooltip title="Search">
                                <IconButton onClick={handleSearchIconClick} size="small" color="inherit" sx={{ mx: 0.25 }}>
                                    <SearchIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <SearchBox sx={{ mx: 0.5 }}>
                                <IconButton onClick={handleSearchIconClick} size="small" sx={{ p: '2px', mr: 0.5 }}> 
                                    <SearchIcon fontSize="small" />
                                </IconButton>
                                <StyledInputBase
                                    inputRef={searchInputRef}
                                    placeholder={searchPlaceholder || "Search..."}
                                    value={searchTextInternal}
                                    onChange={handleSearchInputChange}
                                    onKeyDown={handleSearchKeyPress}
                                    autoFocus
                                />
                                <IconButton onClick={handleSearchCloseOnEscOrClear} size="small" sx={{ p: '2px'}}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </SearchBox>
                        )}
                    </>
                )}
                
                {viewSelector && (
                    <>
                        <Button
                            aria-haspopup="true"
                            onClick={(event) => handleMenuOpen(`viewSelector-${viewSelector.label || viewSelector.options[0]?.value || 'defaultView'}`, event)}
                            endIcon={<ArrowDropDownIcon />}
                            size="small"
                            sx={{ textTransform: 'none', mr: 1, ml: showSearchAction ? 0.5 : 0 }}
                            color="inherit"
                        >
                            {viewSelector.options.find(opt => opt.value === viewSelector.currentView)?.label || viewSelector.options[0]?.label || 'Select View'}
                        </Button>
                        <Menu
                            anchorEl={anchorElements[`viewSelector-${viewSelector.label || viewSelector.options[0]?.value || 'defaultView'}`]}
                            open={Boolean(anchorElements[`viewSelector-${viewSelector.label || viewSelector.options[0]?.value || 'defaultView'}`])}
                            onClose={() => handleMenuClose(`viewSelector-${viewSelector.label || viewSelector.options[0]?.value || 'defaultView'}`)}
                        >
                            {viewSelector.options.map(option => (
                                <MenuItem
                                    key={option.value}
                                    selected={option.value === viewSelector.currentView}
                                    onClick={() => {
                                        viewSelector.onChange(option.value);
                                        handleMenuClose(`viewSelector-${viewSelector.label || viewSelector.options[0]?.value || 'defaultView'}`);
                                    }}
                                >
                                    {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
                                    <ListItemText primary={option.label} />
                                </MenuItem>
                            ))}
                        </Menu>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    </>
                )}

                {/* Standard New Action - MOVED AFTER SEARCH */}
                {showNewAction && (
                    <Button
                        size="small"
                        startIcon={newActionIcon} // Icon only, label will be "+New"
                        onClick={onNewActionClick}
                        disabled={!isNewActionEnabled}
                        sx={{ textTransform: 'none', mx: 0.25, minWidth: 'auto', padding: '4px 8px' }} // Adjust padding for compact look
                        color="inherit"
                        aria-label={newActionLabel} // For accessibility
                    >
                        {newActionLabel} {/* This will be "+New" */}
                    </Button>
                )}

                {/* Standard Delete Action - MOVED AFTER NEW */}
                {showDeleteAction && (
                     <Tooltip title={!isDeleteActionEnabled ? (deleteActionLabel || "Delete") + " (disabled)" : (deleteActionLabel || "Delete")}>
                        <span> {/* Tooltip needs a span for disabled buttons */}
                            <Button
                                size="small"
                                startIcon={deleteActionIcon}
                                onClick={onDeleteActionClick}
                                disabled={!isDeleteActionEnabled}
                                sx={{ textTransform: 'none', mx: 0.25, minWidth: 'auto', padding: '4px 8px' }}
                                color="inherit" // Or "error" if appropriate
                                aria-label={deleteActionLabel || "Delete"}
                            >
                                {deleteActionLabel || "Delete"}
                            </Button>
                        </span>
                    </Tooltip>
                )}

                {/* Divider if any standard actions were shown and custom actions follow */}
                {((showSearchAction || showNewAction || showDeleteAction) || (viewSelector && viewSelector.options.length > 0)) && actions.length > 0 && (
                     <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                )}


                {/* Custom actions from menuProps.actions array */}
                {actions.map((action, index) => {
                    if (action.type === 'divider') {
                        return <Divider key={action.id || `divider-${index}`} orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
                    }
                    if (action.type === 'custom' && action.component) {
                        return <React.Fragment key={action.id || `custom-${index}`}>{action.component}</React.Fragment>;
                    }

                    if (action.type === 'iconButton') {
                        return (
                            <Tooltip title={action.tooltip || action.label || ''} key={action.id}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        color={action.color || 'inherit'}
                                        sx={{ mx: 0.25 }}
                                    >
                                        {action.icon}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        );
                    }

                    if (action.type === 'menuButton') {
                        return (
                            <React.Fragment key={action.id}>
                                <Button
                                    size="small"
                                    aria-controls={anchorElements[action.id] ? `${action.id}-menu` : undefined}
                                    aria-haspopup="true"
                                    aria-expanded={anchorElements[action.id] ? 'true' : undefined}
                                    onClick={(event) => {
                                        if (action.menuItems && action.menuItems.length > 0) {
                                            handleMenuOpen(action.id, event);
                                        }
                                        if (action.onClick) {
                                            action.onClick(event);
                                        }
                                    }}
                                    disabled={action.disabled}
                                    color={action.color || 'inherit'}
                                    variant={action.variant || 'text'}
                                    startIcon={(action.icon && !action.label) ? action.icon : undefined}
                                    endIcon={action.endIcon !== undefined ? action.endIcon : (action.menuItems && action.menuItems.length > 0 ? <ArrowDropDownIcon /> : undefined)}
                                    sx={{ textTransform: 'none', mx: 0.25, display: 'flex', alignItems: 'center' }}
                                >
                                     {action.icon && action.label && <Box component="span" sx={{ display: 'flex', mr: 0.5 }}>{action.icon}</Box>}
                                     {action.label}
                                </Button>
                                {action.menuItems && action.menuItems.length > 0 && (
                                    <Menu
                                        id={`${action.id}-menu`}
                                        anchorEl={anchorElements[action.id]}
                                        open={Boolean(anchorElements[action.id])}
                                        onClose={() => handleMenuClose(action.id)}
                                        MenuListProps={{ 'aria-labelledby': action.id }}
                                    >
                                        {action.menuItems.map(item => (
                                            <MenuItem key={item.id} onClick={() => { item.onClick(); handleMenuClose(action.id); }} disabled={item.disabled}>
                                                {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                                                <ListItemText primary={item.label} />
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                )}
                            </React.Fragment>
                        );
                    }
                    
                    return ( // Default 'button' type
                        <Button
                            key={action.id}
                            size="small"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            color={action.color || 'inherit'}
                            variant={action.variant || 'text'}
                            startIcon={action.icon}
                            sx={{ textTransform: 'none', mx: 0.25 }}
                        >
                           {action.label}
                        </Button>
                    );
                })}

                <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}

                {/* Far-right icons (existing logic - unchanged) */}
                {showShare && (
                    <Tooltip title="Share">
                        <IconButton color="inherit" size="small" sx={{ ml: 0.5 }}>
                            <ShareIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {showFilter && (
                    <Tooltip title={!toggleFilterSidebar ? "Filter (not available)" : isFilterSidebarVisible ? "Hide Filters" : "Show Filters"}>
                        <span>
                            <IconButton
                                color={toggleFilterSidebar && isFilterSidebarVisible ? "primary" : "inherit"}
                                onClick={toggleFilterSidebar}
                                disabled={!toggleFilterSidebar}
                                size="small" sx={{ ml: 0.5 }}
                            >
                                <FilterListIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
                {showViewToggle && ( // This might be conditional on viewSelector presence
                    <Tooltip title="Toggle View">
                        <IconButton color="inherit" size="small" sx={{ ml: 0.5 }}>
                            <ViewListIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                 {showInfo && (
                     menuProps.onInfoClick ? (
                        <Tooltip title={menuProps.isInfoActionEnabled ? (menuProps.pageTitle === "Manage Warranties" ? "View Warranty Details" : "View Details") : "Select an item to view details"}>
                            <span>
                                <IconButton
                                    color="inherit"
                                    onClick={menuProps.onInfoClick}
                                    disabled={!menuProps.isInfoActionEnabled}
                                    size="small" sx={{ ml: 0.5 }}
                                >
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    ) : toggleDetailsSidebar ? ( 
                        <Tooltip title={isDetailsSidebarVisible ? "Hide Details" : "Show Details"}>
                            <IconButton
                                color={isDetailsSidebarVisible ? "primary" : "inherit"}
                                onClick={toggleDetailsSidebar}
                                size="small" sx={{ ml: 0.5 }}
                            >
                                <InfoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : ( 
                        <Tooltip title="Information (not available)">
                            <IconButton color="inherit" size="small" sx={{ ml: 0.5 }} disabled>
                                <InfoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )
                )}
                {showFullscreen && (
                    <Tooltip title="Fullscreen">
                        <IconButton color="inherit" size="small" sx={{ ml: 0.5 }}>
                            <FullscreenIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {showBookmark && (
                    <Tooltip title="Bookmark">
                        <IconButton color="inherit" size="small" sx={{ ml: 0.5 }}>
                            <BookmarkIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default SecondaryHorizontalMenu;