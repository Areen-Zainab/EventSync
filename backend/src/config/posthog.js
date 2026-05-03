const { PostHog } = require('posthog-node');

// No-op stub used when PostHog is not configured.
const noop = () => {};
const noopPosthog = {
  capture: noop,
  identify: noop,
  alias: noop,
  groupIdentify: noop,
  shutdown: noop,
};

let posthog = noopPosthog;

if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_API_KEY.trim() !== '') {
  posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  });
} else {
  console.warn(
    '[PostHog] POSTHOG_API_KEY is not set – analytics will be disabled.'
  );
}

module.exports = posthog;
