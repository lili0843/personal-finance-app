import React from 'react';
import { AppProvider } from './contexts/AppContext';
import AuthGate from './components/Auth/AuthGate';

export default function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  );
}
