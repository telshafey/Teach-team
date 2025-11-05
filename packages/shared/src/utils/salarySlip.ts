import { TeamMember, OvertimeRequest, ExpenseClaim, Penalty, SiteSettings } from '../types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const generateSalarySlipData = (
    member: TeamMember,
    month: Date,
    allOvertimeRequests: OvertimeRequest[],
    allExpenseClaims: ExpenseClaim[],
    allPenalties: Penalty[],
    siteSettings: SiteSettings | null
) => {
    if (!member.salary) return null;

    const startOfMonthForView = startOfMonth(month);
    const endOfMonthForView = endOfMonth(month);

    const memberOvertimes = allOvertimeRequests.filter(o => o.teamMemberId === member.id);
    const memberExpenses = allExpenseClaims.filter(e => e.teamMemberId === member.id);
    const memberPenalties = allPenalties.filter(p => p.teamMemberId === member.id);

    const approvedOvertimeHours = memberOvertimes
        .filter(r => r.status === 'approved' && isWithinInterval(new Date(r.weekStartDate), { start: startOfMonthForView, end: endOfMonthForView }))
        .reduce((sum, r) => sum + r.requestedHours, 0);
        
    const expensesReimbursed = memberExpenses
        .filter(e => e.status === 'approved' && isWithinInterval(new Date(e.date), { start: startOfMonthForView, end: endOfMonthForView }))
        .reduce((sum, e) => sum + e.amount, 0);

    const penaltiesDeducted = memberPenalties
        .filter(p => p.status === 'approved' && isWithinInterval(new Date(p.date), { start: startOfMonthForView, end: endOfMonthForView }))
        .reduce((sum, p) => sum + p.amount, 0);
        
    // Approximation for hourly rate from salary.
    const hourlyRate = (member.weeklyHoursRequirement && member.weeklyHoursRequirement > 0) 
        ? (member.salary / 4.33) / member.weeklyHoursRequirement 
        : member.salary / (22 * 8); 
        
    const overtimeMultiplier = siteSettings?.overtimeRateMultiplier || 1.5;
    const overtimePay = approvedOvertimeHours * hourlyRate * overtimeMultiplier;

    const baseSalary = member.salary;
    const netSalary = baseSalary + overtimePay + expensesReimbursed - penaltiesDeducted;

    return {
        member,
        month,
        baseSalary,
        overtimePay,
        expensesReimbursed: expensesReimbursed,
        penaltiesDeducted: penaltiesDeducted,
        netSalary
    };
};
