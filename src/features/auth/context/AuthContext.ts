import { createContext } from 'react';

import type { AuthContextValue } from '../types';

/** Session, utilisateur et langue de l'app. Fourni par `AuthProvider`, lu par `useAuth()`. */
export const AuthContext = createContext<AuthContextValue | null>(null);
