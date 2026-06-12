import React, { createContext, useContext } from "react";
import { View } from "../navigation.types";

interface NavigationContextType {
  onNavigate: (view: View, props?: any) => void;
}

export const NavigationContext = createContext<
  NavigationContextType | undefined
>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
