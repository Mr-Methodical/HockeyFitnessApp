import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import PlayerDashboard from '../screens/PlayerDashboard';
import TeamWorkoutsScreen from '../screens/TeamWorkoutsScreen';
import BadgesScreen from '../screens/BadgesScreen';
import AIWorkoutScreen from '../screens/AIWorkoutScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Tab = createBottomTabNavigator();

const PlayerTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'My Progress') {
            iconName = 'person';
          } else if (route.name === 'Team Workouts') {
            iconName = 'group';
          } else if (route.name === 'AI Workout') {
            iconName = 'fitness-center';
          } else if (route.name === 'Messages') {
            iconName = 'message';
          } else if (route.name === 'Badges') {
            iconName = 'emoji-events';
          }

          return <MaterialIcons name={iconName} size={size} color={focused ? '#000000' : '#666666'} />;
        },
        tabBarActiveTintColor: '#000000', // Black for maximum visibility  
        tabBarInactiveTintColor: '#666666', // Dark gray for inactive
        tabBarLabelStyle: {
          fontSize: 13, // Slightly larger
          fontWeight: 'bold', // Bolder for better visibility
        },
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
          elevation: 8, // Add shadow on Android
          shadowOffset: { width: 0, height: -2 }, // Add shadow on iOS
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 14, // Even larger
          fontWeight: 'bold',
          marginTop: -2, // Move text closer to icon
          textAlign: 'center',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen 
        name="My Progress" 
        component={PlayerDashboard}
        options={{
          tabBarLabel: 'Myself',
        }}
      />
      <Tab.Screen 
        name="Team Workouts" 
        component={TeamWorkoutsScreen}
        options={{
          tabBarLabel: 'My Team',
        }}
      />
      <Tab.Screen 
        name="AI Workout" 
        component={AIWorkoutScreen}
        options={{
          tabBarLabel: 'AI Trainer',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: focused ? '#000000' : '#666666',
              textAlign: 'center',
              marginBottom: 2,
            }}>
              Messages
            </Text>
          ),
          tabBarIconStyle: {
            marginBottom: 2,
          },
        }}
      />
      <Tab.Screen 
        name="Badges" 
        component={BadgesScreen}
        options={{
          tabBarLabel: 'Badges',
        }}
      />
    </Tab.Navigator>
  );
};

export default PlayerTabNavigator;
