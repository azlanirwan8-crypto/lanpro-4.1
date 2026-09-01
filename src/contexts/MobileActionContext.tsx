import React, { createContext, useContext, useState, useCallback } from "react";

export interface MobileAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  canCreate: boolean;
}

interface MobileActionContextType {
  activeAction: MobileAction | null;
  registerAction: (action: MobileAction) => void;
  unregisterAction: (id: string) => void;
}

const MobileActionContext = createContext<MobileActionContextType>({
  activeAction: null,
  registerAction: () => {},
  unregisterAction: () => {},
});

export const MobileActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAction, setActiveAction] = useState<MobileAction | null>(null);

  const registerAction = useCallback((action: MobileAction) => {
    setActiveAction(action);
  }, []);

  const unregisterAction = useCallback((id: string) => {
    setActiveAction((prev) => (prev?.id === id ? null : prev));
  }, []);

  return (
    <MobileActionContext.Provider value={{ activeAction, registerAction, unregisterAction }}>
      {children}
    </MobileActionContext.Provider>
  );
};

export const useMobileAction = () => useContext(MobileActionContext);
