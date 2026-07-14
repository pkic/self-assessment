import React, { createContext, useContext, useMemo, useState } from "react";
import type { HelpContext, HelpTopicKey } from "./helpTopics";
import { HelpPanel } from "./HelpPanel";

interface HelpApi {
  openHelp: (topic?: HelpTopicKey, sectionId?: string) => void;
  closeHelp: () => void;
}
// The default is a no-op so a component can call useHelp() outside a
// provider without crashing (its "?" button just becomes inert). The app
// always wraps these components in HelpProvider in production.
const NOOP_HELP: HelpApi = { openHelp: () => {}, closeHelp: () => {} };
const Ctx = createContext<HelpApi>(NOOP_HELP);
export const useHelp = (): HelpApi => useContext(Ctx);

export const HelpProvider: React.FC<{
  helpContext: HelpContext;
  children: React.ReactNode;
}> = ({ helpContext, children }) => {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<HelpTopicKey | undefined>(undefined);
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);

  const api = useMemo<HelpApi>(
    () => ({
      openHelp: (t, s) => {
        setTopic(t);
        setSectionId(s);
        setOpen(true);
      },
      closeHelp: () => setOpen(false),
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {open && (
        <HelpPanel
          helpContext={helpContext}
          requestedTopic={topic}
          requestedSectionId={sectionId}
          onNavigate={(t) => {
            setTopic(t);
            setSectionId(undefined);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </Ctx.Provider>
  );
};
