import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../utils/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// Dashboard screens
import CoachDashboard from '../screens/CoachDashboard';
import PlayerTabNavigator from './PlayerTabNavigator';
import TeamWorkoutsScreen from '../screens/TeamWorkoutsScreen';

// Additional screens
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import AIWorkoutDetailScreen from '../screens/AIWorkoutDetailScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import MassMessageScreen from '../screens/MassMessageScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import TeamSettingsScreen from '../screens/TeamSettingsScreen';
import ManualRankingsScreen from '../screens/ManualRankingsScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import BadgesScreen from '../screens/BadgesScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isCoach, isPlayer, isGroupMember, userProfile } = useAuth();
  
  console.log('🧭 AppNavigator - isCoach:', isCoach);
  console.log('🧭 AppNavigator - isPlayer:', isPlayer);
  console.log('🧭 AppNavigator - isGroupMember:', isGroupMember);
  console.log('🧭 AppNavigator - userProfile.role:', userProfile?.role);
  console.log('🧭 AppNavigator - userProfile.teamId:', userProfile?.teamId);
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isCoach ? (
        <Stack.Screen name="CoachDashboard" component={CoachDashboard} />
      ) : (
        <Stack.Screen name="PlayerTabs" component={PlayerTabNavigator} />
      )}
      <Stack.Screen name="LogWorkout" component={LogWorkoutScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="AIWorkoutDetail" component={AIWorkoutDetailScreen} />
      <Stack.Screen name="TeamWorkouts" component={TeamWorkoutsScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} />
      <Stack.Screen name="MassMessage" component={MassMessageScreen} />
      <Stack.Screen name="TeamSettings" component={TeamSettingsScreen} />
      <Stack.Screen name="ManualRankings" component={ManualRankingsScreen} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
    </Stack.Navigator>
  );
};

const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
