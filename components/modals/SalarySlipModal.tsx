import React from 'react';
import { SalarySlipData } from '../../types';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { DocumentDuplicateIcon } from '../ui/Icons';
import { Logo } from '../ui/Logo';

interface SalarySlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    slipData: SalarySlipData | null;
}

const SlipRow: React.FC<{ label: string; value: number; isDeduction?: boolean; currency: string }> = ({ label, value, isDeduction, currency }) => {
    if (value === 0) return null;
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
            <span className={`font-semibold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                {isDeduction ? '-' : '+'} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
        </div>
    );
};


export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({ isOpen, onClose, slipData }) => {
    const { currency } = useSettingsContext();

    if (!isOpen || !slipData) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" dir="rtl">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div id="salary-slip-print-area" className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-start pb-4 border-b border-slate-300 dark:border-slate-600">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">قسيمة راتب</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                لشهر {format(slipData.month, 'MMMM yyyy', { locale: arSA })}
                            </p>
                        </div>
                         <div className="print:block hidden"><Logo /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 my-6 text-sm">
                        <div>
                            <p className="text-slate-500">اسم الموظف</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{slipData.member.name}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">البريد الإلكتروني</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{slipData.member.email}</p>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-300">الراتب الأساسي</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {slipData.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                            </span>
                        </div>
                        <SlipRow label="مستحقات ساعات إضافية" value={slipData.overtimePay} currency={currency} />
                        <SlipRow label="تعويض مصروفات" value={slipData.expensesReimbursed} currency={currency} />
                        <SlipRow label="خصم جزاءات" value={slipData.penaltiesDeducted} isDeduction currency={currency} />
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">صافي الراتب</span>
                        <span className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                            {slipData.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                        </span>
                    </div>
                </div>

                <div id="report-controls" className="flex justify-end space-x-2 rtl:space-x-reverse p-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إغلاق</button>
                    <button onClick={handlePrint} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <DocumentDuplicateIcon className="w-5 h-5"/> <span>طباعة</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
