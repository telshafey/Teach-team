import React, { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { initialData } from "@shared/data/initialData";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Logo } from "../ui/Logo";

export const AuthPage: React.FC = () => {
  const { handleLogin } = useAuth();
  const { siteSettings } = useSettingsContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isTakingLong, setIsTakingLong] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoggingIn) {
      timer = setTimeout(() => setIsTakingLong(true), 5000);
    } else {
      setIsTakingLong(false);
    }
    return () => clearTimeout(timer);
  }, [isLoggingIn]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const { error } = await handleLogin(email, password);
      if (error) {
        setLoginError(
          error.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
            : error.message,
        );
      }
    } catch (err: any) {
      setLoginError(
        err.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans rtl">
      {/* Visual / Artistic Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 justify-center items-center">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/30 blur-3xl opacity-60 mix-blend-screen animate-blob" />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-sky-500/30 to-blue-600/30 blur-3xl opacity-60 mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-cyan-400/20 to-emerald-400/20 blur-3xl opacity-60 mix-blend-screen animate-blob animation-delay-4000" />
          
          <div className="absolute inset-0 bg-[#0B1120]/40 backdrop-blur-[2px]" />
        </div>

        {/* Floating Glass Card Effect */}
        <div className="relative z-10 w-full max-w-lg p-12">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
              {siteSettings?.loginTitle || "إدارة أعمالك برؤية مستقبلية وأداء استثنائي."}
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed font-light whitespace-pre-wrap">
              {siteSettings?.loginSubtitle || "منصة متكاملة تجمع فريقك، مهامك، ومشاريعك في مكان واحد، لتمنحك الوضوح والتركيز لتحقيق أهدافك بكفاءة عالية."}
            </p>
          </div>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-slate-950 relative z-10 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center mb-10">
            <div className="transform transition-transform hover:scale-105 duration-300 mb-6">
              <Logo />
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
              مرحباً بك مجدداً
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              قم بتسجيل الدخول للوصول إلى مساحة العمل الخاصة بك
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={onLogin} className="space-y-6">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  كلمة المرور
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="mr-2 block text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                  >
                    تذكرني
                  </label>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800/50">
                  <p className="text-sm text-red-700 dark:text-red-400 text-center font-medium">
                    {loginError}
                  </p>
                </div>
              )}

              {isTakingLong && (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-900/30 p-4 border border-sky-200 dark:border-sky-800/50 animate-pulse">
                  <p className="text-sm text-sky-700 dark:text-sky-400 text-center font-medium">
                    جاري التجهيز... قد يستغرق هذا بضع ثوانٍ.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex w-full justify-center items-center rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-sky-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none transition-all duration-200 ease-in-out"
                >
                  {isLoggingIn ? <LoadingSpinner /> : "الدخول إلى حسابك"}
                </button>
              </div>
              
              <div className="mt-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  بحاجة لمساعدة في تسجيل الدخول؟
                </p>
                <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-200">
                  تواصل مع الإدارة: 
                  <a href={`mailto:${siteSettings?.supportEmail || initialData.siteSettings.supportEmail}`} className="text-sky-600 hover:text-sky-500 mr-2 transition-colors inline-block" dir="ltr">
                    {siteSettings?.supportEmail || initialData.siteSettings.supportEmail}
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

