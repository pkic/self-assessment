import React from "react";
import { Assessment } from "./components/Assessment/Assessment";

interface AppProps {
  dataUrl: string | null;
  configUrl: string | null;
}

const App: React.FC<AppProps> = ({ dataUrl, configUrl }) => {
  return <Assessment src={dataUrl} config={configUrl} />;
};

export default App;
