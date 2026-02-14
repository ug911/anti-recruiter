'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, archiveJob } from '@/lib/api/jobs';
import { fetchCandidates } from '@/lib/api/candidates';
import CandidateList from '@/components/CandidateList';
import KanbanBoard from '@/components/KanbanBoard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, MapPin, Briefcase, Factory,
    Banknote, Calendar, LayoutGrid, List, Archive, CheckCircle2
} from 'lucide-react';

export default function JobDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

    if (isJobsLoading) return <div className="space-y-8 animate-pulse"><div className="h-8 bg-muted rounded w-1/4"></div><div className="h-96 bg-muted rounded"></div></div>;
    if (!job) return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Job not found</h2>
            <Button asChild variant="link" className="mt-4">
                <Link href="/">Return to Dashboard</Link>
            </Button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <Button variant="ghost" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>

                <div className="flex items-center gap-4">
                    <div className="flex bg-muted p-1 rounded-lg border shadow-inner">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`gap-2 rounded-md transition-all ${viewMode === 'list' ? 'shadow-sm bg-background' : ''}`}
                        >
                            <List className="h-4 w-4" /> List
                        </Button>
                        <Button
                            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={`gap-2 rounded-md transition-all ${viewMode === 'kanban' ? 'shadow-sm bg-background' : ''}`}
                        >
                            <LayoutGrid className="h-4 w-4" /> Kanban
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        className="text-destructive border-destructive/20 hover:bg-destructive/5 gap-2 shadow-sm"
                        onClick={() => {
                            if (confirm('Are you sure you want to archive this job?')) {
                                archiveMutation.mutate();
                            }
                        }}
                        disabled={archiveMutation.isPending}
                    >
                        <Archive className="h-4 w-4" /> {archiveMutation.isPending ? 'Archiving...' : 'Archive Job'}
                    </Button>
                </div>
            </div>

            <Card className="border-border/50 shadow-xl overflow-hidden rounded-2xl">
                <div className={`h-2 w-full bg-gradient-to-r ${job.status === 'In-progress' ? 'from-purple-500 to-blue-500' : 'from-slate-400 to-slate-500'}`} />
                <CardHeader className="pb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                            <CardTitle className="text-4xl font-extrabold tracking-tight underline decoration-primary/20 decoration-4">{job.title}</CardTitle>
                            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm font-bold uppercase tracking-wide">
                                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {job.location}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-primary" /> {job.job_type || 'Full Time'}</span>
                                <span className="flex items-center gap-1.5"><Factory className="h-4 w-4 text-primary" /> {job.industry || 'IT'}</span>
                                <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4 text-primary" /> {job.salary_range || 'Salary TBD'}</span>
                            </div>
                        </div>
                        <Badge className={`px-4 py-1.5 text-sm font-black uppercase tracking-widest border-2 ${job.status === 'In-progress' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {job.status === 'In-progress' ? (
                                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> In Progress</span>
                            ) : (
                                <span className="flex items-center gap-2"><Archive className="h-4 w-4" /> {job.status}</span>
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                                    <div className="h-4 w-1 bg-primary rounded-full" /> Job Description
                                </h3>
                                <div className="bg-muted/20 p-8 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/20 transition-colors">
                                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed italic">{job.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-inner">
                                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Quick Specs</h3>
                                <div className="space-y-5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Experience Range</span>
                                        <span className="text-foreground font-black text-lg">{job.experience_required || 'Not specified'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Target Date</span>
                                        <span className="text-foreground font-bold flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-primary" /> {job.target_date || 'Ongoing'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-10">
                        {isCandidatesLoading ? (
                            <div className="space-y-8 animate-pulse"><div className="h-8 bg-muted rounded w-1/4"></div><div className="h-[400px] bg-muted rounded-2xl"></div></div>
                        ) : viewMode === 'list' ? (
                            <CandidateList jobId={id} />
                        ) : (
                            <KanbanBoard jobId={id} candidates={candidates || []} />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
