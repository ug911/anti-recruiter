'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob, JobPosting } from '@/lib/api/jobs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function CreateJobPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<JobPosting>({
        title: '',
        location: '',
        salary_range: '',
        experience_required: '',
        description: '',
        industry: 'IT Services',
        job_type: 'Full Time',
        target_date: new Date().toISOString().split('T')[0]
    });

    const createJobMutation = useMutation({
        mutationFn: createJob,
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            router.push('/');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createJobMutation.mutate(formData);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>

            <header>
                <h1 className="text-4xl font-extrabold tracking-tight">Create Job Posting</h1>
                <p className="text-muted-foreground text-lg mt-2">Publish a new role and start receiving candidates.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card className="border-border/50 shadow-xl overflow-hidden">
                    <div className="h-2 bg-primary w-full" />
                    <CardHeader>
                        <CardTitle>Role Details</CardTitle>
                        <CardDescription>Enter the core information about the position you're hiring for.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Job Title</Label>
                                <Input
                                    id="title"
                                    required
                                    placeholder="e.g. Senior Software Engineer"
                                    value={formData.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    required
                                    placeholder="e.g. Bangalore, India (Remote)"
                                    value={formData.location}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Industry</Label>
                                <Select
                                    value={formData.industry}
                                    onValueChange={(val) => setFormData({ ...formData, industry: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IT Services">IT Services</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                                        <SelectItem value="Retail">Retail</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Job Type</Label>
                                <Select
                                    value={formData.job_type}
                                    onValueChange={(val) => setFormData({ ...formData, job_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full Time">Full Time</SelectItem>
                                        <SelectItem value="Part Time">Part Time</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target_date">Target Date</Label>
                                <Input
                                    id="target_date"
                                    type="date"
                                    value={formData.target_date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, target_date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="salary">Salary Range</Label>
                                <Input
                                    id="salary"
                                    placeholder="e.g. ₹20L - ₹30L per annum"
                                    value={formData.salary_range}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, salary_range: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="experience">Experience Required</Label>
                            <Input
                                id="experience"
                                placeholder="e.g. 5+ years in Node.js and React"
                                value={formData.experience_required}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, experience_required: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Job Description</Label>
                            <Textarea
                                id="description"
                                required
                                rows={8}
                                placeholder="Describe the role, responsibilities, and requirements..."
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end items-center gap-4">
                    <Button variant="outline" type="button" asChild>
                        <Link href="/">Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        disabled={createJobMutation.isPending}
                        className="px-10 h-12 text-lg font-bold"
                    >
                        {createJobMutation.isPending ? 'Publishing...' : (
                            <>
                                <Rocket className="mr-2 h-5 w-5" /> Publish Job
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
