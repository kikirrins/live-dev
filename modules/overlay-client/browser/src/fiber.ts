export interface SourceInfo {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
  componentName: string;
  parentChain: string[];
}

// Internal/framework component names to skip in the parent chain
const INTERNAL_NAMES = new Set([
  // React internals
  "Suspense", "Fragment", "Provider", "Consumer", "ForwardRef", "ContextProvider",
  // Next.js App Router
  "InnerLayoutRouter", "OuterLayoutRouter", "RenderFromTemplateContext",
  "RedirectErrorBoundary", "RedirectBoundary",
  "NotFoundErrorBoundary", "NotFoundBoundary",
  "LoadingBoundary", "ErrorBoundary",
  "ClientPageRoot", "HotReload", "Router", "AppRouter",
  "ServerRoot", "RSCComponent", "Root", "RootLayoutComponent",
  // Next.js App Router scroll/focus
  "ScrollAndFocusHandler", "InnerScrollAndFocusHandler",
  // Next.js dev overlay
  "ReactDevOverlay", "ErrorBoundaryHandler",
  "DevRootNotFoundBoundary", "DevRootHTTPAccessFallbackBoundary",
  "HTTPAccessFallbackBoundary",
  // Next.js context adapters
  "PathnameContextProviderAdapter", "ServerInsertedHTMLContext",
  "ServerInsertedHTMLProvider", "AppRouterAnnouncer",
  "PageTreeLayoutErrorBoundary",
]);

function isUserComponent(name: string): boolean {
  if (!name || !/^[A-Z]/.test(name)) return false;
  if (INTERNAL_NAMES.has(name)) return false;
  if (/Boundary$|^(Inner|Outer)/.test(name)) return false;
  if (/Overlay$|^Dev[A-Z]/.test(name)) return false;
  if (/^Pathname|^AppRouter|^ServerInserted/.test(name)) return false;
  return true;
}

function getFiberFromNode(node: Element): any {
  const key = Object.keys(node).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  return key ? (node as any)[key] : null;
}

function getFiberFromNodeOrAncestor(node: Element): any {
  let el: Element | null = node;
  while (el) {
    const fiber = getFiberFromNode(el);
    if (fiber) return fiber;
    el = el.parentElement;
  }
  return null;
}

function getComponentName(fiber: any): string | null {
  const type = fiber?.type ?? fiber?.elementType;
  if (!type) return null;
  if (typeof type === "string") return type;
  // Handle forwardRef / memo wrappers
  return type.displayName || type.name ||
    type.render?.displayName || type.render?.name ||
    type.type?.displayName || type.type?.name ||
    null;
}

function getSourceFromFiber(fiber: any): { fileName: string; lineNumber: number; columnNumber?: number } | null {
  if (fiber._debugSource) return fiber._debugSource;
  if (fiber.memoizedProps?.__source) return fiber.memoizedProps.__source;
  if (fiber.pendingProps?.__source) return fiber.pendingProps.__source;
  return null;
}

/** Collect user-component names from the React fiber chain (catches providers that render no host element) */
function collectFiberParents(node: Element, excludeName: string): string[] {
  const fiber = getFiberFromNodeOrAncestor(node);
  if (!fiber) return [];

  const owners: string[] = [];
  let walk = fiber.return;
  while (walk && owners.length < 20) {
    const name = getComponentName(walk);
    if (name && isUserComponent(name) && name !== excludeName && !owners.includes(name)) {
      owners.push(name);
    }
    walk = walk.return;
  }
  return owners;
}

export function extractSourceInfo(node: Element): SourceInfo | null {
  // --- Strategy 1: data-livedev-* attrs injected by build plugin ---
  let attrEl: Element | null = node;
  while (attrEl) {
    const src = attrEl.getAttribute("data-livedev-src");
    const comp = attrEl.getAttribute("data-livedev-component");
    if (src) {
      const [fileName, lineStr] = src.split(":");
      const lineNumber = parseInt(lineStr ?? "0", 10);
      let componentName = comp ?? null;
      if (!componentName) {
        let walk = getFiberFromNodeOrAncestor(node);
        while (walk) {
          const name = getComponentName(walk);
          if (name && isUserComponent(name)) { componentName = name; break; }
          walk = walk.return;
        }
        componentName = componentName ?? "unknown";
      }

      // Build parent chain from DOM attributes
      const domParents: string[] = [];
      let p = attrEl.parentElement;
      while (p && domParents.length < 8) {
        const parentComp = p.getAttribute("data-livedev-component");
        if (parentComp && parentComp !== componentName && /^[A-Z]/.test(parentComp)) {
          if (!domParents.includes(parentComp)) domParents.push(parentComp);
        }
        p = p.parentElement;
      }

      // Supplement with fiber-based parents to catch providers/wrappers that render no host element
      const fiberParents = collectFiberParents(node, componentName);

      // Merge: start with DOM chain, then fill in fiber-only parents in order, deduped
      const parentChain = [...domParents];
      for (const fp of fiberParents) {
        if (!parentChain.includes(fp) && fp !== componentName) {
          parentChain.push(fp);
        }
        if (parentChain.length >= 8) break;
      }

      return { fileName, lineNumber, componentName, parentChain };
    }
    attrEl = attrEl.parentElement;
  }

  // --- Strategy 2: React fiber (dev mode, no build plugin) ---
  const fiber = getFiberFromNodeOrAncestor(node);
  if (!fiber) return null;

  // Walk up fiber tree looking for source info
  let sourceFiber: any = null;
  let sourceData: ReturnType<typeof getSourceFromFiber> = null;
  let walk = fiber;
  while (walk) {
    const src = getSourceFromFiber(walk);
    if (src) {
      sourceFiber = walk;
      sourceData = src;
      break;
    }
    walk = walk.return;
  }

  // Find the nearest user component
  let componentName: string | null = null;
  let componentFiber = sourceFiber ?? fiber;
  while (componentFiber) {
    const name = getComponentName(componentFiber);
    if (name && isUserComponent(name)) {
      componentName = name;
      break;
    }
    componentFiber = componentFiber.return;
  }

  if (componentName && !sourceData && componentFiber) {
    let srcWalk = componentFiber;
    while (srcWalk) {
      const src = getSourceFromFiber(srcWalk);
      if (src) { sourceData = src; break; }
      srcWalk = srcWalk.return;
    }
  }

  if (!componentName) {
    let fallbackFiber = fiber;
    while (fallbackFiber) {
      const name = getComponentName(fallbackFiber);
      if (name && isUserComponent(name)) { componentName = name; break; }
      fallbackFiber = fallbackFiber.return;
    }
  }

  if (!componentName) return null;

  // Build parent chain from fiber
  const parentChain: string[] = [];
  let p = componentFiber?.return;
  while (p && parentChain.length < 8) {
    const name = getComponentName(p);
    if (name && isUserComponent(name) && name !== componentName) {
      if (!parentChain.includes(name)) parentChain.push(name);
    }
    p = p.return;
  }

  return {
    fileName: sourceData?.fileName ?? "unknown",
    lineNumber: sourceData?.lineNumber ?? 0,
    columnNumber: sourceData?.columnNumber,
    componentName,
    parentChain,
  };
}
