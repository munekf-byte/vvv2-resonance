import { toPng, toBlob } from "html-to-image";

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

/**
 * 指定要素をPNG画像としてキャプチャし、Web Share APIで共有
 * 非対応ブラウザでは画像保存にフォールバック
 */
export async function captureAndShare(
  element: HTMLElement,
  filename: string,
  text: string = "",
): Promise<void> {
  const blob = await toBlob(element, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
  if (!blob) return;

  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      text,
      files: [file],
    });
  } else {
    // フォールバック: 画像保存
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}
