export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#121B24',
        surface2: '#192330',
        border: '#2A3341',
        text: '#E7EBF1',
        muted: '#8B96A8',
        teal: '#34C9BE',
        blue: '#5B8DEF',
        amber: '#E8A33D',
        red: '#E85D4E',
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0,0,0,0.38)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
