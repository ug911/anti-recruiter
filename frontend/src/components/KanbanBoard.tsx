'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Candidate, updateCandidateStatus } from '@/lib/api/candidates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Calendar, User, MoreHorizontal, FileText, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useRouter } from 'next/navigation';

interface KanbanBoardProps {
    jobId: string;
    candidates: Candidate[];
}

export const KANBAN_STAGES = [
    { id: 'Screening', label: 'Screening', statuses: ['In Review', 'Qualified', 'Junk candidate', 'Associated', 'Applied'], color: 'blue' },
    { id: 'Submissions', label: 'Submissions', statuses: ['Submitted to client', 'Approved by client'], color: 'purple' },
    { id: 'Interview', label: 'Interview', statuses: ['Interview to be scheduled', 'Interview-Scheduled', 'Interview in progress', 'On hold', 'Rejected hirable'], color: 'orange' },
    { id: 'Offered', label: 'Offered', statuses: ['Offer planned', 'Offer accepted', 'Offer made', 'Offer declined', 'Offer withdrawn'], color: 'yellow' },
    { id: 'Hired', label: 'Hired', statuses: ['Hired', 'Joined', 'No show', 'Converted - Employee', 'Converted - Temp', 'Hired by client', 'Hired-for-Interview', 'Forward-to-Onboarding'], color: 'green' },
    { id: 'Rejected', label: 'Rejected', statuses: ['Unqualified', 'Rejected by client', 'Rejected for interview', 'Rejected'], color: 'red' },
    { id: 'Archived', label: 'Archived', statuses: ['Archived'], color: 'gray' }
];

export default function KanbanBoard({ jobId, candidates }: KanbanBoardProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: ({ candidateId, status }: { candidateId: string, status: string }) =>
            updateCandidateStatus(jobId, candidateId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
        }
    });

    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.setData('candidateId', id);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, stageId: string) => {
        const candidateId = e.dataTransfer.getData('candidateId');
        const stage = KANBAN_STAGES.find(s => s.id === stageId);
        if (stage && candidateId) {
            // Default to the first status of the stage
            mutation.mutate({ candidateId, status: stage.statuses[0] });
        }
        setDraggingId(null);
    };

    const getCandidateStage = (status: string) => {
        return KANBAN_STAGES.find(stage => stage.statuses.includes(status))?.id || 'Screening';
    };

    const getStageColor = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-500',
            purple: 'bg-purple-500',
            orange: 'bg-orange-500',
            yellow: 'bg-yellow-500',
            green: 'bg-green-500',
            red: 'bg-red-500',
            gray: 'bg-slate-500'
        };
        return colors[color] || 'bg-primary';
    };

    return (
        <div className="flex gap-6 overflow-x-auto pb-8 min-h-[70vh] custom-scrollbar">
            {KANBAN_STAGES.map((stage) => {
                const stageCandidates = candidates.filter(c => getCandidateStage(c.status) === stage.id);

                return (
                    <div
                        key={stage.id}
                        className="flex-shrink-0 w-80 flex flex-col gap-4"
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, stage.id)}
                    >
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${getStageColor(stage.color)} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                                <h3 className="font-bold text-xs uppercase tracking-[0.15em] text-muted-foreground/80">{stage.label}</h3>
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-bold bg-muted/50">{stageCandidates.length}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50 rounded-lg">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground/50" />
                            </Button>
                        </div>

                        <div className={`flex-1 rounded-2xl bg-muted/5 border-2 border-dashed p-3 transition-all duration-300 ${draggingId ? 'border-primary/20 bg-primary/5 scale-[1.02]' : 'border-transparent'}`}>
                            <div className="flex flex-col gap-3">
                                {stageCandidates.map((candidate) => {
                                    const isUpdating = mutation.isPending && mutation.variables?.candidateId === candidate.id;

                                    return (
                                        <div
                                            key={candidate.id}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, candidate.id)}
                                            onClick={() => router.push(`/jobs/${jobId}/candidates/${candidate.id}`)}
                                            className={`bg-background border border-border/50 shadow-sm rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden active:scale-95 ${isUpdating ? 'opacity-50 grayscale' : ''}`}
                                        >
                                            {isUpdating && (
                                                <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}

                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Badge variant="outline" className="text-[9px] font-bold bg-background/80 backdrop-blur-sm uppercase tracking-tighter">
                                                    {candidate.status}
                                                </Badge>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                                                        <User className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    <span className="font-bold text-sm tracking-tight text-foreground/90">{candidate.first_name} {candidate.last_name}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                                                        <Mail className="h-3 w-3 opacity-60" /> {candidate.email || 'No email'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                                                        <Calendar className="h-3 w-3 opacity-60" /> {candidate.applied_date}
                                                    </div>
                                                </div>

                                                <div className="pt-3 flex justify-between items-center border-t border-border/30">
                                                    <div className="flex gap-1">
                                                        {candidate.resume_url && (
                                                            <div className="bg-green-500/5 p-1 rounded-md">
                                                                <FileText className="h-3 w-3 text-green-500/60" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground/70 font-black uppercase tracking-widest group-hover:text-primary transition-colors">Details →</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {stageCandidates.length === 0 && !draggingId && (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/10 rounded-xl space-y-2">
                                        <div className="p-2 bg-muted/20 rounded-full">
                                            <LayoutGrid className="h-4 w-4 text-muted-foreground/30" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">No candidates</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
