import { createScreenshotsViewerRoute } from "@livedev/host-proxy/create";
import { getCurrentUser } from "@/app/lib/session";
import { store } from "@/app/lib/screenshot-store";

export const { GET } = createScreenshotsViewerRoute({
  getUser: async () => getCurrentUser(),
  store,
});
