import React from 'react';

/**
 * A component that renders animated gradient blobs in the background
 */
const GradientBackground: React.FC = () => {
    return (
        <div className="gradient-bg">
            <div className="gradient-blob blob-1"></div>
            <div className="gradient-blob blob-2"></div>
            <div className="gradient-blob blob-3"></div>
        </div>
    );
};

export default GradientBackground; 