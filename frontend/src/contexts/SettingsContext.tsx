import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface SettingsContextType {
    settings: AppSettings;
    saveSettings: (newSettings: AppSettings) => void;
    updateSettings: (partialSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            // Updated key to v5 to ensure new default glossary is loaded
            // Note: Keeping the key 'archerdoc-ai-settings-v1' as seen in App.tsx to maintain backward compatibility
            const saved = localStorage.getItem('archerdoc-ai-settings-v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    configs: {
                        ...DEFAULT_SETTINGS.configs,
                        ...parsed.configs
                    }
                };
            }
        } catch (e) {
            console.warn("Failed to load settings", e);
        }
        return DEFAULT_SETTINGS;
    });

    const saveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('archerdoc-ai-settings-v1', JSON.stringify(newSettings));
    };

    const updateSettings = (partialSettings: Partial<AppSettings>) => {
        const newSettings = { ...settings, ...partialSettings };
        saveSettings(newSettings);
    };

    return (
        <SettingsContext.Provider value={{ settings, saveSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
