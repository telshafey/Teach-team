import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { SalarySlipData } from '../../types';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Logo } from '../ui/Logo';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipData: SalarySlipData | null;
}

const SlipRow: React.FC<{ label: string; value: number; isDeduction?: boolean; isTotal?: boolean }> = ({ label, value, isDeduction, isTotal }) => {
  const { currency } = useSettingsContext();
  const valueClass = isDeduction ? 'text-red-600' : 'text-green-600';
  const sign = isDeduction ? '-' : '+';

  if (isTotal) {
    return (
      <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded-b-lg font-bold text-lg">
        <span>{label}</span>
        <span>{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-600">
      <span>{label}</span>
      <span className={value > 0 ? valueClass : ''}>
        {value > 0 && sign} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
      </span>
    </div>
  );
};


export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({ isOpen, onClose, slipData }) => {
  const slipRef = useRef<HTMLDivElement>(null);

  if (!slipData) return null;

  const handlePrint = () => {
    const printContent = slipRef.current;
    if (printContent) {
        const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        if (WinPrint) {
            WinPrint.document.write('<html dir="rtl"><head><title>Salary Slip</title>');
            // A very basic style for printing
            WinPrint.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: right; } .header { text-align: center; margin-bottom: 20px; }</style>');
            WinPrint.document.write('</head><body>');
            WinPrint.document.write(printContent.innerHTML);
            WinPrint.document.write('</body></html>');
            WinPrint.document.close();
            WinPrint.focus();
            WinPrint.print();
            WinPrint.close();
        }
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="قسيمة الراتب" size="lg">
      <div ref={slipRef}>
        <div className="header p-4 text-center border-b border-dashed">
            <div className="flex justify-center mb-4"><Logo/></div>
            <h2 className="text-xl font-bold">قسيمة راتب شهر {format(slipData.month, 'MMMM yyyy', { locale: arSA })}</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">اسم الموظف:</span> {slipData.member.name}</div>
            <div><span className="font-semibold">المنصب:</span> {slipData.member.roleId}</div>
        </div>
        <div className="p-4">
            <div className="border rounded-lg overflow-hidden text-sm">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 font-semibold border-b border-slate-200 dark:border-slate-600">
                    <span>البند</span>
                    <span>القيمة</span>
                </div>
                 <SlipRow label="الراتب الأساسي" value={slipData.baseSalary} />
                 <SlipRow label="مستحقات ساعات إضافية" value={slipData.overtimePay} />
                 <SlipRow label="مستحقات مصروفات" value={slipData.expensesReimbursed} />
                 <SlipRow label="خصومات وجزاءات" value={slipData.penaltiesDeducted} isDeduction />
                 <SlipRow label="صافي الراتب" value={slipData.netSalary} isTotal />
            </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button onClick={handlePrint} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md">طباعة</button>
      </div>
    </Modal>
  );
};
