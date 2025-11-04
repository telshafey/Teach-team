import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';

// Import screens
import DashboardScreen from './screens/DashboardScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import ApprovalsScreen from './screens/ApprovalsScreen';
import TeamScreen from './screens/TeamScreen';
import TeamDetailScreen from './screens/TeamDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import MeetingsScreen from './screens/MeetingsScreen';
import FinanceScreen from './screens/FinanceScreen';
import ReportsScreen from './screens/ReportsScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import SupportScreen from './screens/SupportScreen';
import MoreScreen from './screens/MoreScreen';

const Tab = createBottomTabNavigator();
const ProjectsStack = createNativeStackNavigator();
const TeamStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function ProjectsStackScreen() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </ProjectsStack.Navigator>
  );
}

function TeamStackScreen() {
  return (
    <TeamStack.Navigator screenOptions={{ headerShown: false }}>
      <TeamStack.Screen name="TeamList" component={TeamScreen} />
      <TeamStack.Screen name="TeamDetail" component={TeamDetailScreen} />
    </TeamStack.Navigator>
  );
}

function MoreStackScreen() {
    return (
        <MoreStack.Navigator screenOptions={{ headerShown: false }}>
            <MoreStack.Screen name="More" component={MoreScreen} />
            <MoreStack.Screen name="Profile" component={ProfileScreen} />
            <MoreStack.Screen name="Settings" component={SettingsScreen} />
            <MoreStack.Screen name="Approvals" component={ApprovalsScreen} />
            <MoreStack.Screen name="Finance" component={FinanceScreen} />
            <MoreStack.Screen name="Reports" component={ReportsScreen} />
            <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
            <MoreStack.Screen name="Support" component={SupportScreen} />
        </MoreStack.Navigator>
    );
}


const MainPage: React.FC = () => {
  const { count: pendingApprovalsCount } = usePendingApprovals();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

            if (route.name === 'DashboardTab') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'ProjectsTab') {
              iconName = focused ? 'folder-open' : 'folder-open-outline';
            } else if (route.name === 'MeetingsTab') {
                iconName = focused ? 'videocam' : 'videocam-outline';
            } else if (route.name === 'TeamTab') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'MoreTab') {
                iconName = focused ? 'apps' : 'apps-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#0ea5e9',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'الرئيسية' }} />
        <Tab.Screen name="ProjectsTab" component={ProjectsStackScreen} options={{ title: 'المشاريع' }} />
        <Tab.Screen name="MeetingsTab" component={MeetingsScreen} options={{ title: 'الاجتماعات' }} />
        <Tab.Screen name="TeamTab" component={TeamStackScreen} options={{ title: 'الفريق' }} />
        <Tab.Screen 
            name="MoreTab" 
            component={MoreStackScreen} 
            options={{ 
                title: 'المزيد',
                tabBarBadge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
            }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default MainPage;
