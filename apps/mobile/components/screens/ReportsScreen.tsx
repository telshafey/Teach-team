import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useRequestsContext } from '@shared/contexts/RequestsContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { useAuth } from '@shared/contexts/AuthContext';
import * as reportService from '@shared/services/reportService';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project, Task } from '@shared/types';
import { Picker } from '@react-native-picker/picker';

type ReportType =
  | 'projects_summary'
  | 'tasks_detail'
  | 'employee_performance_general';

const ReportsScreen: React.FC = () => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });
    
    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });
    
    const [reportType, setReportType] = useState<ReportType>('projects_summary');
    const [generatedReport, setGeneratedReport] = useState<{ headers: string[], rows: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = () => {
        setIsLoading(true);
        let reportData: { headers: string[], rows: any[][] } | null = null;
        
        // Mobile version uses simplified filters
        const filters = { dateFrom: '', dateTo: '' };

        switch (reportType) {
            case 'projects_summary':
                reportData = reportService.generateProjectsSummary(projects, dailyLogs, filters);
                break;
            case 'tasks_detail':
                reportData = reportService.generateTasksDetail(tasks, projects, teamMembers, filters);
                break;
            case 'employee_performance_general':
                 reportData = reportService.generateEmployeePerformance(dailyLogs, projects, { ...filters, memberId: teamMembers[0]?.id.toString() }, false);
                break;
        }

        setGeneratedReport(reportData);
        setIsLoading(false);
    };

    if (!hasPermission('view_reports')) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text>ليس لديك الصلاحية لعرض هذه الصفحة.</Text>
                </View>
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>التقارير</Text>
                
                <View style={styles.controlsContainer}>
                    <Text style={styles.label}>نوع التقرير</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={reportType} onValueChange={(itemValue) => setReportType(itemValue as ReportType)}>
                            <Picker.Item label="ملخص المشاريع" value="projects_summary" />
                            <Picker.Item label="تفاصيل المهام" value="tasks_detail" />
                        </Picker>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleGenerateReport} disabled={isLoading}>
                        <Text style={styles.buttonText}>{isLoading ? 'جارٍ الإنشاء...' : 'إنشاء التقرير'}</Text>
                    </TouchableOpacity>
                </View>

                {generatedReport && (
                    <ScrollView horizontal>
                        <View>
                            <View style={styles.tableHeader}>
                                {generatedReport.headers.map((header, index) => (
                                    <Text key={index} style={styles.headerCell}>{header}</Text>
                                ))}
                            </View>
                            {generatedReport.rows.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.tableRow}>
                                    {row.map((cell: any, cellIndex: number) => (
                                        <Text key={cellIndex} style={styles.cell}>{cell}</Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContainer: { padding: 16 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', textAlign: 'right', marginBottom: 16 },
    controlsContainer: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '500', textAlign: 'right', marginBottom: 8 },
    pickerContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginBottom: 16 },
    button: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    tableHeader: { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerCell: { padding: 10, fontWeight: 'bold', width: 120, textAlign: 'right' },
    tableRow: { flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    cell: { padding: 10, width: 120, textAlign: 'right' },
});

export default ReportsScreen;
