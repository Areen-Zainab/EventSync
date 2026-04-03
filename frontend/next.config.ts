import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' https://fonts.gstatic.com data:",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
	"connect-src 'self' http://localhost:5000 https:",
].join('; ');

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: csp,
					},
				],
			},
		];
	},
};

export default nextConfig;
