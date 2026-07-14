import QRCode from "qrcode";

// QR codes have a hard upper bound around 2.9 KB; longer URLs are common
// when a host bundles many large extensions. Don't fail the whole PDF —
// the caller falls back to qrImgData === null and the Image is skipped.
export const generateQRDataUrl = async (
  url: string,
): Promise<string | null> => {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return null;
  }
};
