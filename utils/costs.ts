import { Project, TeamMember, DailyLog, ExpenseClaim, OvertimeRequest, SiteSettings } from '../types';

interface CostBreakdown {
    employeeCost: number;
    freelancerCost: number;
    expenseCost: number;
    overtimeCost: number;
    totalCost: number;
}

export const calculateProjectCostBreakdown = (
    project: Project,
    teamMembers: TeamMember[],
    dailyLogs: DailyLog[],
    expenseClaims: ExpenseClaim[],
    overtimeRequests: OvertimeRequest[],
    siteSettings: SiteSettings | null
): CostBreakdown => {
    let employeeCost = 0;
    let freelancerCost = 0;

    const projectLogs = dailyLogs.filter(log => log.projectId === project.id);

    // Calculate costs from time logs
    projectLogs.forEach(log => {
        const member = teamMembers.find(m => m.id === log.teamMemberId);
        if (!member) return;

        if (member.roleId === 'freelancer') {
            // Freelancer cost is handled separately by contract type
        } else {
            // Employee cost
            if (member.hourlyRate) {
                employeeCost += log.hours * member.hourlyRate;
            } else if (member.salary && member.weeklyHoursRequirement) {
                const weeklySalary = member.salary / 4.33; // Approx weeks in a month
                const hourlyRate = weeklySalary / member.weeklyHoursRequirement;
                employeeCost += log.hours * hourlyRate;
            }
        }
    });
    
    // Calculate freelancer cost based on contract
    if (project.freelancerContract && project.freelancerContract.status === 'approved') {
        const contract = project.freelancerContract;
        if (contract.type === 'fixed') {
            freelancerCost = contract.amount || 0;
        } else if (contract.type === 'hourly') {
            const freelancerLogs = projectLogs.filter(l => l.teamMemberId === contract.freelancerId);
            const totalHours = freelancerLogs.reduce((sum, l) => sum + l.hours, 0);
            freelancerCost = totalHours * (contract.hourlyRate || 0);
        }
        // 'per-task' cost is not calculated here as it's not defined in the data model
    }

    // Calculate expense cost
    const expenseCost = expenseClaims
        .filter(e => e.projectId === project.id && e.status === 'approved')
        .reduce((sum, e) => sum + e.amount, 0);

    // Calculate overtime cost
    const overtimeMultiplier = siteSettings?.overtimeRateMultiplier || 1.5;
    const overtimeCost = overtimeRequests
        .filter(o => o.projectId === project.id && o.status === 'approved')
        .reduce((sum, o) => {
            const member = teamMembers.find(m => m.id === o.teamMemberId);
            if (!member) return sum;
            
            let hourlyRate = member.hourlyRate;
            if (!hourlyRate && member.salary && member.weeklyHoursRequirement) {
                 const weeklySalary = member.salary / 4.33;
                 hourlyRate = weeklySalary / member.weeklyHoursRequirement;
            }
            
            if (hourlyRate) {
                return sum + (o.requestedHours * hourlyRate * overtimeMultiplier);
            }
            return sum;
        }, 0);
        
    const totalCost = employeeCost + freelancerCost + expenseCost + overtimeCost;

    return {
        employeeCost,
        freelancerCost,
        expenseCost,
        overtimeCost,
        totalCost
    };
};
