import { parseModes } from "./modes";

describe("parseModes", () => {
  it("defaults to both modes enabled, self as default view when undefined", () => {
    expect(parseModes(undefined)).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it("defaults to both modes enabled, self as default view when null", () => {
    expect(parseModes(null)).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it("defaults to both modes enabled, self as default view when empty string", () => {
    expect(parseModes("")).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it('"self" enables only self and hides the full switch', () => {
    expect(parseModes("self")).toEqual({
      self: true,
      full: false,
      defaultView: "self",
    });
  });

  it('"full" still enables self so data is never hidden, but defaults to full view', () => {
    expect(parseModes("full")).toEqual({
      self: true,
      full: true,
      defaultView: "full",
    });
  });

  it("full never disables self", () => {
    expect(parseModes("full").self).toBe(true);
  });

  it('"self,full" enables both, defaults to self', () => {
    expect(parseModes("self,full")).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it('"full,self" enables both, defaults to self', () => {
    expect(parseModes("full,self")).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it("is tolerant of whitespace and case", () => {
    expect(parseModes(" Self , Full ")).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });

  it("ignores unknown tokens", () => {
    expect(parseModes("self,bogus")).toEqual({
      self: true,
      full: false,
      defaultView: "self",
    });
  });

  it("treats an unknown-only token list as the default", () => {
    expect(parseModes("bogus")).toEqual({
      self: true,
      full: true,
      defaultView: "self",
    });
  });
});
