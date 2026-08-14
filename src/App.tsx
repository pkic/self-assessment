import React from "react";
import { Assessment } from "./components/Assessment/Assessment";
import { PqcmmAssessment } from "./pqcmm/PqcmmAssessment";

interface AppProps {
  dataUrl: string | null;
  referencesUrl: string | null;
  modes?: string | null;
  model?: string | null;
}

const App: React.FC<AppProps> = ({ dataUrl, referencesUrl, modes, model }) => {
  if (model?.trim().toLowerCase() === "pqcmm") {
    return <PqcmmAssessment src={dataUrl} />;
  }
  return <Assessment src={dataUrl} references={referencesUrl} modes={modes} />;
};

export default App;
