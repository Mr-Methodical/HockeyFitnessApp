import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Badge = ({ badge, size = 'medium', showDescription = false, expandable = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sizeStyles = {
    small: {
      container: { width: 40, height: 40 },
      icon: { fontSize: 18 },
      name: { fontSize: 10 }
    },
    medium: {
      container: { width: 60, height: 60 },
      icon: { fontSize: 24 },
      name: { fontSize: 12 }
    },
    large: {
      container: { width: 80, height: 80 },
      icon: { fontSize: 32 },
      name: { fontSize: 14 }
    }
  };

  const currentSize = sizeStyles[size];

  const BadgeContent = ({ isModal = false }) => (
    <View style={[
      styles.container, 
      isModal ? styles.modalBadgeContainer : currentSize.container, 
      { backgroundColor: badge.color }
    ]}>
      <Text style={[
        styles.icon, 
        isModal ? styles.modalIcon : currentSize.icon
      ]}>
        {badge.icon}
      </Text>
      <Text style={[
        styles.name, 
        isModal ? styles.modalName : currentSize.name
      ]} numberOfLines={isModal ? undefined : 1}>
        {badge.name}
      </Text>
      {(showDescription || isModal) && badge.description && (
        <Text style={[
          styles.description,
          isModal ? styles.modalDescription : {}
        ]} numberOfLines={isModal ? undefined : 2}>
          {badge.description}
        </Text>
      )}
      {isModal && badge.requirements && (
        <Text style={styles.modalRequirements}>
          Requirements: {badge.requirements}
        </Text>
      )}
      {isModal && badge.earnedDate && (
        <Text style={styles.modalEarnedDate}>
          Earned: {new Date(badge.earnedDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  if (expandable) {
    return (
      <>
        <TouchableOpacity onPress={() => setIsExpanded(true)}>
          <BadgeContent />
        </TouchableOpacity>
        
        <Modal
          visible={isExpanded}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsExpanded(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Badge Details</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setIsExpanded(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <BadgeContent isModal={true} />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <BadgeContent />;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    margin: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  icon: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  name: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  description: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    minWidth: 280,
    maxWidth: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBadgeContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginTop: 6,
    lineHeight: 18,
  },
  modalRequirements: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    lineHeight: 18,
  },
  modalEarnedDate: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default Badge;
