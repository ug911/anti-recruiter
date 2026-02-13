import { useQuery } from '@tanstack/react-query';
import { fetchJobs, JobPosting } from '../api/jobs';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { data: jobs, isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });

    if (isLoading) return <div className="text-center text-gray-400 mt-10">Loading jobs...</div>;
    if (error) return <div className="text-center text-red-500 mt-10">Error loading jobs</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 mt-1">Manage your active job postings</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={() => window.location.href = "http://localhost:8000/auth/zoho/login"}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Connect Zoho Recruit
                    </button>
                    <Link
                        to="/create-job"
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20"
                    >
                        + Create Job
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs?.map((job: JobPosting) => (
                    <div key={job.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors group relative">
                        <Link to={`/jobs/${job.id}`} className="absolute inset-0 z-10" />
                        <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors relative z-0">{job.title}</h3>
                        <p className="text-gray-400 text-sm mt-1 relative z-0">{job.location} • {job.salary_range || 'Salary not specified'}</p>
                        <p className="text-gray-500 mt-4 line-clamp-3 text-sm relative z-0">{job.description}</p>
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center relative z-0">
                            <span className="text-xs text-gray-500">Posted Recently</span>
                            <span className="text-purple-400 hover:text-purple-300 text-sm font-medium">View Details →</span>
                        </div>
                    </div>
                ))}
            </div>
            {jobs?.length === 0 && (
                <div className="col-span-full text-center py-20 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                    <p className="text-gray-400">No jobs found.</p>
                    <Link to="/create-job" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">Create your first job posting</Link>
                </div>
            )}
        </div>
        </div >
    );
};

export default Dashboard;
