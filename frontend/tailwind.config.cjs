module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(210, 100%, 55%)',
        secondary: 'hsl(210, 20%, 20%)',
        accent: 'hsl(45, 100%, 55%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
