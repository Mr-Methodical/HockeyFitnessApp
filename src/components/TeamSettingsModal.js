import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { updateTeam } from '../services/team';

const TeamSettingsModal = ({ visible, onClose, team, onTeamUpdate }) => {
  const [imageRequired, setImageRequired] = useState(team?.imageRequired || false);
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = async () => {
    if (!team?.id) return;

    setLoading(true);
    try {
      await updateTeam(team.id, {
        imageRequired: imageRequired
      });
      
      // Update the team data in parent component
      onTeamUpdate({
        ...team,
        imageRequired: imageRequired
      });
      
      Alert.alert(
        'Settings Updated',
        `Images are now ${imageRequired ? 'required' : 'optional'} for workout logging.`
      );
      
      onClose();
    } catch (error) {
      console.error('Error updating team settings:', error);
      Alert.alert('Error', 'Failed to update team settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Settings</Text>
          <TouchableOpacity 
            onPress={handleSaveSettings} 
            style={styles.saveButton}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Workout Requirements</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require Images</Text>
              <Text style={styles.settingDescription}>
                When enabled, players must include a photo with every workout log
              </Text>
            </View>
            <Switch
              value={imageRequired}
              onValueChange={setImageRequired}
              trackColor={{ false: '#f0f0f0', true: '#007AFF30' }}
              thumbColor={imageRequired ? '#007AFF' : '#ccc'}
            />
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              This setting affects all future workout submissions. Existing workouts remain unchanged.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginLeft: 10,
  },
});

export default TeamSettingsModal;
