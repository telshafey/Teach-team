import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Logo } from '../ui/Logo';

export const AuthPage: React.FC = () => {
    const { handleLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
  
    const onLogin = async (e: FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      const { error: loginError } = await handleLogin(email, password);
      if (loginError) {
        if (loginError.message === 'Invalid login credentials') {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        } else {
          setError(loginError.message);
        }
      }
      setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="mb-8">
                <Logo />
            </div>
            <div className="w-full max-w-sm">
                 <Card>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">تسجيل الدخول</h2>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">مرحباً بك مجدداً! قم بتسجيل الدخول للمتابعة.</p>
                        <form onSubmit={onLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                            البريد الإلكتروني
                            </label>
                            <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 dark:text-slate-200 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6 bg-white dark:bg-slate-700"
                            />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                                كلمة المرور
                            </label>
                            </div>
                            <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 dark:text-slate-200 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6 bg-white dark:bg-slate-700"
                            />
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                            />
                            <label htmlFor="remember-me" className="mr-2 block text-sm text-slate-900 dark:text-slate-200">
                                تذكرني
                            </label>
                            </div>
                        </div>

                        <div>
                            <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center items-center rounded-md bg-sky-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:bg-slate-400"
                            >
                            {isLoading ? <LoadingSpinner /> : 'دخول'}
                            </button>
                        </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
};
