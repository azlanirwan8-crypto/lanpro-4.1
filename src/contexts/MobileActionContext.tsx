import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";

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
  // onClick sering dibuat ulang tiap render induk; simpan di ref supaya
  // registerAction tidak setState beruntun → Maximum update depth (#324 / #289).
  const onClickRef = useRef<(() => void) | null>(null);
  // Effect cleanup sering unregister lalu effect baru register ID yang sama
  // dalam tick yang sama (deps callback tidak stabil). Tunda unregister ke
  // microtask dan batalkan bila ID itu baru di-register lagi.
  const skipUnregisterForIdRef = useRef<string | null>(null);

  const registerAction = useCallback((action: MobileAction) => {
    skipUnregisterForIdRef.current = action.id;
    onClickRef.current = action.onClick;
    setActiveAction((prev) => {
      if (
        prev &&
        prev.id === action.id &&
        prev.label === action.label &&
        prev.canCreate === action.canCreate
      ) {
        return prev;
      }
      return {
        id: action.id,
        label: action.label,
        icon: action.icon,
        canCreate: action.canCreate,
        onClick: () => {
          onClickRef.current?.();
        },
      };
    });
  }, []);

  const unregisterAction = useCallback((id: string) => {
    queueMicrotask(() => {
      if (skipUnregisterForIdRef.current === id) {
        return;
      }
      setActiveAction((prev) => {
        if (prev?.id !== id) return prev;
        onClickRef.current = null;
        return null;
      });
    });
  }, []);

  const value = useMemo(
    () => ({ activeAction, registerAction, unregisterAction }),
    [activeAction, registerAction, unregisterAction]
  );

  return <MobileActionContext.Provider value={value}>{children}</MobileActionContext.Provider>;
};

export const useMobileAction = () => useContext(MobileActionContext);
