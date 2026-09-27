import React from "react";
import AppContainer from "./AppContainer";
import { MobileActionProvider } from "./contexts/MobileActionContext";

/**
 * Lanpro Main Application Entry Point
 *
 * The massive App() state logic and UI rendering has been refactored into AppContainer.tsx
 * to keep this file clean, modular, and easy to maintain.
 */
function App() {
  return (
    <MobileActionProvider>
      <AppContainer />
    </MobileActionProvider>
  );
}

export default App;
