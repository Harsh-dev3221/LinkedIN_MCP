import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './landing/Header';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection';
import Footer from './landing/Footer';
import { AuthModal } from './AuthPage';
import DashboardLayout from './dashboard/DashboardLayout';

interface LandingPageProps {
    onGetStarted?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleGetStarted = () => {
        setIsAuthModalOpen(true);
    };

    const handleCloseAuthModal = () => {
        setIsAuthModalOpen(false);
    };

    const handleCreatePost = () => {
        navigate('/create');
    };

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-linkedin-200 border-t-linkedin-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // If user is authenticated, show the dashboard
    if (user) {
        return <DashboardLayout onCreatePost={handleCreatePost} />;
    }

    // If user is not authenticated, show the landing page
    return (
        <div className="min-h-screen w-full bg-white">
            <Header onGetStarted={handleGetStarted} />
            <main>
                <HeroSection onGetStarted={handleGetStarted} />
                <FeaturesSection />
            </main>
            <Footer />

            {/* Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={handleCloseAuthModal}
            />
        </div>
    );
};

export default LandingPage;