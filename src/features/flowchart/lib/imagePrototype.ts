export type ScreenControl = {
  id: string;
  label: string;
  kind: "button" | "text" | "file";
  x: number;
  y: number;
  width: number;
  height: number;
  target?: string;
};
export type PrototypeImage = { src: string; controls: ScreenControl[] };
export type PrototypeStep = {
  screen: string;
  action: string;
  actual: string;
  expected: string;
  status: "Sesuai" | "Berbeda" | "Belum diuji";
};

export function compareClick(
  screen: string,
  action: string,
  actual: string,
  expected: string
): PrototypeStep {
  return {
    screen,
    action,
    actual,
    expected,
    status: !actual || !expected ? "Belum diuji" : actual === expected ? "Sesuai" : "Berbeda",
  };
}

export async function readDesign(file: File): Promise<string> {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 12 * 1024 * 1024)
    throw Error("Pilih PNG atau JPG hingga 12 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Gambar tidak dapat dibaca.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    bitmap.close();
  }
}
