export async function captureElement(el: Element): Promise<string | null> {
  try {
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.floor(rect.width * dpr));
    const H = Math.max(80 * dpr, Math.floor(rect.height * dpr)); // min 80px so thin elements aren't a sliver
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    // Background — fall back to light grey when element is transparent
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    ctx.fillStyle = (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent")
      ? "#f9fafb"
      : bg;
    ctx.fillRect(0, 0, rect.width, H / dpr);

    // Draw the element's text content, word-wrapped, vertically centred
    const text = (el.textContent ?? "").trim().slice(0, 120);
    if (text) {
      ctx.fillStyle = cs.color || "#111";
      ctx.font = cs.font || "14px -apple-system, system-ui, sans-serif";
      const maxW = rect.width - 16;
      const words = text.split(" ");
      let line = "";
      const lines: string[] = [];
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      const lineH = 18;
      const startY = Math.max(20, (H / dpr - lines.length * lineH) / 2);
      lines.forEach((l, i) => ctx.fillText(l, 8, startY + i * lineH));
    }

    // Small badge bottom-left: <tag> w×h
    const badge = `<${el.tagName.toLowerCase()}> ${Math.round(rect.width)}×${Math.round(rect.height)}`;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText(badge, 6, H / dpr - 6);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
