import { toPng } from "html-to-image";

/**
 * 指定要素を高解像度PNG画像として保存
 * html-to-image (SVG foreignObject) を使用 — テキスト忠実再現
 */
export async function captureAndDownload(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
