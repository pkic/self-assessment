// Identity stub for CSS Module imports under jsdom (ts-jest does not transform SCSS).
export default new Proxy(
  {},
  { get: (_t, k) => (typeof k === "string" ? k : "") },
);
