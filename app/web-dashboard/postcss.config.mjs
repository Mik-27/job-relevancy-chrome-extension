/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
        tailwindcss: {}, // Use standard 'tailwindcss', NOT '@tailwindcss/postcss'
        autoprefixer: {},
    },
};

export default config;
