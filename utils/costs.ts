import { Project, SiteSettings, TeamMember, DailyLog, ExpenseClaim, OvertimeRequest } from '../types';

export function calculateProjectCostBreakdown(
  project: Project,
  teamMembers: TeamMember[],
  dailyLogs: DailyLog[],
  expenseClaims: ExpenseClaim[],
  overtimeRequests: OvertimeRequest[],
  siteSettings: SiteSettings | null
) {
  const projectLogs = dailyLogs.filter(l => l.projectId === project.id);
  const approvedExpenses = expenseClaims
    .filter(e => e.projectId === project.id && e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);

  let employeeCost = 0;
  let freelancerCost = 0;
  let overtimeCost = 0;
  
  const contract = project.freelancerContract;

  // Calculate freelancer cost if a contract exists and is approved
  if (contract && contract.status === 'approved') {
    if (contract.type === 'fixed' && contract.amount) {
      freelancerCost = contract.amount;
    } else if (contract.type === 'hourly' && contract.hourlyRate) {
      const freelancerLogs = projectLogs.filter(l => l.teamMemberId === contract.freelancerId);
      freelancerCost = freelancerLogs.reduce((sum, log) => sum + (log.hours * (contract.hourlyRate || 0)), 0);
    }
  }

  // Calculate employee cost (everyone not on a freelancer contract for this project)
  const employeeLogs = projectLogs.filter(l => !contract || l.teamMemberId !== contract.freelancerId);
  employeeLogs.forEach(log => {
    const member = teamMembers.find(m => m.id === log.teamMemberId);
    // Ensure we are not double-counting a freelancer who might have logged hours without a contract
    if (member && member.roleId !== 'freelancer') {
      if (member.salary) {
        // Approximate hourly rate from monthly salary (22 working days, 8 hours/day)
        employeeCost += log.hours * (member.salary / (22 * 8)); 
      }
    }
  });

  // Calculate overtime cost
  const projectOvertimeRequests = overtimeRequests.filter(
    req => req.projectId === project.id && req.status === 'approved'
  );

  const overtimeMultiplier = siteSettings?.overtimeRateMultiplier || 1.5;

  projectOvertimeRequests.forEach(req => {
    const member = teamMembers.find(m => m.id === req.teamMemberId);
    if (member && member.salary) {
      // Approximate hourly rate from monthly salary
      const normalHourlyRate = member.salary / (22 * 8);
      // Use overtime rate from settings
      const overtimeRate = normalHourlyRate * overtimeMultiplier;
      overtimeCost += req.requestedHours * overtimeRate;
    }
  });


  const totalCost = employeeCost + freelancerCost + approvedExpenses + overtimeCost;

  return {
    employeeCost,
    freelancerCost,
    expenseCost: approvedExpenses,
    overtimeCost,
    totalCost
  };
}