import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
    const theme = useTheme();

    // Size mappings
    const sizes = {
        small: {
            iconSize: 24,
            fontSize: '1.2rem',
            sparkSize: 16,
        },
        medium: {
            iconSize: 36,
            fontSize: '1.5rem',
            sparkSize: 24,
        },
        large: {
            iconSize: 48,
            fontSize: '1.8rem',
            sparkSize: 32,
        },
    };

    const { iconSize, fontSize, sparkSize } = sizes[size];

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: iconSize + 8,
                height: iconSize + 8,
            }}>
                <LinkedInIcon
                    sx={{
                        fontSize: iconSize,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        borderRadius: '8px',
                        color: 'white',
                        padding: '4px',
                        boxShadow: '0 4px 8px rgba(255, 138, 0, 0.3)',
                    }}
                />
                <AutoAwesomeIcon
                    sx={{
                        position: 'absolute',
                        top: -sparkSize / 4,
                        right: -sparkSize / 4,
                        fontSize: sparkSize,
                        color: theme.palette.secondary.main,
                        filter: 'drop-shadow(0 2px 4px rgba(255, 138, 0, 0.3))',
                    }}
                />
            </Box>

            {showText && (
                <Typography
                    variant="h6"
                    sx={{
                        fontSize,
                        fontWeight: 700,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                    }}
                >
                    Post Creator
                </Typography>
            )}
        </Box>
    );
};

export default Logo; 