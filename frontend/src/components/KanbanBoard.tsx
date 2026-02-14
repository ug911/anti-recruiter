'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Candidate, updateCandidateStatus } from '@/lib/api/candidates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Calendar, User, MoreHorizontal, FileText } from 'lucide-react';
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

    return (
        <div className="flex gap-6 overflow-x-auto pb-8 min-h-[70vh]">
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
                                <div className={`w-3 h-3 rounded-full bg-${stage.color}-500`} />
                                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{stage.label}</h3>
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{stageCandidates.length}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        <div className={`flex-1 rounded-xl bg-muted/20 border-2 border-dashed p-3 transition-colors ${draggingId ? 'border-primary/20 bg-primary/5' : 'border-transparent'}`}>
                            <div className="flex flex-col gap-3">
                                {stageCandidates.map((candidate) => (
                                    <div
                                        key={candidate.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, candidate.id)}
                                        onClick={() => router.push(`/jobs/${jobId}/candidates/${candidate.id}`)}
                                        className="bg-background border shadow-sm rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group relative overflow-hidden active:scale-95 active:rotate-1"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur-sm">
                                                {candidate.status}
                                            </Badge>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-1.5 rounded-full">
                                                    <User className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">{candidate.first_name} {candidate.last_name}</span>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                    <Mail className="h-3 w-3" /> {candidate.email || 'No email'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                    <Calendar className="h-3 w-3" /> Applied {candidate.applied_date}
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-between items-center bg-t">
                                                <div className="flex gap-1">
                                                    {candidate.resume_url && <FileText className="h-3 w-3 text-primary/60" />}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">View Details →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {stageCandidates.length === 0 && !draggingId && (
                                    <div className="py-10 text-center text-xs text-muted-foreground italic border border-dashed rounded-lg">
                                        No candidates here
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
