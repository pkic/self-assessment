// Identity stub for react-markdown (ESM-only) under jsdom/ts-jest, which
// cannot transform its module graph. Renders children as plain text — no
// test in this repo asserts on markdown-specific output.
import React from "react";

const ReactMarkdownStub: React.FC<{ children?: string }> = ({ children }) => (
  <>{children}</>
);

export default ReactMarkdownStub;
