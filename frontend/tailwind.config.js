/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0px 4px 24px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.02)',
                'premium-hover': '0px 12px 32px rgba(0, 0, 0, 0.08), 0px 4px 8px rgba(0, 0, 0, 0.03)',
                'glass-panel': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                '3d': '0 2px 4px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.4)',
                '3d-hover': '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)',
                'btn-3d': '0 2px 5px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.3)',
                'btn-3d-hover': '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
                'btn-3d-active': '0 1px 2px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.1)',
            },
            colors: {
                brand: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                    950: '#2e1065',
                },
                surface: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'blob': 'blob 7s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px) scale(0.98)', opacity: '0' },
                    '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
