import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Meeting, Project, TeamMember } from '@shared/types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface UpcomingMeetingCardProps {
    meeting: Meeting;
    project: Project | undefined;
    participants: TeamMember[];
    onJoinMeeting: (meeting: Meeting) => void;
}

const UpcomingMeetingCard: React.FC<UpcomingMeetingCardProps> = ({ meeting, project, participants, onJoinMeeting }) => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>{meeting.title}</Text>
                    {meeting.startTime && (
                        <Text style={styles.subtitle}>
                            {project && `${project.name} • `}
                            {format(parseISO(meeting.startTime), 'eeee, d MMM, p', { locale: arSA })}
                        </Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => onJoinMeeting(meeting)} style={styles.joinButton}>
                    <Ionicons name="videocam-outline" size={20} color="white" />
                    <Text style={styles.joinButtonText}>انضمام</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.participantsContainer}>
                <Text style={styles.participantsLabel}>المشاركون:</Text>
                <View style={styles.avatarsContainer}>
                    {participants.slice(0, 5).map((p, index) => (
                        <Image key={p.id} source={{ uri: p.avatarUrl }} style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0 }]} />
                    ))}
                    {participants.length > 5 && (
                        <View style={[styles.avatar, styles.moreAvatar, { marginLeft: -10 }]}>
                            <Text style={styles.moreAvatarText}>+{participants.length - 5}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerText: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'right',
    },
    joinButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#16a34a', // green-600
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    joinButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 6,
    },
    participantsContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    participantsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'right',
        marginBottom: 8,
    },
    avatarsContainer: {
        flexDirection: 'row',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'white',
    },
    moreAvatar: {
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569',
    },
});

export default UpcomingMeetingCard;
