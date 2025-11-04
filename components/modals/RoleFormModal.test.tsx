import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleFormModal } from './RoleFormModal';
import { ToastProvider } from '../../contexts/ToastContext';

describe('RoleFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  it('renders correctly for adding a new role', () => {
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={null}
        />
      </ToastProvider>
    );

    expect(screen.getByText('إضافة دور جديد')).not.toBeNull();
    expect(screen.getByLabelText('اسم الدور')).toHaveValue('');
  });

  it('renders correctly for editing an existing role', () => {
    const existingRole = { id: 'editor', name: 'محرر', permissions: [] };
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={existingRole}
        />
      </ToastProvider>
    );

    expect(screen.getByText('تعديل اسم الدور')).not.toBeNull();
    expect(screen.getByLabelText('اسم الدور')).toHaveValue('محرر');
  });

  it('calls onClose when the cancel button is clicked', () => {
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={null}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('إلغاء'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with the new role name when form is submitted for a new role', async () => {
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={null}
        />
      </ToastProvider>
    );

    const input = screen.getByLabelText('اسم الدور');
    fireEvent.change(input, { target: { value: 'دور جديد' } });
    fireEvent.click(screen.getByText('حفظ'));
    
    expect(mockOnSave).toHaveBeenCalledWith({ name: 'دور جديد' });
  });

  it('calls onSave with the updated role name when form is submitted for an existing role', async () => {
    const existingRole = { id: 'editor', name: 'محرر', permissions: [] };
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={existingRole}
        />
      </ToastProvider>
    );

    const input = screen.getByLabelText('اسم الدور');
    fireEvent.change(input, { target: { value: 'محرر محدث' } });
    fireEvent.click(screen.getByText('حفظ'));

    expect(mockOnSave).toHaveBeenCalledWith({ id: 'editor', name: 'محرر محدث' });
  });

  it('does not call onSave if the name is empty', () => {
    render(
      <ToastProvider>
        <RoleFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          role={null}
        />
      </ToastProvider>
    );
    
    // The browser's `required` attribute prevents submission via a button click event.
    // So, we simulate a form submit event directly.
    const form = screen.getByRole('dialog').querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
    
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});