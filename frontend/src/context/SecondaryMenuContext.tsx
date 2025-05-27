import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';

export interface PageContextualMenuProps {
    pageTitle?: string;
    isFilterSidebarVisible?: boolean;
    toggleFilterSidebar?: () => void;
    isDetailsSidebarVisible?: boolean;
    toggleDetailsSidebar?: () => void;
    selectedItemForDetails?: any | null;
    canCreateNew?: boolean;
    createNewLink?: string;
    createNewText?: string;
    contextualActions?: Array<{
        label: string;
        icon?: React.ReactElement;
        onClick: () => void;
        disabled?: boolean;
        color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    }>;
}

interface SecondaryMenuContextType {
    menuProps: PageContextualMenuProps;
    setMenuProps: Dispatch<SetStateAction<PageContextualMenuProps>>;
}

const SecondaryMenuContext = createContext<SecondaryMenuContextType | undefined>(undefined);

export const SecondaryMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [menuProps, setMenuProps] = useState<PageContextualMenuProps>({});

    return (
        <SecondaryMenuContext.Provider value={{ menuProps, setMenuProps }}>
            {children}
        </SecondaryMenuContext.Provider>
    );
};

export const useSecondaryMenu = (): SecondaryMenuContextType => {
    const context = useContext(SecondaryMenuContext);
    if (!context) {
        throw new Error('useSecondaryMenu must be used within a SecondaryMenuProvider');
    }
    return context;
};