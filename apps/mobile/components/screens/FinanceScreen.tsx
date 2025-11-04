import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { TeamMember, Project, Penalty } from '@shared/types';
import ExpenseClaimFormModal from '../modals/ExpenseClaimFormModal';
import DecisionDetailModal from '../modals/DecisionDetailModal';
import PenaltyFormModal from '../modals/PenaltyFormModal';
import FinanceOverviewTab from '../finance/FinanceOverviewTab';
import ProjectFinancialsTab from '../finance/ProjectFinancialsTab';
import FreelancerContractsTab from '../finance/FreelancerContractsTab';
import ExpenseClaimsTab from '../finance/ExpenseClaimsTab';
import SalariesTab from '../finance/SalariesTab';
import PenaltiesTab from '../finance/PenaltiesTab';
import SalarySlipsTab from '../finance/SalarySlipsTab';

interface FinancePageProps {
    initialView?: string;
}

export const FinanceScreen: React.FC<FinancePageProps> = ({ initialView }) => {
    const { hasPermission } = useTeamContext();
    const { penalties, handleIssuePenalty, handleSubmitExpenseClaim } = useRequestsContext();
    const { currentUser } = useAuth();
    
    const getDefaultTab = () => {
        if (initialView) return initialView;
        if (currentUser?.roleId === 'freelancer') return 'freelancer';
        if (hasPermission('view_finances')) return 'overview';
        return 'expenses';
    };

    const [activeTab, setActiveTab] = useState(getDefaultTab());
    
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState<Project | Penalty | null>(null);

    const navItems = [
        { id: 'overview', label: 'نظرة عامة', permission: hasPermission('view_finances') },
        { id: 'project_financials', label: 'مالية المشاريع', permission: hasPermission('view_finances') },
        { id: 'freelancer', label: currentUser?.roleId === 'freelancer' ? 'عقودي' : 'عقود المستقلين', permission: true },
        { id: 'expenses', label: 'طلبات الصرف', permission: true },
        { id: 'penalties', label: 'الجزاءات', permission: hasPermission('issue_penalties') || hasPermission('approve_penalties') },
        { id: 'salaries', label: 'الرواتب', permission: hasPermission('view_all_salaries') },
        { id: 'salary_slips', label: 'قسائم الرواتب', permission: hasPermission('view_all_salaries') },
    ].filter(item => item.permission);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <FinanceOverviewTab />;
            case 'project_financials':
                return <ProjectFinancialsTab />;
            case 'freelancer':
                return <FreelancerContractsTab />;
            case 'expenses':
                return <ExpenseClaimsTab onNewClaim={() => setIsExpenseModalOpen(true)} />;
            case 'penalties':
                return <PenaltiesTab penalties={penalties} onReview={setReviewingItem as (item: Penalty) => void} onNew={() => setIsPenaltyModalOpen(true)} />;
            case 'salaries':
                return <SalariesTab />;
            case 'salary_slips':
                return <SalarySlipsTab />;
            default:
                return <Text>Not implemented yet.</Text>;
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>المالية</Text>
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                    {navItems.map(item => (
                        <TouchableOpacity key={item.id} onPress={() => setActiveTab(item.id)} style={[styles.tab, activeTab === item.id && styles.activeTab]}>
                            <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={{flex: 1}}>
                {renderContent()}
            </View>

            <ExpenseClaimFormModal
                isVisible={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSave={handleSubmitExpenseClaim}
            />
            <PenaltyFormModal
                isVisible={isPenaltyModalOpen}
                onClose={() => setIsPenaltyModalOpen(false)}
                onSave={handleIssuePenalty}
            />
            {reviewingItem && (
                <DecisionDetailModal
                    isVisible={!!reviewingItem}
                    onClose={() => setReviewingItem(null)}
                    item={reviewingItem}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
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
    tabContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tabs: {
        flexDirection: 'row-reverse',
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginHorizontal: 4,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#0ea5e9',
    },
    tabText: {
        color: '#64748b',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#0ea5e9',
    }
});

export default FinanceScreen;
