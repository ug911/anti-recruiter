import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs, JobPosting } from '../api/jobs';
import CandidateList from '../components/CandidateList';
import { Link } from 'react-router-dom';

const JobDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { data: jobs, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });

    // In a real app, we would have a specific fetchJobById endpoint
    // For now, find in list
    const job = jobs?.find(j => j.id === id);

    if (isLoading) return <div className="text-white p-8">Loading job...</div>;
    if (!job) return <div className="text-white p-8">Job not found.</div>;

    return (
        <div className="max-w-6xl mx-auto p-4">
            <Link to="/" className="text-gray-400 hover:text-white mb-6 inline-block">&larr; Back to Dashboard</Link>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
                        <div className="flex gap-4 text-gray-400 text-sm">
                            <span>📍 {job.location}</span>
                            <span>💼 {job.job_type || 'Full Time'}</span>
                            <span>🏭 {job.industry || 'IT'}</span>
                            {job.salary_range && <span>💰 {job.salary_range}</span>}
                        </div>
                    </div>
                    <span className="bg-green-900/30 text-green-400 border border-green-800 px-4 py-1 rounded-full text-sm">
                        In Progress
                    </span>
                </div>

                <hr className="border-gray-700 my-6" />

                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{job.description}</p>
            </div>

            <CandidateList jobId={id!} />
        </div>
    )
}

export default JobDetails;
