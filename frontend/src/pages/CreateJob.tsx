import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob, JobPosting } from '../api/jobs';
import { useNavigate } from 'react-router-dom';

const CreateJob = () => {
    const navigate = useNavigate();
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
            navigate('/');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createJobMutation.mutate(formData);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Create New Job Posting (Zoho Recruit)</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Job Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Job Title</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.industry}
                                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="IT Services">IT Services</option>
                                <option value="Finance">Finance</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Retail">Retail</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Job Type</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.job_type}
                                onChange={e => setFormData({ ...formData, job_type: e.target.value })}
                            >
                                <option value="Full Time">Full Time</option>
                                <option value="Part Time">Part Time</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Target Date</label>
                            <input
                                type="date"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.target_date}
                                onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Salary Range</label>
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                value={formData.salary_range}
                                onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Experience Required</label>
                        <input
                            type="text"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            value={formData.experience_required}
                            onChange={e => setFormData({ ...formData, experience_required: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                        <textarea
                            required
                            rows={5}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={createJobMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-purple-900/40"
                    >
                        {createJobMutation.isPending ? 'Publishing...' : 'Publish to Zoho Recruit'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateJob;
