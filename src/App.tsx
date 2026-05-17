import React from "react";
import { Assessment } from "./components/Assessment/Assessment";

interface AppProps {
  dataUrl: string | null;
  configUrl: string | null;
  extensionsUrl: string | null;
}

const App: React.FC<AppProps> = ({ dataUrl, configUrl, extensionsUrl }) => {
  return (
    <Assessment src={dataUrl} config={configUrl} extensions={extensionsUrl} />
  );
};

export default App;
