# @livedev/dashboard-client

React component that renders a `/dev` page listing open GitHub PRs and their
Railway preview sandboxes. Whitelisted host users can click through to each
sandbox to validate a change before it merges.

Zero credentials in the browser. The component calls a same-origin host route
(`/api/livedev/prs`) which forwards to the `issues-service` sidecar holding the
GitHub PAT.

See `INTEGRATION.md` for copy-in instructions.
