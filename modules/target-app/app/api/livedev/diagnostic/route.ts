import { createDiagnosticRoute } from "@livedev/host-proxy/create";
import { getCurrentUser } from "@/app/lib/session";

export const { GET } = createDiagnosticRoute({
  getUser: async () => getCurrentUser(),
  storeKind: "fs",
});
