/**
 * withLiveDev — Next.js config wrapper that adds the livedev source-injection loader
 * and inlines the livedev whitelist as NEXT_PUBLIC_LIVEDEV_WHITELIST.
 *
 * Usage:
 *   const withLiveDev = require("@livedev/overlay-client/webpack");
 *   module.exports = withLiveDev(nextConfig);
 *
 * Or with other wrappers:
 *   module.exports = withLiveDev(withSomething(nextConfig));
 */

const fs = require("fs");
const path = require("path");

function findWhitelistFile(startDir) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "livedev.whitelist.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function readAllowedUsers() {
  const file = findWhitelistFile(process.cwd());
  if (!file) return [];
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.allowedUsers)) {
      return parsed.allowedUsers.filter((x) => typeof x === "string");
    }
  } catch {
    // fail-closed on parse error
  }
  return [];
}

function withLiveDev(nextConfig = {}) {
  const allowedUsers = readAllowedUsers();
  return {
    ...nextConfig,
    env: {
      ...(nextConfig.env ?? {}),
      NEXT_PUBLIC_LIVEDEV_WHITELIST: JSON.stringify(allowedUsers),
    },
    webpack(config, options) {
      // Only inject in development
      if (options.dev) {
        config.module.rules.push({
          test: /\.[jt]sx$/,
          exclude: /node_modules/,
          enforce: "pre", // Run before other loaders (SWC)
          use: [
            {
              loader: path.resolve(__dirname, "loader.cjs"),
            },
          ],
        });
      }

      // Call the existing webpack config if it exists
      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}

module.exports = withLiveDev;
