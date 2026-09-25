export const signatureFieldLayout = {
  x: 42,
  bottom: 50,
  width: 511,
  height: 58,
  gap: 10,
} as const;

export const signatureAreaHeight = (fieldCount: number): number =>
  fieldCount > 0
    ? signatureFieldLayout.bottom +
      fieldCount * signatureFieldLayout.height +
      (fieldCount - 1) * signatureFieldLayout.gap +
      28
    : 42;
