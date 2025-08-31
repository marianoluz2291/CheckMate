
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useState, useEffect } from 'react'

import Dashboard from './screens/Dashboard';
import Auth from './screens/Auth';
import Profile from './screens/Profile';
import ChangePassword from './screens/ChangePassword';
import Settings from './screens/Settings';
import CreateTask from './screens/CreateTask';
import TaskDetail from './screens/TaskDetail';
import WeeklyDigest from './screens/WeeklyDigest';

import NetworkChecker from './functions//NetworkChecker';
import { ThemeContext, themeColors, getTheme } from './functions/ThemeContext';


import { firebase } from './config.js';
import { Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs({ isDarkMode, themeColor }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Tasks') {
            iconName = 'check-square';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else if (route.name === 'Digest') {
            iconName = 'bar-chart-2';
          }
          return <Feather name={iconName} size={size} color={color} accessibilityLabel={route.name} />;
        },
        tabBarActiveTintColor: themeColors[themeColor],
        tabBarInactiveTintColor: isDarkMode ? '#999' : '#B5B5B5',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#333' : 'white',
          borderTopColor: isDarkMode ? '#444' : '#FFE0EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Tasks" 
        component={Dashboard} 
        options={{ tabBarAccessibilityLabel: "View your tasks" }}
      />
      <Tab.Screen 
        name="Digest" 
        component={WeeklyDigest} 
        options={{ tabBarAccessibilityLabel: "View your weekly task digest" }}
      />
      <Tab.Screen 
        name="Settings" 
        component={Settings} 
        options={{ tabBarAccessibilityLabel: "View and modify app settings" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('pink');

  const theme = getTheme(isDarkMode, themeColor);

  const themeContextValue = {
    isDarkMode,
    setIsDarkMode,
    themeColor,
    setThemeColor,
    themeColors,
    theme,
  };

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState();

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = firebase.auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) return null;

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <NetworkChecker /> 
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Auth" component={Auth} />
          ) : (
            <>
              <Stack.Screen name="Main">
                {() => <MainTabs isDarkMode={isDarkMode} themeColor={themeColor} />}
              </Stack.Screen>
              <Stack.Screen name="Profile" component={Profile} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} />
              <Stack.Screen name="CreateTask" component={CreateTask} />
              <Stack.Screen name="TaskDetail" component={TaskDetail} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}


