/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LinkedIn brand colors
        linkedin: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dfff',
          300: '#7cc7ff',
          400: '#378fe9',
          500: '#0a66c2',
          600: '#004182',
          700: '#003366',
          800: '#002952',
          900: '#001f3d',
        },
        // Warm orange accent
        orange: {
          50: '#fff8f0',
          100: '#ffeed9',
          200: '#ffd9b3',
          300: '#ffb84d',
          400: '#f5a623',
          500: '#e09112',
          600: '#cc7a00',
          700: '#b36600',
          800: '#995200',
          900: '#804400',
        },
        // Warm beige/neutral palette
        beige: {
          50: '#fefdfb',
          100: '#f8f5f0',
          200: '#f0ebe3',
          300: '#e8e0d6',
          400: '#d4c4b0',
          500: '#b8a082',
          600: '#9c8660',
          700: '#7a6b4f',
          800: '#5c5142',
          900: '#3e3a35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(47, 47, 47, 0.08)',
        'soft-lg': '0 12px 40px rgba(47, 47, 47, 0.12)',
        'linkedin': '0 8px 25px rgba(10, 102, 194, 0.25)',
        'orange': '0 8px 25px rgba(245, 166, 35, 0.25)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '20px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
