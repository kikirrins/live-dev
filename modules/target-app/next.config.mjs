import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const withLiveDev = require("@livedev/overlay-client/webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default withLiveDev(nextConfig);
