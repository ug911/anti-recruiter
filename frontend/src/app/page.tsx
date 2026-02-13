'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJobs, JobPosting } from '@/lib/api/jobs';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Briefcase, Factory } from 'lucide-react';

export default function Dashboard() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs
  });

  if (isLoading) return <div className="flex justify-center items-center h-64 text-muted-foreground animate-pulse">Loading jobs...</div>;
  if (error) return <div className="text-center text-destructive mt-10 p-8 border border-destructive/20 bg-destructive/10 rounded-xl">Error loading jobs. Please try again.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage your active job postings and recruitment flow.</p>
        </div>
        <Button asChild size="lg" className="shadow-lg shadow-primary/20">
          <Link href="/jobs/create">
            <Plus className="mr-2 h-5 w-5" /> Create New Job
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job: JobPosting) => (
          <Card key={job.id} className="group hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
            <Link href={`/jobs/${job.id}`} className="absolute inset-0 z-10" />
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="group-hover:text-primary transition-colors line-clamp-1">{job.title}</CardTitle>
                <Badge variant="secondary">Active</Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4" /> {job.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.job_type || 'Full Time'}</span>
                <span className="flex items-center gap-1"><Factory className="h-3 w-3" /> {job.industry || 'IT'}</span>
              </div>
              <p className="text-muted-foreground line-clamp-3 text-sm">{job.description}</p>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between items-center text-sm font-medium">
              <span className="text-muted-foreground">{job.salary_range || 'Salary TBD'}</span>
              <span className="text-primary group-hover:translate-x-1 transition-transform">View Details →</span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {jobs?.length === 0 && (
        <div className="text-center py-24 bg-card/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-xl font-medium">No job postings found.</p>
          <p className="text-muted-foreground mb-6">Start by creating your first job and automate your hiring.</p>
          <Button asChild variant="outline">
            <Link href="/jobs/create">Create your first job</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
