'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/lib/api/jobs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { usePortal } from '@/components/providers/portal-provider';
import {
    Building2,
    ChevronDown,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    UserCircle
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Header() {
    const { mode, setMode, selectedCompany, setSelectedCompany } = usePortal();

    const { data: jobs } = useQuery({
        queryKey: ['jobs'],
        queryFn: fetchJobs,
        staleTime: 60000 // Cache for 1 minute
    });

    // Extract unique company names
    const companies = Array.from(new Set(jobs?.map(j => j.client_name).filter(Boolean))) as string[];

    return (
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <LayoutDashboard className="text-white h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                            Anti-Recruiter
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center bg-muted/50 p-1 rounded-xl border">
                        <Button
                            variant={mode === 'admin' ? 'secondary' : 'ghost'}
                            onClick={() => setMode('admin')}
                            className={`gap-2 rounded-lg transition-all ${mode === 'admin' ? 'shadow-sm bg-background' : ''}`}
                            size="sm"
                        >
                            <ShieldCheck className="h-4 w-4" /> Admin Portal
                        </Button>
                        <Button
                            variant={mode === 'vendor' ? 'secondary' : 'ghost'}
                            onClick={() => setMode('vendor')}
                            className={`gap-2 rounded-lg transition-all ${mode === 'vendor' ? 'shadow-sm bg-background' : ''}`}
                            size="sm"
                        >
                            <Building2 className="h-4 w-4" /> Vendor View
                        </Button>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {mode === 'vendor' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Company:</span>
                            <Select
                                value={selectedCompany || 'all'}
                                onValueChange={(val) => setSelectedCompany(val === 'all' ? null : val)}
                            >
                                <SelectTrigger className="w-[180px] h-10 bg-muted/30 border-none shadow-none focus:ring-primary/20">
                                    <SelectValue placeholder="Select Company" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vendors</SelectItem>
                                    {companies.map(company => (
                                        <SelectItem key={company} value={company}>{company}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="h-8 w-px bg-border mx-2" />

                    <ThemeToggle />

                    <Button variant="outline" size="icon" className="rounded-full lg:hidden">
                        <ChevronDown className="h-5 w-5" />
                    </Button>

                    <Button size="icon" variant="ghost" className="rounded-full hidden sm:flex">
                        <UserCircle className="h-6 w-6 text-muted-foreground" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
