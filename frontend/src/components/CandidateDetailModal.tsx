'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCandidateById } from '@/lib/api/candidates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    X, Mail, Phone, Calendar, Briefcase, GraduationCap,
    Link as LinkIcon, FileText, User, MapPin
} from 'lucide-react';

interface CandidateDetailModalProps {
    jobId: string;
    candidateId: string;
    onClose: () => void;
}

export default function CandidateDetailModal({ jobId, candidateId, onClose }: CandidateDetailModalProps) {
    const { data: candidate, isLoading, error } = useQuery({
        queryKey: ['candidate', candidateId],
        queryFn: () => fetchCandidateById(jobId, candidateId),
    });

    if (!candidateId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-background w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border/50 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Candidate Profile</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="p-8">
                    {isLoading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-12 bg-muted rounded w-1/3"></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="h-32 bg-muted rounded"></div>
                                <div className="h-32 bg-muted rounded"></div>
                            </div>
                            <div className="h-48 bg-muted rounded"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-destructive font-medium">Error loading candidate details.</p>
                            <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {/* Hero Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-extrabold tracking-tight">
                                        {candidate.First_Name} {candidate.Last_Name}
                                    </h1>
                                    <div className="flex flex-wrap gap-4 text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {candidate.Email || 'No email provided'}</span>
                                        <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {candidate.Phone || candidate.Mobile || 'No phone provided'}</span>
                                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {candidate.City || 'Location N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <Badge variant="secondary" className="px-4 py-1.5 text-sm font-bold uppercase tracking-wider">
                                        {candidate.Application_Status || candidate.Candidate_Stage || 'Applied'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Updated {new Date(candidate.Modified_Time).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" /> Professional Experience
                                        </h3>
                                        <div className="bg-muted/30 p-5 rounded-xl border border-border/50 space-y-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Current Title</p>
                                                <p className="font-semibold text-lg">{candidate.Current_Job_Title || 'Not specified'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Years of Experience</p>
                                                <p className="font-semibold text-lg">{candidate.Experience_in_Years || '0'} Years</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Current Employer</p>
                                                <p className="font-semibold">{candidate.Current_Employer || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4" /> Education
                                        </h3>
                                        <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
                                            <p className="font-semibold text-lg">{candidate.Highest_Qualification_Held || 'Degree not listed'}</p>
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                            <FileText className="h-4 w-4" /> Skills & Expertise
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.Skill_Set ? candidate.Skill_Set.split(',').map((skill: string) => (
                                                <Badge key={skill} variant="outline" className="bg-background px-3 py-1 font-medium">{skill.trim()}</Badge>
                                            )) : <p className="text-muted-foreground italic text-sm">No skills listed.</p>}
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                            <LinkIcon className="h-4 w-4" /> Links & Attachments
                                        </h3>
                                        <div className="space-y-3">
                                            {candidate.resume_url ? (
                                                <Button variant="outline" className="w-full justify-start gap-2 h-12" asChild>
                                                    <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="h-5 w-5 text-blue-500" /> View Resume (PDF)
                                                    </a>
                                                </Button>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic border-2 border-dashed rounded-lg p-4 text-center">No resume attached.</p>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Additional Info */}
                            {candidate.Additional_Info && (
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Summary & Notes</h3>
                                    <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                                        <p className="text-muted-foreground leading-relaxed italic">"{candidate.Additional_Info}"</p>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
