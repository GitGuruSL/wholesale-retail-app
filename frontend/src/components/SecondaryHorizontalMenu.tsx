import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Tooltip, Divider } from '@mui/material';
import { Add as AddIcon, FilterList as FilterListIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';

const SecondaryHorizontalMenu: React.FC = () => {
    const { menuProps } = useSecondaryMenu();

    if (!menuProps || !menuProps.pageTitle) {
        return null;
    }

    const {
        pageTitle,
        isFilterSidebarVisible,
        toggleFilterSidebar,
        isDetailsSidebarVisible,
        toggleDetailsSidebar,
        canCreateNew,
        createNewLink,
        createNewText = "Create New",
        contextualActions = [],
    } = menuProps;

    return (
        <AppBar
            position="fixed"
            color="default"
            elevation={1}
            sx={{
                top: '64px', // Adjust if your main menu is a different height
                zIndex: (theme) => theme.zIndex.appBar,
            }}
        >
            <Toolbar variant="dense">
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {pageTitle}
                </Typography>

                {contextualActions.map((action, index) => (
                    <Button
                        key={index}
                        color={action.color || 'inherit'}
                        startIcon={action.icon}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        sx={{ mr: 1 }}
                    >
                        {action.label}
                    </Button>
                ))}

                {canCreateNew && createNewLink && (
                    <Button
                        href={createNewLink}
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        sx={{ mr: 1 }}
                    >
                        {createNewText}
                    </Button>
                )}

                {toggleFilterSidebar && (
                    <Tooltip title={isFilterSidebarVisible ? "Hide Filters" : "Show Filters"}>
                        <IconButton color={isFilterSidebarVisible ? "primary" : "inherit"} onClick={toggleFilterSidebar}>
                            <FilterListIcon />
                        </IconButton>
                    </Tooltip>
                )}

                {toggleDetailsSidebar && (
                    <Tooltip title={isDetailsSidebarVisible ? "Hide Details" : "Show Details"}>
                        <IconButton color={isDetailsSidebarVisible ? "primary" : "inherit"} onClick={toggleDetailsSidebar}>
                            <InfoIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Toolbar>
            <Divider />
        </AppBar>
    );
};

export default SecondaryHorizontalMenu;