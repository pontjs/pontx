/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "src/*.tsx",
    "node_modules/flowbite-react/lib/esm/**/*.js",
    "../../node_modules/flowbite-react/lib/esm/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("flowbite/plugin")],
};
