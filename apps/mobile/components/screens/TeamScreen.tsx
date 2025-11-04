import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { TeamMember } from '@shared/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    TeamList: undefined;
    TeamDetail: { memberId: number };
};

type TeamScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamList'>;

const TeamMemberItem: React.FC<{ member: TeamMember, onPress: () => void }> = ({ member, onPress }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
        <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
        <View>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.email}>{member.email}</Text>
        </View>
    </TouchableOpacity>
);

const TeamScreen: React.FC = () => {
    const { teamMembers, isLoading } = useTeamContext();
    const navigation = useNavigation<TeamScreenNavigationProp>();

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>الفريق</Text>
            <FlatList
                data={teamMembers}
                renderItem={({ item }) => (
                    <TeamMemberItem 
                        member={item} 
                        onPress={() => navigation.navigate('TeamDetail', { memberId: item.id })}
                    />
                )}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
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
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        textAlign: 'right',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    itemContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginLeft: 16,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'right',
    },
});

export default TeamScreen;
