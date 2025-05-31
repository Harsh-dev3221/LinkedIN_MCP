import React, { useState } from 'react';
import Header from './landing/Header';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection';
import Footer from './landing/Footer';
import { AuthModal } from './AuthPage';

interface LandingPageProps {
    onGetStarted?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleGetStarted = () => {
        setIsAuthModalOpen(true);
    };

    const handleCloseAuthModal = () => {
        setIsAuthModalOpen(false);
    };

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