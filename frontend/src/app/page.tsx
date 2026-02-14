'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs, JobPosting } from '@/lib/api/jobs';
import { usePortal } from '@/components/providers/portal-provider';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Briefcase, Factory, Building2, Archive, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { mode, selectedCompany } = usePortal();
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs
  });

  if (isLoading) return <div className="flex justify-center items-center h-64 text-muted-foreground animate-pulse">Loading jobs...</div>;
  if (error) return <div className="text-center text-destructive mt-10 p-8 border border-destructive/20 bg-destructive/10 rounded-xl">Error loading jobs. Please try again.</div>;

  // Filtering Logic
  const filteredJobs = jobs?.filter(job => {
    // Company match
    const companyMatch = mode === 'admin' || !selectedCompany || job.client_name === selectedCompany;

    // Status match (assume 'In-progress' is active, others archived for now)
    const isActive = job.status === 'In-progress';
    const statusMatch = statusFilter === 'active' ? isActive : !isActive;

    return companyMatch && statusMatch;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="px-2 py-0 text-[10px] font-bold uppercase tracking-tighter border-primary/30 text-primary">
              {mode === 'admin' ? 'Administrative Access' : `Vendor: ${selectedCompany || 'All'}`}
            </Badge>
          </div>
          <h1 className="text-5xl font-black tracking-tight flex items-center gap-3">
            {statusFilter === 'active' ? 'Active Jobs' : 'Archived Jobs'}
            <Badge className="text-xl px-3 py-0 rounded-lg">{filteredJobs?.length || 0}</Badge>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
            {mode === 'admin' ? 'Monitoring all recruitment activity across the platform.' : `Managed recruitment flow for ${selectedCompany || 'all associated vendors'}.`}
          </p>
        </div>

        <div className="flex gap-3 bg-muted/50 p-1.5 rounded-2xl border">
          <Button
            variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className={`gap-2 rounded-xl px-4 transition-all ${statusFilter === 'active' ? 'shadow-md bg-background' : ''}`}
          >
            <CheckCircle2 className="h-4 w-4" /> Active
          </Button>
          <Button
            variant={statusFilter === 'archived' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('archived')}
            className={`gap-2 rounded-xl px-4 transition-all ${statusFilter === 'archived' ? 'shadow-md bg-background' : ''}`}
          >
            <Archive className="h-4 w-4" /> Archived
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button asChild size="sm" className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Link href="/jobs/create">
              <Plus className="mr-1 h-4 w-4" /> Create New
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredJobs?.map((job: JobPosting) => (
          <Card key={job.id} className="group hover:border-primary/50 transition-all duration-500 relative overflow-hidden flex flex-col border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
            <Link href={`/jobs/${job.id}`} className="absolute inset-0 z-10" />
            <div className={`h-1.5 w-full bg-gradient-to-r ${job.status === 'In-progress' ? 'from-green-500 to-emerald-400' : 'from-slate-400 to-slate-500'}`} />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Building2 className="h-3 w-3" /> {job.client_name || 'Generic'}
                </div>
                <Badge variant={job.status === 'In-progress' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0">
                  {job.status === 'In-progress' ? 'Live' : job.status}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-extrabold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                {job.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-2 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {job.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground mb-6">
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"><Briefcase className="h-3 w-3" /> {job.job_type || 'Full Time'}</span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"><Factory className="h-3 w-3" /> {job.industry || 'IT'}</span>
              </div>
              <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed italic border-l-2 border-primary/20 pl-3">
                {job.description}
              </p>
            </CardContent>
            <CardFooter className="border-t border-border/40 py-5 flex justify-between items-center text-sm font-bold bg-muted/5">
              <span className="text-foreground tracking-tight">{job.salary_range || 'Salary TBD'}</span>
              <span className="text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                View Workspace <Plus className="h-4 w-4" />
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredJobs?.length === 0 && (
        <div className="text-center py-32 bg-muted/10 rounded-3xl border-2 border-dashed border-border/50 flex flex-col items-center">
          <div className="bg-primary/5 p-6 rounded-full mb-6">
            <Building2 className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
          <p className="text-muted-foreground text-2xl font-bold tracking-tight">No {statusFilter} jobs found.</p>
          <p className="text-muted-foreground/60 mb-8 max-w-sm mt-2">
            Try adjusting your filters or search criteria.
            {mode === 'vendor' && selectedCompany && ` Currently showing jobs for ${selectedCompany}.`}
          </p>
          <Button asChild variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
            <Link href="/jobs/create">Create New Job Posting</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
