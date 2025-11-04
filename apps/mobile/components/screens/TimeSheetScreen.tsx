import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { DailyLog, DailyLogFormData } from '@shared/types';
import { isToday, isThisWeek, startOfMonth, endOfMonth, isWithinInterval, format, isFuture, differenceInCalendarDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Task, Meeting } from '@shared/types';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import StatCard from '../ui/StatCard';
import DailyLogDetailModal from '../modals/DailyLogDetailModal';
import LogFormModal from '../modals/LogFormModal';

LocaleConfig.locales['ar'] = {
  monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  monthNamesShort: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
  dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  dayNamesShort: ['أحد', 'اثنين', 'ثلاث', 'أربع', 'خميس', 'جمعة', 'سبت'],
  today: 'اليوم'
};
LocaleConfig.defaultLocale = 'ar';


const TimeSheetScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useTimeLogContext();
    const { siteSettings } = useSettingsContext();
    const { supabaseClient } = useSupabase();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient && !!currentUser,
    });

    const { data: meetings = [] } = useQuery<Meeting[]>({
        queryKey: ['meetings'],
        queryFn: () => api.getAll(supabaseClient!, 'meetings'),
        enabled: !!supabaseClient && !!currentUser,
    });

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    const myTasks = useMemo(() => tasks.filter(task => task.assignedTo === currentUser?.id), [tasks, currentUser]);
    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return meetings.filter(m => m.members?.includes(currentUser.id));
    }, [meetings, currentUser]);

    const markedDates = useMemo(() => {
        const markings: { [key: string]: any } = {};
        
        myLogs.forEach(log => {
            const dateStr = format(new Date(log.date), 'yyyy-MM-dd');
            if (!markings[dateStr]) markings[dateStr] = { dots: [] };
            if (!markings[dateStr].dots.find((d:any) => d.key === 'log')) {
                markings[dateStr].dots.push({ key: 'log', color: '#22c55e' }); // green
            }
        });

        myTasks.forEach(task => {
            if (task.dueDate) {
                const dateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');
                 if (!markings[dateStr]) markings[dateStr] = { dots: [] };
                if (!markings[dateStr].dots.find((d:any) => d.key === 'due')) {
                    markings[dateStr].dots.push({ key: 'due', color: '#ef4444' }); // red
                }
            }
        });

        myMeetings.forEach(meeting => {
            if (meeting.startTime) {
                 const dateStr = format(new Date(meeting.startTime), 'yyyy-MM-dd');
                 if (!markings[dateStr]) markings[dateStr] = { dots: [] };
                if (!markings[dateStr].dots.find((d:any) => d.key === 'meeting')) {
                    markings[dateStr].dots.push({ key: 'meeting', color: '#3b82f6' }); // blue
                }
            }
        });

        if (selectedDate) {
            markings[selectedDate] = { ...markings[selectedDate], selected: true, selectedColor: '#0ea5e9' };
        }

        return markings;
    }, [myLogs, myTasks, myMeetings, selectedDate]);


    const timeSheetSummary = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const todayHours = myLogs
            .filter(log => isToday(new Date(log.date)))
            .reduce((sum, log) => sum + log.hours, 0);

        const thisWeekHours = myLogs
            .filter(log => isThisWeek(new Date(log.date), { weekStartsOn: 0 }))
            .reduce((sum, log) => sum + log.hours, 0);

        const thisMonthHours = myLogs
            .filter(log => isWithinInterval(new Date(log.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
            .reduce((sum, log) => sum + log.hours, 0);

        return { todayHours, thisWeekHours, thisMonthHours };
    }, [myLogs]);

    const isDateEditableForLogging = useCallback((date: Date): boolean => {
        if (isFuture(date)) return false;
        const limit = siteSettings?.logEditingDaysLimit ?? 3;
        return differenceInCalendarDays(new Date(), date) <= limit;
    }, [siteSettings]);

    const handleOpenLogForm = (logToEdit: DailyLog | null = null) => {
        setEditingLog(logToEdit);
        setIsLogFormOpen(true);
        if(selectedDate) setSelectedDate(null);
    };

    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser) return;
        const dateToSave = editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd');
        if (editingLog) {
            await handleUpdateDailyLog({ ...editingLog, ...logData });
        } else {
            await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: dateToSave });
        }
        setIsLogFormOpen(false);
        setEditingLog(null);
    };

    const logsForSelectedDate = selectedDate ? myLogs.filter(log => log.date === selectedDate) : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>سجل أوقاتي</Text>
                     <TouchableOpacity style={styles.addButton} onPress={() => handleOpenLogForm()}>
                        <Text style={styles.addButtonText}>+ إضافة سجل</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>تتبع ساعات عملك اليومية والأسبوعية.</Text>
                
                <View style={styles.statsContainer}>
                    <StatCard label="ساعات اليوم" value={timeSheetSummary.todayHours.toFixed(1)} />
                    <StatCard label="ساعات الأسبوع" value={timeSheetSummary.thisWeekHours.toFixed(1)} />
                    <StatCard label="ساعات الشهر" value={timeSheetSummary.thisMonthHours.toFixed(1)} />
                </View>
                
                <View style={styles.calendarContainer}>
                    <Calendar
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                        markedDates={markedDates}
                        markingType={'multi-dot'}
                        theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: '#0ea5e9',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#0ea5e9',
                            dayTextColor: '#2d4150',
                            textDisabledColor: '#d9e1e8',
                        }}
                    />
                     <View style={styles.legendContainer}>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>يوم مسجل</Text></View>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>تاريخ استحقاق</Text></View>
                        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendText}>اجتماع</Text></View>
                    </View>
                </View>

            </ScrollView>
            {selectedDate && (
                <DailyLogDetailModal
                    isVisible={!!selectedDate}
                    onClose={() => setSelectedDate(null)}
                    date={selectedDate}
                    logs={logsForSelectedDate}
                    onAdd={() => handleOpenLogForm()}
                    onEdit={(log) => handleOpenLogForm(log)}
                    onDelete={handleDeleteDailyLog}
                    isEditable={isDateEditableForLogging(new Date(selectedDate))}
                />
            )}
             {isLogFormOpen && currentUser && (
                <LogFormModal
                    isVisible={isLogFormOpen}
                    onClose={() => { setIsLogFormOpen(false); setEditingLog(null); }}
                    onSave={handleSaveLog}
                    log={editingLog}
                    date={editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd')}
                />
             )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9', // slate-100
    },
    scrollContainer: {
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'right',
    },
    addButton: {
        backgroundColor: '#0ea5e9', // sky-500
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    calendarContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    legendContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    legendItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#64748b',
    },
});

export default TimeSheetScreen;