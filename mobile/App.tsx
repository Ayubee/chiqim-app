import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { ExpenseProvider } from '@/context/ExpenseContext';
import { AppNavigator } from '@/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <ExpenseProvider>
          <AppNavigator />
        </ExpenseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
