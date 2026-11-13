import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFString,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { ReportSigningPolicy } from "../../assessment-engine/types";
import { signatureFieldLayout } from "./signatureLayout";

export const namedDestinationPageIndex = (
  document: PDFDocument,
  destinationName: string,
): number | undefined => {
  const names = document.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const destinations = names?.lookupMaybe(PDFName.of("Dests"), PDFDict);
  const entries = destinations?.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (!entries) return undefined;

  for (let index = 0; index < entries.size(); index += 2) {
    const name = entries.lookup(index);
    if (
      !(name instanceof PDFString || name instanceof PDFHexString) ||
      name.decodeText() !== destinationName
    ) {
      continue;
    }
    const destination = entries.lookup(index + 1, PDFArray);
    const pageReference = destination.get(0);
    if (!(pageReference instanceof PDFRef)) return undefined;
    return document.getPages().findIndex((page) => page.ref === pageReference);
  }
  return undefined;
};

export const addPdfSignatureFields = async (
  document: PDFDocument,
  pageIndex: number,
  policy: ReportSigningPolicy,
): Promise<void> => {
  const page = document.getPage(pageIndex);
  const font = await document.embedFont(StandardFonts.Helvetica);

  let acroForm = document.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acroForm) {
    acroForm = document.context.obj({ Fields: [] });
    document.catalog.set(PDFName.of("AcroForm"), acroForm);
  }
  let fields = acroForm.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!fields) {
    fields = document.context.obj([]);
    acroForm.set(PDFName.of("Fields"), fields);
  }
  for (const [index, field] of policy.fields.entries()) {
    const rectangle = {
      x: signatureFieldLayout.x,
      y:
        signatureFieldLayout.bottom +
        (policy.fields.length - index - 1) *
          (signatureFieldLayout.height + signatureFieldLayout.gap),
      width: signatureFieldLayout.width,
      height: signatureFieldLayout.height,
    };
    page.drawRectangle({
      ...rectangle,
      borderColor: rgb(0.1, 0.3, 0.57),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 1),
    });
    page.drawText(`${field.label}${field.required ? "" : " (optional)"}`, {
      x: rectangle.x + 10,
      y: rectangle.y + rectangle.height - 17,
      size: 9,
      font,
      color: rgb(0.1, 0.3, 0.57),
    });
    page.drawText(`Role: ${field.role}`, {
      x: rectangle.x + 10,
      y: rectangle.y + rectangle.height - 33,
      size: 8,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });

    const signature = document.context.obj({
      FT: PDFName.of("Sig"),
      T: PDFHexString.fromText(field.name),
      TU: PDFHexString.fromText(field.label),
      Type: PDFName.of("Annot"),
      Subtype: PDFName.of("Widget"),
      Rect: [
        rectangle.x,
        rectangle.y,
        rectangle.x + rectangle.width,
        rectangle.y + rectangle.height,
      ],
      F: 4,
      Ff: field.required ? 2 : 0,
      P: page.ref,
    });
    const signatureRef = document.context.register(signature);
    page.node.addAnnot(signatureRef);
    fields.push(signatureRef);
  }
  acroForm.set(PDFName.of("SigFlags"), document.context.obj(3));
};
