'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, archiveJob } from '@/lib/api/jobs';
import { fetchCandidates } from '@/lib/api/candidates';
import CandidateList from '@/components/CandidateList';
import KanbanBoard, { KANBAN_STAGES } from '@/components/KanbanBoard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, MapPin, Briefcase, Factory,
    Banknote, Calendar, LayoutGrid, List, Archive, CheckCircle2,
    Search, Filter, X, ChevronRight, User
} from 'lucide-react';

export default function JobDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

    // Filtering States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    const { data: jobs, isLoading: isJobsLoading } = useQuery({
        queryKey: ['jobs'],
        queryFn: fetchJobs
    });

    const { data: candidates, isLoading: isCandidatesLoading } = useQuery({
        queryKey: ['candidates', id],
        queryFn: () => fetchCandidates(id)
    });

    const archiveMutation = useMutation({
        mutationFn: () => archiveJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            router.push('/');
        }
    });

    const job = jobs?.find(j => j.id === id);

    const filteredCandidates = candidates?.filter(c => {
        const nameMatch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
        const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(c.status);
        return nameMatch && statusMatch;
    });

    if (isJobsLoading) return <div className="p-8 space-y-8 animate-pulse"><div className="h-8 bg-muted rounded w-1/4"></div><div className="h-96 bg-muted rounded"></div></div>;
    if (!job) return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Job not found</h2>
            <Button asChild variant="link" className="mt-4">
                <Link href="/">Return to Dashboard</Link>
            </Button>
        </div>
    );

    const allStatuses = Array.from(new Set(KANBAN_STAGES.flatMap(s => s.statuses)));

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            {/* Top Bar */}
            <div className="border-b bg-background/50 backdrop-blur-md px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild className="rounded-full">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black tracking-tight">{job.title}</h1>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">
                                {job.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.job_type}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-muted p-1 rounded-xl border shadow-inner mr-4">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`gap-2 rounded-lg h-8 px-3 transition-all ${viewMode === 'list' ? 'shadow-sm bg-background' : ''}`}
                        >
                            <List className="h-3.5 w-3.5" /> List
                        </Button>
                        <Button
                            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={`gap-2 rounded-lg h-8 px-3 transition-all ${viewMode === 'kanban' ? 'shadow-sm bg-background' : ''}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/5 gap-2 font-bold uppercase text-[10px] tracking-widest"
                        onClick={() => {
                            if (confirm('Are you sure you want to archive this job?')) {
                                archiveMutation.mutate();
                            }
                        }}
                        disabled={archiveMutation.isPending}
                    >
                        <Archive className="h-4 w-4" /> {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Workspace Sidebar */}
                <aside className="w-80 border-r bg-muted/10 flex flex-col shrink-0">
                    <div className="p-6 space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                                <Search className="h-3 w-3" /> Find Candidate
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Name or email..."
                                    className="pl-10 h-10 bg-background border-none shadow-sm focus-visible:ring-primary/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Filter className="h-3 w-3" /> Status Filter
                                </h3>
                                {selectedStatuses.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 text-[10px] text-primary font-bold hover:bg-transparent"
                                        onClick={() => setSelectedStatuses([])}
                                    >
                                        CLEAR
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {KANBAN_STAGES.map(stage => (
                                    <div key={stage.id} className="space-y-1 mb-4">
                                        <div className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">
                                            {stage.label}
                                        </div>
                                        {stage.statuses.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setSelectedStatuses(prev =>
                                                        prev.includes(status)
                                                            ? prev.filter(s => s !== status)
                                                            : [...prev, status]
                                                    );
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedStatuses.includes(status)
                                                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                    }`}
                                            >
                                                <span>{status}</span>
                                                {selectedStatuses.includes(status) && <CheckCircle2 className="h-3 w-3" />}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/40">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Job Statistics</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Total Applicants</span>
                                        <span className="font-bold">{candidates?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Qualified</span>
                                        <span className="font-bold text-green-500">{candidates?.filter(c => c.status === 'Qualified' || c.status === 'Hired').length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Workspace Area */}
                <main className="flex-1 bg-background relative overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto p-8 h-full custom-scrollbar">
                        {isCandidatesLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="h-48 bg-muted rounded-2xl"></div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {viewMode === 'list' ? (
                                    <CandidateList jobId={id} candidates={filteredCandidates} />
                                ) : (
                                    <KanbanBoard jobId={id} candidates={filteredCandidates || []} />
                                )}
                            </>
                        )}
                    </div>

                    {/* Shadow indicators for scrolling */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
                </main>
            </div>
        </div>
    );
}
