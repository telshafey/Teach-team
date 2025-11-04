import { describe, it, expect } from 'vitest';
import { generateSalarySlipData } from './salarySlip';
import { TeamMember, OvertimeRequest, ExpenseClaim, Penalty, SiteSettings } from '../types';

describe('generateSalarySlipData', () => {
    const mockMember: TeamMember = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        authUserId: '123',
        roleId: 'employee',
        avatarUrl: '',
        employmentType: 'full-time',
        salary: 5000,
        weeklyHoursRequirement: 40,
        daysOff: [],
        weeklyPlan: { status: 'approved', hours: {} },
    };

    const mockSiteSettings: SiteSettings = {
        appName: 'Test App',
        logoUrl: '',
        themeColor: '',
        currency: 'USD',
        overtimeRateMultiplier: 1.5,
        logEditingDaysLimit: 3,
        isFinanceModuleEnabled: true,
        isMeetingsModuleEnabled: true,
        isAnalyticsModuleEnabled: true,
        isReportsModuleEnabled: true,
        databaseSettings: { supabaseUrl: '', supabaseAnonKey: '' },
        meetingSettings: { startWithAudioMuted: true, startWithVideoMuted: true, hideChat: false, hidePeople: false, defaultMeetingRoom: '', wherebyHostRoomKey: '' },
    };

    const month = new Date('2024-01-15');

    it('should calculate net salary correctly with no additions or deductions', () => {
        const result = generateSalarySlipData(mockMember, month, [], [], [], mockSiteSettings);
        expect(result).not.toBeNull();
        expect(result?.baseSalary).toBe(5000);
        expect(result?.overtimePay).toBe(0);
        expect(result?.expensesReimbursed).toBe(0);
        expect(result?.penaltiesDeducted).toBe(0);
        expect(result?.netSalary).toBe(5000);
    });

    it('should calculate net salary with overtime, expenses, and penalties', () => {
        const mockOvertimes: OvertimeRequest[] = [
            { id: '1', teamMemberId: 1, weekStartDate: '2024-01-08', requestedHours: 5, status: 'approved' }
        ];
        const mockExpenses: ExpenseClaim[] = [
            { id: '1', teamMemberId: 1, amount: 100, description: 'Lunch', date: '2024-01-10', status: 'approved' }
        ];
        const mockPenalties: Penalty[] = [
            { id: '1', teamMemberId: 1, issuerId: 2, date: '2024-01-12', amount: 50, reason: 'Late', status: 'approved' }
        ];

        const hourlyRate = (5000 / 4.33) / 40;
        const overtimePay = 5 * hourlyRate * 1.5;

        const result = generateSalarySlipData(mockMember, month, mockOvertimes, mockExpenses, mockPenalties, mockSiteSettings);
        
        expect(result).not.toBeNull();
        expect(result?.baseSalary).toBe(5000);
        expect(result?.overtimePay).toBeCloseTo(overtimePay);
        expect(result?.expensesReimbursed).toBe(100);
        expect(result?.penaltiesDeducted).toBe(50);
        expect(result?.netSalary).toBeCloseTo(5000 + overtimePay + 100 - 50);
    });

    it('should return null if member has no salary', () => {
        const memberWithoutSalary = { ...mockMember, salary: undefined };
        const result = generateSalarySlipData(memberWithoutSalary, month, [], [], [], mockSiteSettings);
        expect(result).toBeNull();
    });
    
    it('should not include requests from other months', () => {
        const mockOvertimes: OvertimeRequest[] = [
            { id: '1', teamMemberId: 1, weekStartDate: '2024-02-08', requestedHours: 5, status: 'approved' }
        ];
         const mockExpenses: ExpenseClaim[] = [
            { id: '1', teamMemberId: 1, amount: 100, description: 'Lunch', date: '2023-12-10', status: 'approved' }
        ];

        const result = generateSalarySlipData(mockMember, month, mockOvertimes, mockExpenses, [], mockSiteSettings);
        expect(result).not.toBeNull();
        expect(result?.overtimePay).toBe(0);
        expect(result?.expensesReimbursed).toBe(0);
        expect(result?.netSalary).toBe(5000);
    });
});