const fs = require('fs');

const files = [
  'components/meetings/MeetingsPage.tsx',
  'components/finance/FreelancerContractsTab.tsx',
  'components/finance/ExpenseClaimsTab.tsx',
  'components/finance/PenaltiesTab.tsx',
  'components/finance/SalariesTab.tsx',
  'components/profile/ProfileRequests.tsx',
  'components/profile/ProfilePenalties.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace text-right with text-right text-slate-900 dark:text-slate-100 on table only if it doesn't already have it
    if (content.includes('className="w-full text-sm text-right"') ) {
      content = content.replace(/className="w-full text-sm text-right"/g, 'className="w-full text-sm text-right text-slate-900 dark:text-slate-100"');
      changed = true;
    }

    if (content.includes('className="border-b dark:border-slate-700"')) {
       content = content.replace(/className="border-b dark:border-slate-700"/g, 'className="border-b dark:border-slate-700 text-slate-900 dark:text-slate-100"');
       changed = true;
    }

    if (changed) {
       fs.writeFileSync(file, content);
       console.log("Updated", file);
    }
  }
}
