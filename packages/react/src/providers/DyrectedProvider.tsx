import React, { createContext, useContext, useMemo } from 'react';
import { DyrectedClient } from '@dyrected/sdk';

export interface DyrectedContextValue {
  client: DyrectedClient;
}

const DyrectedContext = createContext<DyrectedContextValue | null>(null);

export interface DyrectedProviderProps {
  client: DyrectedClient;
  children: React.ReactNode;
}

/**
 * DyrectedProvider — Provides a Dyrected SDK instance to the React tree.
 */
export function DyrectedProvider({ client, children }: DyrectedProviderProps) {
  const value = useMemo(() => ({ client }), [client]);

  return (
    <DyrectedContext.Provider value={value}>
      {children}
    </DyrectedContext.Provider>
  );
}

export function useDyrectedContext() {
  const context = useContext(DyrectedContext);
  if (!context) {
    throw new Error('useDyrected must be used within a DyrectedProvider');
  }
  return context;
}
