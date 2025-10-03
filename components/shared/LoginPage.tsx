import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { Logo } from '../ui/Logo';

export const LoginPage: React.FC = () => {
  const { teamMembers, handleLogin } = useAuth();
  const { siteSettings } = useAppDataContext();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userToLogin = teamMembers.find(m => m.id.toString() === selectedUserId);
    if (userToLogin) {
      handleLogin(userToLogin);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-200 mb-2">
                مرحباً بك
            </h1>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
                هذه صفحة تسجيل دخول تجريبية. الرجاء اختيار مستخدم للمتابعة.
            </p>
            <form onSubmit={handleFormSubmit}>
                <div className="mb-4">
                    <label htmlFor="user-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        اختر حسابك
                    </label>
                    <select
                        id="user-select"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-[var(--theme-color-500)]"
                        required
                    >
                        <option value="" disabled>-- اختر مستخدم --</option>
                        {teamMembers.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    className="w-full bg-[var(--theme-color-600)] text-white font-semibold py-3 px-4 rounded-md hover:bg-[var(--theme-color-700)] transition-colors disabled:bg-slate-400"
                    disabled={!selectedUserId}
                >
                    تسجيل الدخول
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};