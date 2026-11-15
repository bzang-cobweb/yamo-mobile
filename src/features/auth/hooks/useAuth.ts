import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../types';

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth doit être utilisé sous <AuthProvider>.');
  }

  return value;
}
