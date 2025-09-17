import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { updateTeamSettings, removePlayerFromTeam } from '../services/team';
import { getBasicTeam, getBasicTeamMembers } from '../services/basicFirestore';
import { updateTeamWithAutomaticRankings } from '../services/ruleBasedRanking';

const TeamSettingsScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [imageRequired, setImageRequired] = useState(false);
  const [rankingMode, setRankingMode] = useState('automatic');
  const [automaticRankingBy, setAutomaticRankingBy] = useState('totalMinutes');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      if (!userProfile?.teamId) {
        throw new Error('No team ID found for user');
      }
      
      console.log('Fetching team data for team ID:', userProfile.teamId);
      const [teamData, members] = await Promise.all([
        getBasicTeam(userProfile.teamId),
        getBasicTeamMembers(userProfile.teamId)
      ]);
      console.log('Team data received:', teamData);
      
      if (!teamData) {
        throw new Error('Team data not found');
      }
      
      // If team doesn't have ranking fields, add them with defaults
      const updatedTeamData = {
        ...teamData,
        imageRequired: teamData.imageRequired || false,
        rankingMode: teamData.rankingMode || 'automatic',
        automaticRankingBy: teamData.automaticRankingBy || 'totalMinutes',
        manualRankings: Array.isArray(teamData.manualRankings) ? teamData.manualRankings : []
      };
      
      // If the team was missing ranking fields, update it in the database
      if (!teamData.hasOwnProperty('rankingMode') || !teamData.hasOwnProperty('automaticRankingBy') || !teamData.hasOwnProperty('manualRankings')) {
        console.log('Updating team with missing ranking fields...');
        await updateTeamSettings(userProfile.teamId, {
          rankingMode: updatedTeamData.rankingMode,
          automaticRankingBy: updatedTeamData.automaticRankingBy,
          manualRankings: updatedTeamData.manualRankings
        });
      }
      
      setTeam(updatedTeamData);
      setTeamMembers(members || []);
      
      // Set current settings with safe defaults
      setImageRequired(updatedTeamData.imageRequired);
      setRankingMode(updatedTeamData.rankingMode);
      setAutomaticRankingBy(updatedTeamData.automaticRankingBy);
    } catch (error) {
      console.error('Error fetching team data:', error);
      Alert.alert('Error', `Failed to load team settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const updatedSettings = {
        imageRequired,
        rankingMode,
        automaticRankingBy,
        // Reset manual rankings if switching to automatic
        ...(rankingMode === 'automatic' && { manualRankings: [] })
      };

      await updateTeamSettings(userProfile.teamId, updatedSettings);
      
      // If switching to rule-based scoring, trigger automatic ranking calculation
      if (rankingMode === 'automatic' && automaticRankingBy === 'ruleBasedScore') {
        try {
          await updateTeamWithAutomaticRankings(userProfile.teamId);
          console.log('✅ Rule-based rankings calculated and applied');
        } catch (rankingError) {
          console.error('⚠️ Failed to calculate rule-based rankings:', rankingError);
          // Don't fail the entire save operation for this
        }
      }
      
      setSaving(false);
      
      Alert.alert('Success', 'Team settings updated successfully');
    } catch (error) {
      console.error('Error updating team settings:', error);
      setSaving(false);
      Alert.alert('Error', 'Failed to update team settings');
    }
  };

  const handleManualRankings = () => {
    navigation.navigate('ManualRankings');
  };

  const handleRemovePlayer = (player) => {
    Alert.alert(
      'Remove Player',
      `Are you sure you want to remove ${player.name} from the team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePlayerFromTeam(userProfile.teamId, player.id, user.uid);
              Alert.alert('Success', `${player.name} has been removed from the team`);
              // Refresh the data
              await fetchTeamData();
            } catch (error) {
              console.error('Error removing player:', error);
              Alert.alert('Error', `Failed to remove player: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading team settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load team data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Requirements</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require Photos</Text>
              <Text style={styles.settingDescription}>
                Make photo uploads mandatory for all workouts
              </Text>
            </View>
            <Switch
              value={imageRequired}
              onValueChange={setImageRequired}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leaderboard Rankings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Manual Rankings</Text>
            <Text style={styles.settingDescription}>
              {rankingMode === 'manual' 
                ? 'You control player order manually' 
                : 'Players ranked automatically by performance'}
            </Text>
          </View>
          <Switch
            value={rankingMode === 'manual'}
            onValueChange={(value) => setRankingMode(value ? 'manual' : 'automatic')}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {rankingMode === 'automatic' && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Ranking Criteria</Text>
            <Text style={styles.subSectionDescription}>
              Choose what determines automatic player rankings
            </Text>
            
            <View style={styles.criteriaContainer}>
              <TouchableOpacity
                style={[
                  styles.criteriaOption,
                  automaticRankingBy === 'totalMinutes' && styles.criteriaOptionSelected
                ]}
                onPress={() => setAutomaticRankingBy('totalMinutes')}
              >
                <View style={styles.criteriaContent}>
                  <MaterialIcons 
                    name="timer" 
                    size={20} 
                    color={automaticRankingBy === 'totalMinutes' ? '#007AFF' : '#8E8E93'} 
                  />
                  <Text style={[
                    styles.criteriaTitle,
                    automaticRankingBy === 'totalMinutes' && styles.criteriaTitleSelected
                  ]}>
                    Total Minutes
                  </Text>
                </View>
                {automaticRankingBy === 'totalMinutes' && (
                  <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.criteriaOption,
                  automaticRankingBy === 'totalWorkouts' && styles.criteriaOptionSelected
                ]}
                onPress={() => setAutomaticRankingBy('totalWorkouts')}
              >
                <View style={styles.criteriaContent}>
                  <MaterialIcons 
                    name="fitness-center" 
                    size={20} 
                    color={automaticRankingBy === 'totalWorkouts' ? '#007AFF' : '#8E8E93'} 
                  />
                  <Text style={[
                    styles.criteriaTitle,
                    automaticRankingBy === 'totalWorkouts' && styles.criteriaTitleSelected
                  ]}>
                    Total Workouts
                  </Text>
                </View>
                {automaticRankingBy === 'totalWorkouts' && (
                  <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.criteriaOption,
                  automaticRankingBy === 'thisWeekWorkouts' && styles.criteriaOptionSelected
                ]}
                onPress={() => setAutomaticRankingBy('thisWeekWorkouts')}
              >
                <View style={styles.criteriaContent}>
                  <MaterialIcons 
                    name="date-range" 
                    size={20} 
                    color={automaticRankingBy === 'thisWeekWorkouts' ? '#007AFF' : '#8E8E93'} 
                  />
                  <Text style={[
                    styles.criteriaTitle,
                    automaticRankingBy === 'thisWeekWorkouts' && styles.criteriaTitleSelected
                  ]}>
                    This Week's Workouts
                  </Text>
                </View>
                {automaticRankingBy === 'thisWeekWorkouts' && (
                  <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.criteriaOption,
                  automaticRankingBy === 'ruleBasedScore' && styles.criteriaOptionSelected
                ]}
                onPress={() => setAutomaticRankingBy('ruleBasedScore')}
              >
                <View style={styles.criteriaContent}>
                  <MaterialIcons 
                    name="analytics" 
                    size={20} 
                    color={automaticRankingBy === 'ruleBasedScore' ? '#007AFF' : '#8E8E93'} 
                  />
                  <View style={styles.criteriaTextContainer}>
                    <Text style={[
                      styles.criteriaTitle,
                      automaticRankingBy === 'ruleBasedScore' && styles.criteriaTitleSelected
                    ]}>
                      Comprehensive Score
                    </Text>
                    <Text style={styles.criteriaDescription}>
                      Workout type, intensity, streaks & consistency
                    </Text>
                  </View>
                </View>
                {automaticRankingBy === 'ruleBasedScore' && (
                  <MaterialIcons name="check-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {rankingMode === 'manual' && (
          <View style={styles.subSection}>
            <TouchableOpacity
              style={styles.manualRankingButton}
              onPress={handleManualRankings}
            >
              <View style={styles.manualRankingContent}>
                <MaterialIcons name="reorder" size={24} color="#007AFF" />
                <View style={styles.manualRankingInfo}>
                  <Text style={styles.manualRankingText}>Manage Player Order</Text>
                  <Text style={styles.manualRankingDescription}>
                    Drag and drop to set custom rankings
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Management</Text>
        <Text style={styles.sectionDescription}>
          Manage your team members and their access
        </Text>
        
        {teamMembers.filter(member => member.role === 'player').map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerEmail}>{player.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemovePlayer(player)}
            >
              <MaterialIcons name="remove-circle-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
        
        {teamMembers.filter(member => member.role === 'player').length === 0 && (
          <View style={styles.emptyPlayersContainer}>
            <MaterialIcons name="group" size={48} color="#C7C7CC" />
            <Text style={styles.emptyPlayersText}>No players have joined yet</Text>
            <Text style={styles.emptyPlayersSubtext}>Share your team code: {team.code}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Team Name:</Text>
          <Text style={styles.infoValue}>{team.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Team Code:</Text>
          <Text style={styles.infoValue}>{team.code}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 18,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  playerEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  removeButton: {
    padding: 8,
  },
  emptyPlayersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPlayersText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPlayersSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  subSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  subSectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 18,
  },
  criteriaContainer: {
    gap: 12,
  },
  criteriaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  criteriaOptionSelected: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  criteriaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 12,
  },
  criteriaTitleSelected: {
    color: '#007AFF',
  },
  criteriaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  criteriaDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  manualRankingButton: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  manualRankingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  manualRankingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  manualRankingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  manualRankingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TeamSettingsScreen;
