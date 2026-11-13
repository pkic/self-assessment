import React from "react";
import { Assessment } from "./components/Assessment/Assessment";

interface AppProps {
  dataUrl: string | null;
  referencesUrl: string | null;
  modes?: string | null;
  modelVersion?: string | null;
}

const App: React.FC<AppProps> = ({
  dataUrl,
  referencesUrl,
  modes,
  modelVersion,
}) => {
  return (
    <Assessment
      src={dataUrl}
      references={referencesUrl}
      modes={modes}
      modelVersion={modelVersion}
    />
  );
};

export default App;
