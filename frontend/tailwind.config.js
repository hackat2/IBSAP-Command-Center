/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        commandDark: "#050b14",
        panelDark: "#0b141e",
        borderDark: "#1f293d",
      }
    },
  },
  plugins: [],
}