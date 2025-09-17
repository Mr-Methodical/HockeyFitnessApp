import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';

const ChallengesScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { currentTheme } = useTheme();

  const challenges = [
    {
      id: 1,
      title: "7-Day Streak",
      description: "Complete a workout for 7 consecutive days",
      progress: 3,
      target: 7,
      reward: "Consistency Badge",
      icon: "fitness-center"
    },
    {
      id: 2,
      title: "Team Player",
      description: "Leave 10 encouraging comments on teammate workouts",
      progress: 2,
      target: 10,
      reward: "Team Spirit Badge",
      icon: "people"
    },
    {
      id: 3,
      title: "Cardio Champion",
      description: "Complete 5 cardio workouts this month",
      progress: 1,
      target: 5,
      reward: "Cardio Badge",
      icon: "directions-run"
    },
    {
      id: 4,
      title: "Duration Master",
      description: "Log 10 hours of total workout time",
      progress: 450, // minutes
      target: 600, // 10 hours in minutes
      reward: "Endurance Badge",
      icon: "timer",
      unit: "min"
    }
  ];

  const renderProgressBar = (progress, target) => {
    const percentage = Math.min((progress / target) * 100, 100);
    
    return (
      <View style={[styles.progressBarContainer, { backgroundColor: currentTheme.inputBackground || '#f0f0f0' }]}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${percentage}%`,
              backgroundColor: currentTheme.primary 
            }
          ]} 
        />
      </View>
    );
  };

  const formatProgressText = (challenge) => {
    if (challenge.unit === "min") {
      const progressHours = Math.floor(challenge.progress / 60);
      const progressMins = challenge.progress % 60;
      const targetHours = Math.floor(challenge.target / 60);
      const targetMins = challenge.target % 60;
      
      return `${progressHours}h ${progressMins}m / ${targetHours}h ${targetMins}m`;
    }
    
    return `${challenge.progress} / ${challenge.target}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Challenges</Text>
        <MaterialIcons name="emoji-events" size={24} color={currentTheme.primary} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Message */}
        <View style={[styles.welcomeCard, { backgroundColor: currentTheme.surface }]}>
          <MaterialIcons name="whatshot" size={32} color={currentTheme.primary} />
          <Text style={[styles.welcomeTitle, { color: currentTheme.text }]}>
            Take on Challenges!
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: currentTheme.textSecondary }]}>
            Complete challenges to earn badges and boost your team spirit
          </Text>
        </View>

        {/* Active Challenges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Active Challenges</Text>
          
          {challenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={[styles.challengeCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.challengeHeader}>
                <View style={[styles.challengeIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
                  <MaterialIcons 
                    name={challenge.icon} 
                    size={24} 
                    color={currentTheme.primary} 
                  />
                </View>
                
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: currentTheme.text }]}>
                    {challenge.title}
                  </Text>
                  <Text style={[styles.challengeDescription, { color: currentTheme.textSecondary }]}>
                    {challenge.description}
                  </Text>
                </View>

                {challenge.progress >= challenge.target && (
                  <MaterialIcons name="check-circle" size={24} color={currentTheme.success || '#4CAF50'} />
                )}
              </View>

              <View style={styles.challengeProgress}>
                {renderProgressBar(challenge.progress, challenge.target)}
                
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressText, { color: currentTheme.textSecondary }]}>
                    {formatProgressText(challenge)}
                  </Text>
                  <Text style={[styles.rewardText, { color: currentTheme.primary }]}>
                    <Æ {challenge.reward}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming Soon Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Coming Soon</Text>
          
          <View style={[styles.comingSoonCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <MaterialIcons name="upcoming" size={32} color={currentTheme.textSecondary} />
            <Text style={[styles.comingSoonTitle, { color: currentTheme.text }]}>
              More Challenges
            </Text>
            <Text style={[styles.comingSoonSubtitle, { color: currentTheme.textSecondary }]}>
              Weekly team challenges, seasonal events, and more exciting rewards are coming soon!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set dynamically
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    // backgroundColor and borderBottomColor set dynamically
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // color set dynamically
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    // backgroundColor set dynamically
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    // color set dynamically
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    // color set dynamically
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    // color set dynamically
  },
  challengeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    // backgroundColor and borderColor set dynamically
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    // backgroundColor set dynamically with opacity
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    // color set dynamically
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
    // color set dynamically
  },
  challengeProgress: {
    marginTop: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
    // backgroundColor set dynamically
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    // backgroundColor set dynamically
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    // color set dynamically
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    // color set dynamically
  },
  comingSoonCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    // backgroundColor and borderColor set dynamically
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    // color set dynamically
  },
  comingSoonSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    // color set dynamically
  },
});

export default ChallengesScreen;