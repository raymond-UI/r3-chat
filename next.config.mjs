import createJiti from "jiti";

const jiti = createJiti(new URL(import.meta.url).pathname);

// Import env here to validate during build. Using jiti we can import .ts files :)
jiti("./src/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: ".next",
  images: {
    remotePatterns: [
      {
        // upload path for user files
        protocol: "https",
        hostname: "eftjl1pi5j.ufs.sh",
        pathname: "/f/*",
      },
    ],
  },
};

export default nextConfig;
