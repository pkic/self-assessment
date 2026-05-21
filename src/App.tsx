import React from "react";
import { Assessment } from "./components/Assessment/Assessment";

interface AppProps {
  dataUrl: string | null;
  configUrl: string | null;
  extensionsUrl: string | null;
  referencesUrl: string | null;
}

const App: React.FC<AppProps> = ({
  dataUrl,
  configUrl,
  extensionsUrl,
  referencesUrl,
}) => {
  return (
    <Assessment
      src={dataUrl}
      config={configUrl}
      extensions={extensionsUrl}
      references={referencesUrl}
    />
  );
};

export default App;
