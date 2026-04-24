import { createIssuesRoute } from "@livedev/host-proxy/create";
import { getCurrentUser } from "@/app/lib/session";
import { store } from "@/app/lib/screenshot-store";

export const { POST } = createIssuesRoute({
  getUser: async () => getCurrentUser(),
  store,
});
