import React, { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

interface HeaderProps {
    onGetStarted?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGetStarted }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleBookDemo = () => {
        if (onGetStarted) {
            onGetStarted();
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-gray-100 shadow-sm bg-white/95 backdrop-blur-md">
            <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-xl shadow-linkedin">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-gray-900">PostWizz</span>
                            <span className="-mt-1 text-xs text-gray-500">LinkedIn Content Creator</span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="items-center hidden space-x-8 md:flex">
                        <a
                            href="#features"
                            className="font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                        >
                            Features
                        </a>
                        <a
                            href="#pricing"
                            className="font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                        >
                            Pricing
                        </a>
                        <a
                            href="#about"
                            className="font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                        >
                            About
                        </a>
                        <a
                            href="#resources"
                            className="font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                        >
                            Resources
                        </a>
                        <a
                            href="#contact"
                            className="font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                        >
                            Contact
                        </a>
                    </nav>

                    {/* Desktop CTA Buttons */}
                    <div className="items-center hidden space-x-4 md:flex">
                        <button type="button" className="font-medium text-gray-600 transition-colors hover:text-gray-900">
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={handleBookDemo}
                            className="text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-orange hover:shadow-lg transform hover:-translate-y-0.5 inline-flex items-center space-x-2"
                            style={{
                                background: '#ff6900',
                                border: 'none',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                const target = e.currentTarget as HTMLElement;
                                target.style.background = 'white';
                                target.style.color = '#ff6900';
                                target.style.border = '2px solid #111827';
                                target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                const target = e.currentTarget as HTMLElement;
                                target.style.background = '#ff6900';
                                target.style.color = 'white';
                                target.style.border = 'none';
                                target.style.transform = 'translateY(0)';
                            }}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Get Started Free</span>
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={toggleMenu}
                        className="p-2 text-gray-600 transition-colors rounded-lg md:hidden hover:text-gray-900 hover:bg-gray-100"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="py-4 border-t border-gray-100 md:hidden">
                        <nav className="flex flex-col space-y-4">
                            <a
                                href="#features"
                                className="px-2 py-1 font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Features
                            </a>
                            <a
                                href="#pricing"
                                className="px-2 py-1 font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Pricing
                            </a>

                            <a
                                href="#about"
                                className="px-2 py-1 font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                About
                            </a>
                            <a
                                href="#resources"
                                className="px-2 py-1 font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Resources
                            </a>
                            <a
                                href="#contact"
                                className="px-2 py-1 font-medium text-gray-600 transition-colors hover:text-linkedin-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contact
                            </a>
                            <div className="flex flex-col pt-4 space-y-3 border-t border-gray-100">
                                <button type="button" className="px-2 py-1 font-medium text-left text-gray-600 transition-colors hover:text-gray-900">
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBookDemo}
                                    className="inline-flex items-center justify-center px-6 py-3 space-x-2 font-semibold text-white transition-all duration-300 rounded-xl"
                                    style={{
                                        background: '#ff6900',
                                        border: 'none',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        const target = e.currentTarget as HTMLElement;
                                        target.style.background = 'white';
                                        target.style.color = '#ff6900';
                                        target.style.border = '2px solid #111827';
                                        target.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        const target = e.currentTarget as HTMLElement;
                                        target.style.background = '#ff6900';
                                        target.style.color = 'white';
                                        target.style.border = 'none';
                                        target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Get Started Free</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;