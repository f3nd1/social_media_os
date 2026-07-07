/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve under a URL sub-path when NEXT_PUBLIC_BASE_PATH is set (for example
  // "/social_media_os" behind the reverse proxy). Empty/unset means root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
