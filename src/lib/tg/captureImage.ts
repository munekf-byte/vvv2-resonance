import { toPng, toBlob } from "html-to-image";

/** data-capture-hide属性を持つ要素を除外するフィルタ */
function captureFilter(node: HTMLElement): boolean {
  return !node.dataset?.captureHide;
}

const CAPTURE_OPTIONS = {
  pixelRatio: 3,
  backgroundColor: "#ffffff",
  cacheBust: true,
  filter: captureFilter,
};

export async function captureAndDownload(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, CAPTURE_OPTIONS);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function captureAndShare(
  element: HTMLElement,
  filename: string,
  text: string = "",
): Promise<void> {
  const blob = await toBlob(element, CAPTURE_OPTIONS);
  if (!blob) return;

  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ text, files: [file] });
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}
