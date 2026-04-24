import { createPRsRoute } from "@livedev/host-proxy/create";
import { getCurrentUser } from "@/app/lib/session";

export const { GET } = createPRsRoute({
  getUser: async () => getCurrentUser(),
});
