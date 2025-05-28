import React, { createContext, useState, useContext, ReactNode } from 'react';

interface FilterDrawerContextType {
    isOpen: boolean;
    title: string;
    content: ReactNode | null;
    openDrawer: (newTitle: string, newContent: ReactNode) => void;
    closeDrawer: () => void;
    toggleDrawer: (newTitle?: string, newContent?: ReactNode) => void;
}

const FilterDrawerContext = createContext<FilterDrawerContextType | undefined>(undefined);

export const FilterDrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState<string>('Filters');
    const [content, setContent] = useState<ReactNode | null>(null);

    const openDrawer = (newTitle: string, newContent: ReactNode) => {
        setTitle(newTitle);
        setContent(newContent);
        setIsOpen(true);
    };

    const closeDrawer = () => {
        setIsOpen(false);
        // Optionally reset title and content when closing
        // setTitle('Filters');
        // setContent(null);
    };

    const toggleDrawer = (newTitle?: string, newContent?: ReactNode) => {
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer(newTitle || 'Filters', newContent || <p>No filter content provided.</p>);
        }
    };

    return (
        <FilterDrawerContext.Provider value={{ isOpen, title, content, openDrawer, closeDrawer, toggleDrawer }}>
            {children}
        </FilterDrawerContext.Provider>
    );
};

export const useFilterDrawer = () => {
    const context = useContext(FilterDrawerContext);
    if (context === undefined) {
        throw new Error('useFilterDrawer must be used within a FilterDrawerProvider');
    }
    return context;
};