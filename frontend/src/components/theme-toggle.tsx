'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/theme-provider';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === 'light' ? (
                <Moon className="h-5 w-5 text-slate-700" />
            ) : (
                <Sun className="h-5 w-5 text-yellow-400" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
