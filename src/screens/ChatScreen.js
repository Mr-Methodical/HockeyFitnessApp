import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { 
  getConversationMessages, 
  sendDirectMessage, 
  markMessagesAsRead,
  sendGroupMessage,
  getGroupMessages,
  markGroupMessagesAsRead,
  updateTeam
} from '../services/team';

const ChatScreen = ({ route, navigation }) => {
  const { partnerId, partnerName, partnerRole, isGroupChat, teamId, groupName } = route.params;
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState(groupName || 'Group Chat');
  const [currentGroupName, setCurrentGroupName] = useState(groupName || 'Group Chat');
  const flatListRef = useRef(null);

  // Validate navigation parameters
  useEffect(() => {
    if (!isGroupChat && !partnerId) {
      console.error('❌ ChatScreen: Missing partnerId for direct message');
      Alert.alert('Error', 'Invalid chat configuration');
      navigation.goBack();
      return;
    }
    
    if (isGroupChat && !teamId) {
      console.error('❌ ChatScreen: Missing teamId for group chat');
      Alert.alert('Error', 'Invalid group chat configuration');
      navigation.goBack();
      return;
    }
    
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (isGroupChat) {
        // Load group chat messages
        console.log('📱 Loading group chat messages for team:', teamId);
        const groupMessages = await getGroupMessages(teamId);
        setMessages(groupMessages);
        
        // Mark group messages as read for this user
        if (groupMessages.length > 0) {
          console.log('📖 ChatScreen - marking group messages as read for user:', user.uid);
          await markGroupMessagesAsRead(teamId, user.uid);
          console.log('✅ ChatScreen - group messages marked as read');
        }
      } else {
        // Load direct messages
        const messagesData = await getConversationMessages(user.uid, partnerId);
        setMessages(messagesData);
        
        // Mark messages as read
        const unreadMessageIds = messagesData
          .filter(msg => msg.recipientId === user.uid && !msg.read)
          .map(msg => msg.id);
        
        console.log('📧 ChatScreen - messages loaded:', {
          totalMessages: messagesData.length,
          unreadCount: unreadMessageIds.length,
          unreadIds: unreadMessageIds
        });
        
        if (unreadMessageIds.length > 0) {
          console.log('📖 ChatScreen - marking messages as read:', unreadMessageIds);
          await markMessagesAsRead(unreadMessageIds);
          console.log('✅ ChatScreen - messages marked as read');
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !userProfile || sending) return;

    // Validation: Only coaches can initiate conversations, players can only respond
    if (!isGroupChat && userProfile.role === 'player' && messages.length === 0) {
      Alert.alert(
        'Cannot Send Message',
        'Players can only respond to messages from coaches. Wait for your coach to message you first.'
      );
      return;
    }

    try {
      setSending(true);
      
      if (isGroupChat) {
        // Send group chat message
        console.log('📱 Sending group chat message to team:', teamId);
        
        const groupMessageData = {
          text: newMessage.trim(),
          senderName: userProfile.name,
          senderRole: userProfile.role,
          teamId: teamId
        };

        console.log('📢 Sending group message with data:', groupMessageData);
        const sentMessage = await sendGroupMessage(groupMessageData, user.uid);
        
        // Add the new message to the list
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        return;
      }
      
      // Validate partnerId for direct messages
      if (!partnerId) {
        console.error('❌ Cannot send direct message: partnerId is undefined');
        Alert.alert('Error', 'Cannot send message: recipient not specified');
        setSending(false);
        return;
      }
      
      const messageData = {
        text: newMessage.trim(),
        senderName: userProfile.name,
        senderRole: userProfile.role || 'player',
        recipientId: partnerId,
        recipientName: partnerName,
        recipientRole: partnerRole,
        teamId: userProfile.teamId
      };

      console.log('📨 Sending direct message with data:', messageData);
      const sentMessage = await sendDirectMessage(messageData, user.uid);
      
      // Add the new message to the list
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEditGroupName = () => {
    if (!isGroupChat) return;
    setTempGroupName(currentGroupName);
    setEditingGroupName(true);
  };

  const handleSaveGroupName = async () => {
    if (!tempGroupName.trim() || tempGroupName.trim() === currentGroupName) {
      setEditingGroupName(false);
      return;
    }

    try {
      console.log('🏷️ Updating group name from', currentGroupName, 'to', tempGroupName.trim());
      await updateTeam(teamId, { name: tempGroupName.trim() });
      setCurrentGroupName(tempGroupName.trim());
      setEditingGroupName(false);
      Alert.alert('Success', 'Group name updated successfully!');
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name. Please try again.');
    }
  };

  const handleCancelEditGroupName = () => {
    setTempGroupName(currentGroupName);
    setEditingGroupName(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '';
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId === user.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {/* Show sender name for group messages (only for others' messages) */}
        {isGroupChat && !isOwnMessage && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerInfo}
            onPress={isGroupChat ? handleEditGroupName : undefined}
            disabled={!isGroupChat}
          >
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {isGroupChat ? currentGroupName : partnerName}
                {isGroupChat && <MaterialIcons name="edit" size={16} color="#666" style={styles.editIcon} />}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isGroupChat ? '👥 Group Chat • Tap to edit name' : 
                 partnerRole === 'coach' ? '👨‍💼 Coach' : 
                 partnerRole === 'group_member' ? '👥 Group Member' : '🏒 Player'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.placeholder} />
        </View>

        {/* Group Name Edit Modal */}
        <Modal
          visible={editingGroupName}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelEditGroupName}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Group Name</Text>
              
              <TextInput
                style={styles.modalInput}
                value={tempGroupName}
                onChangeText={setTempGroupName}
                placeholder="Enter group name"
                maxLength={50}
                autoFocus={true}
                onSubmitEditing={handleSaveGroupName}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelEditGroupName}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveGroupName}
                  disabled={!tempGroupName.trim()}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={
              userProfile?.role === 'player' && messages.length === 0
                ? 'Wait for your coach to message you first'
                : 'Type a message...'
            }
            multiline
            maxLength={500}
            editable={!(userProfile?.role === 'player' && messages.length === 0)}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending || (userProfile?.role === 'player' && messages.length === 0)) 
                && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending || (userProfile?.role === 'player' && messages.length === 0)}
          >
            <MaterialIcons 
              name="send" 
              size={24} 
              color={
                (!newMessage.trim() || sending || (userProfile?.role === 'player' && messages.length === 0))
                  ? '#ccc' 
                  : 'white'
              } 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  placeholder: {
    width: 34,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    marginLeft: 12,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  editIcon: {
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
