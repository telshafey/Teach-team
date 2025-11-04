import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SupportTicket, TicketComment, TicketStatus, TicketPriority, TeamMember } from '@shared/types';
import { useSupportContext } from '@shared/contexts/SupportContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useAuth } from '@shared/contexts/AuthContext';
import StatusBadge from '../ui/StatusBadge';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

interface SupportTicketDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  ticket: SupportTicket;
}

const SupportTicketDetailModal: React.FC<SupportTicketDetailModalProps> = ({ isVisible, onClose, ticket }) => {
  const { comments, addComment, updateTicket } = useSupportContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { currentUser } = useAuth();
  
  const canManage = hasPermission('manage_support_tickets');
  const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);

  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);
  const [newAssignee, setNewAssignee] = useState(ticket.assigneeId?.toString() || '');

  useEffect(() => {
    if (ticket) {
        setNewStatus(ticket.status);
        setNewPriority(ticket.priority);
        setNewAssignee(ticket.assigneeId?.toString() || '');
    }
  }, [ticket]);

  const ticketComments = useMemo(() => {
    return comments
      .filter(c => c.ticketId === ticket.id)
      .filter(c => canManage || !c.isInternal) // Show internal notes only to managers
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, ticket.id, canManage]);
  
  const creator = membersMap[ticket.creatorId];

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSaving(true);
    try {
        await addComment({ ticketId: ticket.id, text: newComment, isInternal: false });
        setNewComment('');
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleUpdate = async () => {
    const updates: Partial<SupportTicket> = {};
    if (newStatus !== ticket.status) updates.status = newStatus;
    if (newPriority !== ticket.priority) updates.priority = newPriority;
    const assigneeId = newAssignee ? parseInt(newAssignee, 10) : undefined;
    if (assigneeId !== ticket.assigneeId) updates.assigneeId = assigneeId;

    if (Object.keys(updates).length > 0) {
        await updateTicket(ticket.id, updates);
    }
  };

  if (!isVisible || !currentUser) return null;

  return (
    <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
    >
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                    <Ionicons name="close-circle" size={30} color="#9ca3af" />
                </TouchableOpacity>
                <Text style={styles.title}>{ticket.subject}</Text>
                <View style={styles.metaContainer}>
                    <StatusBadge status={ticket.status} type="support_ticket_status" />
                    <View style={{marginHorizontal: 4}}/>
                    <StatusBadge status={ticket.priority} type="support_ticket_priority" />
                </View>
                
                <ScrollView style={styles.scrollView}>
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{ticket.description}</Text>
                        <Text style={styles.creatorText}>مقدمة من {creator?.name} في {format(parseISO(ticket.createdAt), 'd MMM', { locale: arSA })}</Text>
                    </View>
                    
                    {ticketComments.map(comment => {
                         const author = membersMap[comment.authorId];
                         return (
                            <View key={comment.id} style={styles.commentContainer}>
                                <View style={{alignItems: 'flex-end'}}>
                                    <Text style={styles.authorName}>{author?.name}</Text>
                                    <Text style={styles.commentDate}>{format(parseISO(comment.createdAt), 'p, d MMM', { locale: arSA })}</Text>
                                </View>
                                <Text style={styles.commentText}>{comment.text}</Text>
                            </View>
                         )
                    })}
                </ScrollView>

                <View style={styles.inputContainer}>
                    <TextInput style={styles.commentInput} value={newComment} onChangeText={setNewComment} placeholder="أضف ردًا..." multiline />
                    <TouchableOpacity onPress={handleCommentSubmit} style={styles.sendButton} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={20} color="white" />}
                    </TouchableOpacity>
                </View>
                
                 {canManage && (
                    <View style={styles.adminSection}>
                        <View style={styles.pickerRow}>
                            <View style={styles.pickerWrapper}>
                                <Picker selectedValue={newStatus} onValueChange={itemValue => setNewStatus(itemValue as TicketStatus)}>
                                    <Picker.Item label="مفتوحة" value="open" />
                                    <Picker.Item label="قيد المعالجة" value="in-progress" />
                                    <Picker.Item label="مغلقة" value="closed" />
                                </Picker>
                            </View>
                            <View style={styles.pickerWrapper}>
                                <Picker selectedValue={newAssignee} onValueChange={itemValue => setNewAssignee(itemValue as string)}>
                                    <Picker.Item label="غير معين" value="" />
                                    {teamMembers.map(m => <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />)}
                                </Picker>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}><Text style={styles.updateButtonText}>تحديث</Text></TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 40, height: '90%' },
    closeIcon: { position: 'absolute', top: 10, right: 10 },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', marginBottom: 8 },
    metaContainer: { flexDirection: 'row-reverse', marginBottom: 16 },
    scrollView: { flex: 1 },
    descriptionContainer: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, marginBottom: 16 },
    descriptionText: { fontSize: 15, textAlign: 'right', lineHeight: 22 },
    creatorText: { fontSize: 12, color: '#64748b', textAlign: 'right', marginTop: 8 },
    commentContainer: { backgroundColor: '#e0f2fe', borderRadius: 8, padding: 12, marginBottom: 10, alignSelf: 'flex-start', maxWidth: '80%' },
    authorName: { fontWeight: 'bold', fontSize: 12, textAlign: 'right' },
    commentDate: { fontSize: 10, color: '#64748b', textAlign: 'right' },
    commentText: { fontSize: 14, textAlign: 'right', marginTop: 4 },
    inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 10 },
    commentInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, textAlign: 'right' },
    sendButton: { backgroundColor: '#0ea5e9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    adminSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    pickerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
    pickerWrapper: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginHorizontal: 4 },
    updateButton: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
    updateButtonText: { color: 'white', fontWeight: 'bold' },
});

export default SupportTicketDetailModal;
