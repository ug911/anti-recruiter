'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type PortalMode = 'admin' | 'vendor';

interface PortalContextType {
    mode: PortalMode;
    setMode: (mode: PortalMode) => void;
    selectedCompany: string | null;
    setSelectedCompany: (company: string | null) => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<PortalMode>('admin');
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('portal_mode') as PortalMode;
        const savedCompany = localStorage.getItem('portal_company');
        if (savedMode) setMode(savedMode);
        if (savedCompany) setSelectedCompany(savedCompany === 'null' ? null : savedCompany);
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('portal_mode', mode);
        localStorage.setItem('portal_company', String(selectedCompany));
    }, [mode, selectedCompany]);

    return (
        <PortalContext.Provider value={{ mode, setMode, selectedCompany, setSelectedCompany }}>
            {children}
        </PortalContext.Provider>
    );
}

export function usePortal() {
    const context = useContext(PortalContext);
    if (context === undefined) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
}
