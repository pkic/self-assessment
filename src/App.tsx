import React from "react";
import { Assessment } from "./components/Assessment/Assessment";

interface AppProps {
  dataUrl: string | null;
  referencesUrl: string | null;
  modes?: string | null;
}

const App: React.FC<AppProps> = ({ dataUrl, referencesUrl, modes }) => {
  return <Assessment src={dataUrl} references={referencesUrl} modes={modes} />;
};

export default App;
