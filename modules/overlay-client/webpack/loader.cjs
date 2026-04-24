/**
 * Webpack loader: injects data-livedev-src and data-livedev-component
 * onto JSX host elements so the overlay can identify source locations.
 *
 * Runs before SWC — no babel config needed, no next/font conflicts.
 */

const path = require("path");

// Match JSX opening tags for host (lowercase) elements
const JSX_OPEN_RE = /(<(?:a|abbr|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|label|legend|li|link|main|map|mark|menu|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|search|section|select|slot|small|source|span|strong|style|sub|summary|sup|svg|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr|circle|clipPath|defs|ellipse|g|image|line|linearGradient|mask|path|pattern|polygon|polyline|radialGradient|rect|stop|text|tspan|use)(?=[\s/>]))/g;

module.exports = function livedevLoader(source) {
  const resourcePath = this.resourcePath;

  // Skip node_modules
  if (resourcePath.includes("node_modules")) return source;

  // Skip non-JSX files
  if (!/\.[jt]sx?$/.test(resourcePath)) return source;

  // Quick check: does this file even have JSX?
  if (!source.includes("<")) return source;

  // Get repo-relative path
  const rootDir = this.rootContext || this.context || process.cwd();
  const relPath = path.relative(rootDir, resourcePath).replace(/\\/g, "/");

  // Find the enclosing component name by scanning for function/const declarations.
  // Track paren depth so destructured-params braces don't pop the component.
  const lines = source.split("\n");
  const componentAtLine = new Array(lines.length + 1).fill(null);

  let currentComponent = null;
  let braceDepth = 0;
  const componentStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect component declarations:
    let pushedThisLine = false;

    // 1. Top-level: function ComponentName(  or  export default function ComponentName(
    const funcMatch = line.match(/^\s*(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*)\s*[<(]/);
    if (funcMatch) {
      componentStack.push({ name: funcMatch[1], declDepth: braceDepth, parenDepth: 0, bodyDepth: null });
      currentComponent = funcMatch[1];
      pushedThisLine = true;
    }

    // 2. Inner named function inside a HOC call: >(function ComponentName(  or  (function ComponentName(
    if (!funcMatch) {
      const innerFuncMatch = line.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*[<(]/);
      if (innerFuncMatch) {
        if (componentStack.length > 0) {
          // Rename the outer HOC entry to the inner function name
          const top = componentStack[componentStack.length - 1];
          if (top.bodyDepth == null) {
            top.name = innerFuncMatch[1];
            currentComponent = innerFuncMatch[1];
            pushedThisLine = true;
          }
        } else if (/^\s*[>)]/.test(line)) {
          // Fix B: inner named function at top level when outer const wasn't detected
          // (multi-line HOC where the closing > or ) starts this line)
          componentStack.push({ name: innerFuncMatch[1], declDepth: braceDepth, parenDepth: 0, bodyDepth: null });
          currentComponent = innerFuncMatch[1];
          pushedThisLine = true;
        }
      }
    }

    // 3. const ComponentName = ... (arrow, function, HOC call, or any call expression)
    const constMatch = line.match(/^\s*(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*/);
    if (constMatch && !funcMatch && !pushedThisLine) {
      const rest = line.slice(constMatch.index + constMatch[0].length);
      const RHS_TESTS = [
        /^(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?\s*=>/, // arrow
        /^function\b/, // const X = function
        /^[A-Za-z_][A-Za-z0-9_$.]*\s*(?:<[^>(]*>\s*)?\(/, // single-line HOC call
      ];

      let matched = RHS_TESTS.some((re) => re.test(rest));

      // Fix A: if no match on this line, try joining continuation lines (multi-line type args)
      if (!matched) {
        let joined = rest;
        for (let k = 1; k <= 10 && i + k < lines.length; k++) {
          joined += " " + lines[i + k].trim();
          if (RHS_TESTS.some((re) => re.test(joined))) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        componentStack.push({ name: constMatch[1], declDepth: braceDepth, parenDepth: 0, bodyDepth: null });
        currentComponent = constMatch[1];
        pushedThisLine = true;
      }
    }

    // Track chars for brace/paren depth
    let inString = false;
    let stringChar = "";
    let escaped = false;
    let inTemplate = false;
    let inLineComment = false;

    for (let c = 0; c < line.length; c++) {
      if (escaped) { escaped = false; continue; }

      const ch = line[c];
      const next = line[c + 1];

      if (ch === "\\") { escaped = true; continue; }

      // Skip line comments
      if (!inString && !inTemplate && ch === "/" && next === "/") break;

      // Skip strings
      if (!inString && !inTemplate && (ch === '"' || ch === "'")) {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (inString && ch === stringChar) {
        inString = false;
        continue;
      }
      if (inString) continue;

      // Skip template literals (basic — doesn't handle nested ${})
      if (!inTemplate && ch === "`") { inTemplate = true; continue; }
      if (inTemplate && ch === "`") { inTemplate = false; continue; }
      if (inTemplate) continue;

      const top = componentStack.length > 0 ? componentStack[componentStack.length - 1] : null;

      if (ch === "(") {
        if (top && top.bodyDepth == null) {
          top.parenDepth = (top.parenDepth ?? 0) + 1;
        }
      } else if (ch === ")") {
        if (top && top.bodyDepth == null) {
          top.parenDepth = (top.parenDepth ?? 0) - 1;
        }
      } else if (ch === "{") {
        braceDepth++;
        // If this is the function body opener (parens are closed), record it
        if (top && top.bodyDepth == null && (top.parenDepth ?? 0) <= 0) {
          top.bodyDepth = braceDepth;
        }
      } else if (ch === "}") {
        braceDepth--;
        // Pop components whose body has closed
        while (
          componentStack.length > 0 &&
          componentStack[componentStack.length - 1].bodyDepth != null &&
          braceDepth < componentStack[componentStack.length - 1].bodyDepth
        ) {
          componentStack.pop();
        }
        currentComponent = componentStack.length > 0
          ? componentStack[componentStack.length - 1].name
          : null;
      }
    }

    componentAtLine[i] = currentComponent;
  }

  // Inject attributes into JSX opening tags
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-based
    const comp = componentAtLine[i];

    // Find all JSX opening tags in this line
    let modifiedLine = line;
    let lineOffset = 0;

    const matches = [...line.matchAll(JSX_OPEN_RE)];
    for (const match of matches) {
      const tag = match[1];
      const insertPos = match.index + tag.length + lineOffset;

      const srcAttr = ` data-livedev-src="${relPath}:${lineNum}"`;
      const compAttr = comp ? ` data-livedev-component="${comp}"` : "";
      const injection = srcAttr + compAttr;

      modifiedLine = modifiedLine.slice(0, insertPos) + injection + modifiedLine.slice(insertPos);
      lineOffset += injection.length;
    }

    result.push(modifiedLine);
  }

  return result.join("\n");
};
