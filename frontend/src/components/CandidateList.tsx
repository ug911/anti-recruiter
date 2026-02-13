import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCandidates, Candidate } from '../api/candidates';
import clsx from 'clsx'; // Assuming clsx is installed, if not basic concatenation works

interface CandidateListProps {
    jobId: string;
}

const CandidateList: React.FC<CandidateListProps> = ({ jobId }) => {
    const { data: candidates, isLoading, error } = useQuery({
        queryKey: ['candidates', jobId],
        queryFn: () => fetchCandidates(jobId),
    });

    if (isLoading) return <div className="text-gray-400">Loading candidates...</div>;
    if (error) return <div className="text-red-400">Error loading candidates.</div>;
    if (!candidates || candidates.length === 0) return <div className="text-gray-500 italic">No candidates found for this job.</div>;

    return (
        <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Candidates & Status</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Applied Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-900/50">
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {candidate.first_name} {candidate.last_name}
                                </td>
                                <td className="px-6 py-4">{candidate.email}</td>
                                <td className="px-6 py-4">{candidate.applied_date}</td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-xs font-semibold",
                                        candidate.status === 'Applied' && "bg-blue-900/50 text-blue-300 border border-blue-700",
                                        candidate.status === 'Interview' && "bg-yellow-900/50 text-yellow-300 border border-yellow-700",
                                        candidate.status === 'Hired' && "bg-green-900/50 text-green-300 border border-green-700",
                                        candidate.status === 'Rejected' && "bg-red-900/50 text-red-300 border border-red-700"
                                    )}>
                                        {candidate.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {candidate.resume_url && (
                                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline text-sm">
                                            View Resume
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CandidateList;
