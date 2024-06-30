import React from 'react';
import { Assessment } from './components/Assessment/Assessment';

interface AppProps {
  dataUrl: string | null;
}

const App: React.FC<AppProps> = ({ dataUrl }) => {
  return <Assessment src={dataUrl} />;
};

export default App;
