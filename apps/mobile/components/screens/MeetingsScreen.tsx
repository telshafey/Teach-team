import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, SectionList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useMeetingContext } from '@shared/contexts/MeetingContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { Meeting, Project, TeamMember } from '@shared/types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import UpcomingMeetingCard from '../meetings/UpcomingMeetingCard';
import MeetingFormModal from '../modals/MeetingFormModal';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

const WHEREBY_SUBDOMAIN = 'tech-bokra.whereby.com';

const MeetingsScreen: React.FC = () => {
    const { handleAddMeeting, handleDeleteMeeting, handleJoinMeeting } = useMeetingContext();
    const { teamMembers, hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    const { siteSettings } = useSettingsContext();

    const [isFormOpen, setIsFormOpen] = useState(false);

    const { data: meetings = [], isLoading: isMeetingsLoading } = useQuery<Meeting[]>({
        queryKey: ['meetings'],
        queryFn: () => api.getAll(supabaseClient!, 'meetings'),
        enabled: !!supabaseClient,
    });

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects_list'],
        queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'),
        enabled: !!supabaseClient,
    });

    const projectsMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>), [projects]);
    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<number, TeamMember>), [teamMembers]);

    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return currentUser.roleId === 'gm'
            ? meetings
            : meetings.filter(m => m.members?.includes(currentUser.id));
    }, [meetings, currentUser]);

    const meetingSections = useMemo(() => {
        const now = new Date();
        const upcoming: Meeting[] = [];
        const past: Meeting[] = [];

        myMeetings.forEach(m => {
            if (m.endTime && new Date(m.endTime) < now) {
                past.push(m);
            } else {
                upcoming.push(m);
            }
        });
        
        upcoming.sort((a,b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
        past.sort((a,b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime());

        const sections = [];
        if (upcoming.length > 0) sections.push({ title: `الاجتماعات القادمة (${upcoming.length})`, data: upcoming });
        if (past.length > 0) sections.push({ title: `أرشيف الاجتماعات (${past.length})`, data: past });
        
        return sections;
    }, [myMeetings]);

    const handleJoin = (meeting: Meeting) => {
        if (!currentUser) return;
        handleJoinMeeting(meeting.id);

        const params = new URLSearchParams({
            displayName: currentUser.name,
            lang: 'ar',
            precallReview: 'off',
        });
        
        const meetingSettings = siteSettings?.meetingSettings;
        if (meetingSettings) {
            if (meetingSettings.startWithAudioMuted) params.append('audio', 'off');
            if (meetingSettings.startWithVideoMuted) params.append('video', 'off');
            if (meetingSettings.hideChat) params.append('chat', 'off');
            if (meetingSettings.hidePeople) params.append('people', 'off');
        }

        let hostKey = siteSettings?.meetingSettings?.wherebyHostRoomKey;
        if (currentUser.id === meeting.creatorId && hostKey) {
            if (hostKey.includes('?roomKey=')) {
                 try {
                    const url = new URL(hostKey);
                    const keyFromUrl = url.searchParams.get('roomKey');
                    if (keyFromUrl) hostKey = keyFromUrl;
                } catch (e) { console.warn("Could not parse host room key URL.", e); }
            }
            params.append('roomKey', hostKey);
        }

        const url = `https://${WHEREBY_SUBDOMAIN}/${meeting.roomName}?${params.toString()}`;
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("خطأ", `لا يمكن فتح الرابط: ${url}`);
            }
        });
    };

    const confirmDelete = (meeting: Meeting) => {
        Alert.alert(
            'تأكيد الحذف',
            `هل أنت متأكد من حذف اجتماع "${meeting.title}"؟`,
            [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حذف', onPress: () => handleDeleteMeeting(meeting.id), style: 'destructive' },
            ]
        );
    };

    if (isMeetingsLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>الاجتماعات</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsFormOpen(true)}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addButtonText}>اجتماع جديد</Text>
                </TouchableOpacity>
            </View>

            <SectionList
                sections={meetingSections}
                keyExtractor={(item) => item.id}
                renderItem={({ item, section }) => {
                    if (section.title.includes('القادمة')) {
                        return (
                            <UpcomingMeetingCard
                                meeting={item}
                                project={item.projectId ? projectsMap[item.projectId] : undefined}
                                participants={(item.members || []).map(id => membersMap[id]).filter(Boolean)}
                                onJoinMeeting={handleJoin}
                            />
                        );
                    }
                    return (
                        <View style={styles.pastMeetingItem}>
                            <View>
                                <Text style={styles.pastMeetingTitle}>{item.title}</Text>
                                <Text style={styles.pastMeetingDate}>{format(parseISO(item.startTime!), 'd MMM yyyy, p', { locale: arSA })}</Text>
                            </View>
                             {hasPermission('manage_meetings') && (
                                <TouchableOpacity onPress={() => confirmDelete(item)}>
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                }}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد اجتماعات لعرضها.</Text>}
            />
            
            <MeetingFormModal
                isVisible={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleAddMeeting}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    addButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 4,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        textAlign: 'right',
    },
    pastMeetingItem: {
        backgroundColor: 'white',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pastMeetingTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
    },
    pastMeetingDate: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#64748b',
        fontSize: 16,
    },
});

export default MeetingsScreen;
