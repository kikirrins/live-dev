// Real-pixel viewport capture via the Screen Capture API. Best-effort:
// returns null when the user cancels the permission prompt or any step fails,
// so the caller can still submit the issue without a screenshot.

export async function captureViewport(): Promise<Blob | null> {
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

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch {
    return null;
  } finally {
    for (const track of stream!.getTracks()) track.stop();
  }
}
