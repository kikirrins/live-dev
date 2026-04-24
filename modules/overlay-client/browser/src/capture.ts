// Real-pixel viewport capture via the Screen Capture API. Best-effort:
// returns null when the user cancels the permission prompt or any step fails,
// so the caller can still submit the issue without a screenshot.

export interface HighlightRect {
  top: number; left: number; width: number; height: number;
}

export async function captureViewport(highlight?: HighlightRect): Promise<Blob | null> {
  let stream: MediaStream | null = null;
  try {
    stream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
      preferCurrentTab: true,
    });
  } catch {
    return null;
  }

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video error"));
      video.play().catch(reject);
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    if (highlight) {
      const scaleX = canvas.width / window.innerWidth;
      const scaleY = canvas.height / window.innerHeight;
      const x = highlight.left * scaleX;
      const y = highlight.top * scaleY;
      const w = highlight.width * scaleX;
      const h = highlight.height * scaleY;

      ctx.strokeStyle = "rgba(37,99,235,0.95)";
      ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(37,99,235,0.12)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "rgba(37,99,235,0.95)";
      ctx.font = `bold ${Math.max(11, 13 * scaleX)}px sans-serif`;
      ctx.fillText("clicked here", Math.max(0, x), Math.max(12 * scaleY, y - 6 * scaleY));
    }

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch {
    return null;
  } finally {
    for (const track of stream!.getTracks()) track.stop();
  }
}
