'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCandidates } from '@/lib/api/candidates';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Mail, Calendar, User } from 'lucide-react';

interface CandidateListProps {
    jobId: string;
}

export default function CandidateList({ jobId }: CandidateListProps) {
    const { data: candidates, isLoading, error } = useQuery({
        queryKey: ['candidates', jobId],
        queryFn: () => fetchCandidates(jobId),
    });

    if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-8 bg-muted rounded w-1/4"></div><div className="h-64 bg-muted rounded"></div></div>;
    if (error) return <div className="text-destructive p-4 border border-destructive/20 bg-destructive/10 rounded-lg">Error loading candidates.</div>;

    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" /> Candidates & Status
                </CardTitle>
                <Badge variant="outline" className="text-muted-foreground">{candidates?.length || 0} Total</Badge>
            </CardHeader>
            <CardContent>
                {!candidates || candidates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-lg">
                        No candidates have applied for this role yet.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[250px]">Candidate Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Applied Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {candidates.map((candidate) => (
                                    <TableRow key={candidate.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-semibold">
                                            {candidate.first_name} {candidate.last_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {candidate.email}</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {candidate.applied_date}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className="capitalize"
                                                variant={
                                                    candidate.status === 'Hired' ? 'default' :
                                                        candidate.status === 'Rejected' ? 'destructive' :
                                                            candidate.status === 'Interview' ? 'secondary' : 'outline'
                                                }
                                            >
                                                {candidate.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {candidate.resume_url && (
                                                <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                                                    <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="mr-2 h-4 w-4" /> Resume
                                                    </a>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
