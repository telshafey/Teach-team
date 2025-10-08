import React, { useState, FormEvent, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useSupabase } from '../../contexts/SupabaseContext';
import { fileToBase64 } from '../../utils/files';
import { useAppDataContext } from '../../contexts/DataContext';
import { LeaveRequestFormModal } from '../modals/LeaveRequestFormModal';
import { ExpenseClaimFormModal } from '../modals/ExpenseClaimFormModal';
import { OvertimeRequestFormModal } from '../modals/OvertimeRequestFormModal';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isSameMonth, isAfter } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { generatePerformanceNotes } from '../../services/geminiService';
import { useProjectContext } from '../../contexts/ProjectContext';
import { ClockIcon, CheckCircleIcon, SparklesIcon, CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { WeeklyHoursTracker } from './WeeklyHoursTracker';
import { WorkContractChangeRequestModal } from '../modals/WorkContractChangeRequestModal';
import { WorkContractChangeRequestFormData } from '../../types';


const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = ({ icon, label, value }) => (
    <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600 dark:text-sky-400">
            {icon}
        </div>
        <div className="mr-4 rtl:mr-0 rtl:ml-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

export const ProfilePage: React.FC = () => {
    const { currentUser, updateCurrentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    const { addToast } = useToast();
    const { 
        leaveRequests, submitLeaveRequest, cancelLeaveRequest, 
        expenseClaims, handleSubmitExpenseClaim,
        overtimeRequests, submitOvertimeRequest, cancelOvertimeRequest,
        submitWorkContractChangeRequest,
        dailyLogs, currency, siteSettings
    } = useAppDataContext();
    const { tasks } = useProjectContext();
    
    // State for UI
    const [activeTab, setActiveTab] = useState<'requests' | 'performance' | 'settings' | 'salary' | 'work_hours'>('requests');
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [viewedMonth, setViewedMonth] = useState(new Date());
    
    // State for Modals
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [isWorkContractModalOpen, setIsWorkContractModalOpen] = useState(false);
    const [requestToCancel, setRequestToCancel] = useState<{id: string, type: 'leave' | 'overtime'} | null>(null);

    // State for Forms
    const [name, setName] = useState(currentUser?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State for AI Performance
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [performanceNotes, setPerformanceNotes] = useState('');

    const myData = useMemo(() => {
        if (!currentUser) return { leaves: [], expenses: [], overtimes: [], logs: [], userTasks: [] };
        return {
            leaves: leaveRequests.filter(r => r.teamMemberId === currentUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            expenses: expenseClaims.filter(c => c.teamMemberId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            overtimes: overtimeRequests.filter(o => o.teamMemberId === currentUser.id).sort((a,b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()),
            logs: dailyLogs.filter(l => l.teamMemberId === currentUser.id),
            userTasks: tasks.filter(t => t.assignedTo === currentUser.id),
        }
    }, [leaveRequests, expenseClaims, overtimeRequests, dailyLogs, tasks, currentUser]);
    
    const salaryReportData = useMemo(() => {
        if (!currentUser?.salary) return null;

        const startOfMonthForView = startOfMonth(viewedMonth);
        const endOfMonthForView = endOfMonth(viewedMonth);

        const approvedOvertimeHours = myData.overtimes
            .filter(r => r.status === 'approved' && isWithinInterval(new Date(r.weekStartDate), { start: startOfMonthForView, end: endOfMonthForView }))
            .reduce((sum, r) => sum + r.requestedHours, 0);
            
        const approvedExpensesAmount = myData.expenses
            .filter(e => e.status === 'approved' && isWithinInterval(new Date(e.date), { start: startOfMonthForView, end: endOfMonthForView }))
            .reduce((sum, e) => sum + e.amount, 0);
            
        const hourlyRate = currentUser.salary / (22 * 8); // Approximation
        const overtimeMultiplier = siteSettings?.overtimeRateMultiplier || 1.5;
        const overtimePay = approvedOvertimeHours * hourlyRate * overtimeMultiplier;

        const totalEstimated = currentUser.salary + overtimePay + approvedExpensesAmount;

        return {
            baseSalary: currentUser.salary,
            overtimePay,
            approvedExpensesAmount,
            totalEstimated
        };
    }, [currentUser, myData.overtimes, myData.expenses, viewedMonth, siteSettings]);


    if (!currentUser) return null;
    
    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateCurrentUser({ name, avatarUrl });
            addToast('تم تحديث الملف الشخصي بنجاح.', 'success');
        } catch (error: any) {
            addToast(`فشل تحديث الملف الشخصي: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('كلمتا المرور الجديدتان غير متطابقتين.', 'error'); return;
        }
        if (!supabaseClient) return;

        setIsChangingPassword(true);
        try {
            const { error: reauthError } = await supabaseClient.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
            if (reauthError) throw new Error('كلمة المرور الحالية غير صحيحة.');

            const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;
            
            addToast('تم تغيير كلمة المرور بنجاح.', 'success');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (error: any) {
             addToast(`فشل تغيير كلمة المرور: ${error.message}`, 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };
    
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { addToast('حجم الصورة يجب أن يكون أقل من 2 ميجابايت.', 'error'); return; }
            try {
                const base64 = await fileToBase64(file);
                setAvatarUrl(base64);
            } catch (err) { addToast('فشل في معالجة الصورة.', 'error'); }
        }
    };

    const handleGenerateNotes = async () => {
        setIsGeneratingNotes(true);
        setPerformanceNotes('');
        try {
            const notes = await generatePerformanceNotes(
              currentUser.name,
              myData.userTasks.map(t => ({ title: t.title, status: t.status })),
              myData.logs.slice(-20).map(l => ({ hours: l.hours, description: l.description }))
            );
            setPerformanceNotes(notes);
        } catch (error) {
            addToast("حدث خطأ أثناء إنشاء ملخص الأداء.", "error");
        } finally {
            setIsGeneratingNotes(false);
        }
    };
    
    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        const styles = {
            pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        };
        const text = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

    const RequestTable: React.FC<{title: string, data: any[], columns: {header:string, accessor: (row:any)=>any}[], onNew: ()=>void, canCancel?: boolean, onCancel?: (id:string)=>void}> = ({title, data, columns, onNew, canCancel = false, onCancel = ()=>{}}) => (
        <Card title={title} headerActions={<button onClick={onNew} className="text-sm font-semibold text-sky-600">+ طلب جديد</button>}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300"><tr>{columns.map(c=><th key={c.header} className="px-4 py-2">{c.header}</th>)}</tr></thead>
                    <tbody>
                        {data.map(row => (
                            <tr key={row.id} className="border-b dark:border-slate-700">
                                {columns.map(c => <td key={c.header} className="px-4 py-2">{c.accessor(row)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && <p className="text-center text-slate-500 py-4">لا توجد طلبات.</p>}
            </div>
        </Card>
    );

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">ملفي الشخصي</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="flex flex-col items-center space-y-4">
                                <img src={avatarUrl} alt={name} className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-200 dark:ring-sky-800" />
                                <label className="cursor-pointer px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200">
                                    <span>تغيير الصورة</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم</label>
                                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                                <input type="email" id="email" value={currentUser.email} disabled className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                {isSaving ? <LoadingSpinner /> : 'حفظ التغييرات'}
                            </button>
                        </form>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'requests' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>طلباتي</button>
                        {currentUser.weeklyHoursRequirement && <button onClick={() => setActiveTab('work_hours')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'work_hours' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>ساعات العمل</button>}
                        {currentUser.salary && <button onClick={() => setActiveTab('salary')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'salary' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>تقرير الراتب</button>}
                        <button onClick={() => setActiveTab('performance')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'performance' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>ملخص الأداء</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'settings' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>الإعدادات</button>
                    </div>
                    
                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            <RequestTable title="طلبات الإجازات" data={myData.leaves} onNew={()=>setIsLeaveModalOpen(true)} columns={[
                                { header: 'النوع', accessor: (r:any) => r.type === 'regular' ? 'عادية' : 'طارئة' },
                                { header: 'من', accessor: (r:any) => format(parseISO(r.startDate), 'd MMM yyyy', { locale: arSA }) },
                                { header: 'إلى', accessor: (r:any) => format(parseISO(r.endDate), 'd MMM yyyy', { locale: arSA }) },
                                { header: 'الحالة', accessor: (r:any) => getStatusBadge(r.status) },
                                { header: '', accessor: (r:any) => r.status === 'pending' ? <button onClick={() => setRequestToCancel({id: r.id, type: 'leave'})} className="text-xs text-red-600 hover:underline">إلغاء</button> : null }
                            ]}/>
                             <RequestTable title="طلبات المصروفات" data={myData.expenses} onNew={()=>setIsExpenseModalOpen(true)} columns={[
                                { header: 'التاريخ', accessor: (r:any) => format(parseISO(r.date), 'd MMM yyyy', { locale: arSA }) },
                                { header: 'المبلغ', accessor: (r:any) => `${r.amount} ${currency}` },
                                { header: 'الوصف', accessor: (r:any) => r.description },
                                { header: 'الحالة', accessor: (r:any) => getStatusBadge(r.status) },
                            ]}/>
                            <RequestTable title="طلبات الساعات الإضافية" data={myData.overtimes} onNew={()=>setIsOvertimeModalOpen(true)} columns={[
                                { header: 'بداية الأسبوع', accessor: (r:any) => format(parseISO(r.weekStartDate), 'd MMM yyyy', { locale: arSA }) },
                                { header: 'الساعات المطلوبة', accessor: (r:any) => r.requestedHours },
                                { header: 'الحالة', accessor: (r:any) => getStatusBadge(r.status) },
                                { header: '', accessor: (r:any) => r.status === 'pending' ? <button onClick={() => setRequestToCancel({id: r.id, type: 'overtime'})} className="text-xs text-red-600 hover:underline">إلغاء</button> : null }
                            ]}/>
                        </div>
                    )}
                    
                    {activeTab === 'work_hours' && currentUser.weeklyHoursRequirement && (
                        <WeeklyHoursTracker 
                            member={currentUser} 
                            logs={myData.logs}
                            onStartChangeRequest={() => setIsWorkContractModalOpen(true)}
                        />
                    )}

                    {activeTab === 'salary' && salaryReportData && (
                        <Card 
                            icon={<CurrencyDollarIcon className="w-5 h-5"/>}
                            title={`تقرير الراتب لشهر ${format(viewedMonth, 'MMMM yyyy', { locale: arSA })}`}
                            headerActions={
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setViewedMonth(prev => subMonths(prev, 1))} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <ChevronRightIcon className="w-5 h-5 text-slate-500" />
                                    </button>
                                     <button onClick={() => setViewedMonth(prev => addMonths(prev, 1))} disabled={isSameMonth(viewedMonth, new Date()) || isAfter(viewedMonth, new Date())} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                                        <ChevronLeftIcon className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                            }
                        >
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    <span className="font-medium text-slate-600 dark:text-slate-300">الراتب الأساسي</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{salaryReportData.baseSalary.toLocaleString()} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    <span className="font-medium text-slate-600 dark:text-slate-300">قيمة الساعات الإضافية المعتمدة</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">+ {salaryReportData.overtimePay.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    <span className="font-medium text-slate-600 dark:text-slate-300">قيمة المصروفات المعتمدة</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">+ {salaryReportData.approvedExpensesAmount.toLocaleString()} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-4">
                                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">إجمالي الراتب المتوقع</span>
                                    <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">{salaryReportData.totalEstimated.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'performance' && (
                         <div className="space-y-6">
                            <Card title="مؤشرات الأداء">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <StatCard icon={<ClockIcon className="w-6 h-6"/>} label="إجمالي الساعات المسجلة" value={myData.logs.reduce((sum, l) => sum + l.hours, 0).toFixed(1)} />
                                    <StatCard icon={<CheckCircleIcon className="w-6 h-6"/>} label="المهام المكتملة" value={myData.userTasks.filter(t => t.status === 'done').length} />
                                </div>
                            </Card>
                            <Card title="ملخص الأداء (AI)" icon={<SparklesIcon className="w-5 h-5"/>}>
                                <div className="space-y-3">
                                    <button onClick={handleGenerateNotes} disabled={isGeneratingNotes} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 flex justify-center items-center">
                                    {isGeneratingNotes ? <LoadingSpinner /> : 'إنشاء ملخص الأداء'}
                                    </button>
                                    {performanceNotes && <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-700/50 text-sm whitespace-pre-wrap">{performanceNotes}</div>}
                                </div>
                            </Card>
                         </div>
                    )}

                    {activeTab === 'settings' && (
                        <Card title="تغيير كلمة المرور">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                 <div>
                                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية</label>
                                    <input type="password" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                                </div>
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة</label>
                                    <input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" disabled={isChangingPassword} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                        {isChangingPassword ? <LoadingSpinner /> : 'تغيير كلمة المرور'}
                                    </button>
                                </div>
                            </form>
                        </Card>
                    )}
                </div>
            </div>

            {isLeaveModalOpen && <LeaveRequestFormModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} onSave={submitLeaveRequest} />}
            {isExpenseModalOpen && <ExpenseClaimFormModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSubmitExpenseClaim} />}
            {isOvertimeModalOpen && <OvertimeRequestFormModal isOpen={isOvertimeModalOpen} onClose={() => setIsOvertimeModalOpen(false)} onSave={submitOvertimeRequest} />}
            {isWorkContractModalOpen && <WorkContractChangeRequestModal isOpen={isWorkContractModalOpen} onClose={() => setIsWorkContractModalOpen(false)} onSave={submitWorkContractChangeRequest} />}
            {requestToCancel && (
                 <ConfirmationModal isOpen={!!requestToCancel} onClose={() => setRequestToCancel(null)} onConfirm={async () => {
                        if (requestToCancel.type === 'leave') await cancelLeaveRequest(requestToCancel.id);
                        if (requestToCancel.type === 'overtime') await cancelOvertimeRequest(requestToCancel.id);
                        setRequestToCancel(null);
                    }} title="تأكيد الإلغاء" message="هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟" isDestructive />
            )}
        </div>
    );
};

export default ProfilePage;