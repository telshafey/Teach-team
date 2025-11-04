import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders project status correctly', () => {
    render(<StatusBadge status="نشط" type="project" />);
    expect(screen.getByText('نشط')).not.toBeNull();
  });

  it('renders task status correctly', () => {
    render(<StatusBadge status="inprogress" type="task" />);
    expect(screen.getByText('قيد التنفيذ')).not.toBeNull();
  });

  it('renders approval status correctly', () => {
    render(<StatusBadge status="pending" type="approval" />);
    expect(screen.getByText('قيد المراجعة')).not.toBeNull();
  });
  
  it('renders penalty status correctly', () => {
    render(<StatusBadge status="approved" type="penalty" />);
    expect(screen.getByText('معتمدة')).not.toBeNull();
  });

  it('renders support ticket priority correctly', () => {
    render(<StatusBadge status="high" type="support_ticket_priority" />);
    expect(screen.getByText('عالية')).not.toBeNull();
  });

  it('renders a fallback for an unknown status', () => {
    // Cast to any to bypass TypeScript error for this test case
    render(<StatusBadge status="unknown_status" type={'project' as any} />);
    expect(screen.getByText('unknown_status')).not.toBeNull();
  });
});
