'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJobs, JobPosting } from '@/lib/api/jobs';
import CandidateList from '@/components/CandidateList';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Briefcase, Factory, Banknote, Calendar } from 'lucide-react';

export default function JobDetailsPage() {
    const params = useParams();
    const id = params.id as string;

    const { data: jobs, isLoading } = useQuery({
        queryKey: ['jobs'],
        queryFn: fetchJobs
    });

    const job = jobs?.find(j => j.id === id);

    if (isLoading) return <div className="space-y-8 animate-pulse"><div className="h-8 bg-muted rounded w-1/4"></div><div className="h-96 bg-muted rounded"></div></div>;
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
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>

            <Card className="border-border/50 shadow-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 w-full" />
                <CardHeader className="pb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                            <CardTitle className="text-4xl font-extrabold tracking-tight">{job.title}</CardTitle>
                            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm font-medium">
                                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.job_type || 'Full Time'}</span>
                                <span className="flex items-center gap-1.5"><Factory className="h-4 w-4" /> {job.industry || 'IT'}</span>
                                <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4" /> {job.salary_range || 'Salary TBD'}</span>
                            </div>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-4 py-1.5 text-sm font-bold uppercase tracking-wider">
                            In Progress
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" /> Job Description
                                </h3>
                                <div className="bg-muted/30 p-6 rounded-xl border">
                                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Quick Specs</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Experience</span>
                                        <span className="text-foreground font-medium">{job.experience_required || 'Not specified'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Target Date</span>
                                        <span className="text-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {job.target_date || 'Ongoing'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <CandidateList jobId={id} />
                </CardContent>
            </Card>
        </div>
    );
}
