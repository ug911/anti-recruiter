'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCandidateById } from '@/lib/api/candidates';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft, Mail, Phone, Calendar, Briefcase, GraduationCap,
    Link as LinkIcon, FileText, User, MapPin, ExternalLink
} from 'lucide-react';

export default function CandidatePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const cid = params.cid as string;

    const { data: candidate, isLoading, error } = useQuery({
        queryKey: ['candidate', cid],
        queryFn: () => fetchCandidateById(id, cid),
    });

    if (isLoading) return (
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
            <div className="h-10 bg-muted rounded w-1/4"></div>
            <div className="h-[600px] bg-muted rounded-2xl"></div>
        </div>
    );

    if (error || !candidate) return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-destructive">Candidate not found</h2>
            <Button variant="link" onClick={() => router.back()} className="mt-4">
                Go Back
            </Button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 hover:bg-muted group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Job Workspace
            </Button>

            <Card className="border-border/40 shadow-2xl overflow-hidden rounded-3xl">
                <div className="h-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 w-full" />
                <CardHeader className="p-10 pb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="flex gap-6 items-start">
                            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner">
                                <User className="h-12 w-12 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-5xl font-black tracking-tight text-foreground">
                                    {candidate.First_Name} {candidate.Last_Name}
                                </h1>
                                <div className="flex flex-wrap gap-6 text-muted-foreground font-bold text-sm uppercase tracking-wider">
                                    <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {candidate.Email}</span>
                                    <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {candidate.Phone || candidate.Mobile || 'N/A'}</span>
                                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {candidate.City || 'Remote'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-4 self-stretch md:self-auto justify-between">
                            <Badge className="px-6 py-2 text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                                {candidate.Application_Status || 'Applied'}
                            </Badge>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                                <Calendar className="h-3.5 w-3.5" /> Synchronized {new Date(candidate.Modified_Time).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-10 pt-4 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="md:col-span-2 space-y-12">
                            {/* Experience Section */}
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                                    <div className="h-1.5 w-8 bg-primary rounded-full" /> Professional Background
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-muted/30 p-8 rounded-3xl border border-border/50 hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-2">Current Role</p>
                                        <p className="font-extrabold text-xl leading-tight">{candidate.Current_Job_Title || 'Freelancer / Independent'}</p>
                                    </div>
                                    <div className="bg-muted/30 p-8 rounded-3xl border border-border/50 hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-2">Experience</p>
                                        <p className="font-extrabold text-3xl leading-tight">{candidate.Experience_in_Years || '0'}<span className="text-sm ml-1 text-muted-foreground uppercase">Years</span></p>
                                    </div>
                                    <div className="bg-muted/30 p-8 rounded-3xl border border-border/50 sm:col-span-2 hover:bg-muted/50 transition-colors">
                                        <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-2">Current Employer</p>
                                        <p className="font-extrabold text-xl">{candidate.Current_Employer || 'Self-Employed'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Summary Section */}
                            {candidate.Additional_Info && (
                                <section>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                                        <div className="h-1.5 w-8 bg-primary rounded-full" /> Executive Summary
                                    </h3>
                                    <div className="bg-primary/5 p-10 rounded-3xl border border-primary/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 text-primary/10 group-hover:text-primary/20 transition-colors">
                                            <FileText className="h-20 w-20" />
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed text-lg font-medium relative z-10 italic">
                                            "{candidate.Additional_Info}"
                                        </p>
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="space-y-12">
                            {/* Skills Section */}
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                                    Expertise
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {candidate.Skill_Set ? candidate.Skill_Set.split(',').map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="bg-background border px-4 py-2 font-bold text-xs uppercase tracking-tight rounded-xl">
                                            {skill.trim()}
                                        </Badge>
                                    )) : <p className="text-muted-foreground italic text-sm">No skills listed.</p>}
                                </div>
                            </section>

                            {/* Education Section */}
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                                    Education
                                </h3>
                                <div className="bg-muted/20 p-6 rounded-2xl border border-dashed hover:border-primary/50 transition-colors">
                                    <GraduationCap className="h-6 w-6 text-primary mb-4" />
                                    <p className="font-black text-lg leading-tight">{candidate.Highest_Qualification_Held || 'Qualification info unavailable'}</p>
                                </div>
                            </section>

                            {/* Attachments Section */}
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                                    Documents
                                </h3>
                                {candidate.resume_url ? (
                                    <Button size="lg" className="w-full h-16 rounded-2xl gap-3 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" asChild>
                                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                                            <FileText className="h-6 w-6" /> Open Resume <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                ) : (
                                    <div className="p-8 border-2 border-dashed rounded-3xl text-center space-y-3 bg-muted/5 opacity-60">
                                        <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No Resume Found</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
