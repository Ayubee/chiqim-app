import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import HomeScreen from '@/screens/HomeScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import LoginScreen from '@/screens/LoginScreen';
import AddExpenseScreen from '@/screens/AddExpenseScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.tabInactive,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tab.Screen
            name="Home"
            options={{
              tabBarLabel: 'Bosh sahifa',
              tabBarIcon: ({ color, focused }) => (
                <Text style={[styles.tabIcon, { color }]}>{focused ? '●' : '○'}</Text>
              ),
            }}
          >
            {(props) => (
              <HomeScreen
                {...props}
                onOpenAddExpense={() => setShowAddModal(true)}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              tabBarLabel: 'Tarix',
              tabBarIcon: ({ color, focused }) => (
                <Text style={[styles.tabIcon, { color }]}>{focused ? '■' : '□'}</Text>
              ),
            }}
          />

          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profil',
              tabBarIcon: ({ color, focused }) => (
                <Text style={[styles.tabIcon, { color }]}>{focused ? '◆' : '◇'}</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>

      {/* Chiqim qo'shish Modal oynasi */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AddExpenseScreen onClose={() => setShowAddModal(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
});
