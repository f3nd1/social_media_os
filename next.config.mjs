/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve under a URL sub-path when NEXT_PUBLIC_BASE_PATH is set (for example
  // "/social_media_os" behind the reverse proxy). Empty/unset means root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // Keep pdfjs-dist unbundled on the server so its internal worker module
  // resolves from node_modules at runtime (bundling it breaks the worker).
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
