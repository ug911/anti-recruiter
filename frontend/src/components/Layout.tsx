import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
            <nav className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                                JobAutoPoster
                            </Link>
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link to="/" className="hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Dashboard
                                </Link>
                                <Link to="/create-job" className="hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    New Job
                                </Link>
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500 text-sm">v0.1.0</span>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
