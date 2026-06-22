import React, { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { initialData } from "@shared/data/initialData";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Logo } from "../ui/Logo";
import { useNavigate } from "react-router-dom";

export const AuthPage: React.FC<{ mode?: string }> = ({ mode }) => {
  const { handleLogin, currentUser } = useAuth();
  const { siteSettings } = useSettingsContext();
  const navigate = useNavigate();

  const tokenFromUrl = new URLSearchParams(window.location.search).get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isTakingLong, setIsTakingLong] = useState(false);

  // Invitation-specific states
  const [inviteToken] = useState(tokenFromUrl);
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(mode === "invite");
  const [inviteError, setInviteError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleName, setInviteRoleName] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (window.location.pathname === "/login" || window.location.pathname === "/invite" || window.location.pathname === "/") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoggingIn || isRegistering) {
      timer = setTimeout(() => setIsTakingLong(true), 5000);
    } else {
      setIsTakingLong(false);
    }
    return () => clearTimeout(timer);
  }, [isLoggingIn, isRegistering]);

  useEffect(() => {
    if (mode === "invite") {
      if (!inviteToken) {
        setInviteError("رابط الدعوة غير صالح أو مفقود. يرجى الحصول على رابط دعوة صالح من دير العمل.");
        setIsVerifyingInvite(false);
        return;
      }

      const verifyToken = async () => {
        try {
          const response = await fetch(`/api/invite/verify?token=${encodeURIComponent(inviteToken)}`);
          const data = await response.json();
          if (!response.ok || !data.success) {
            setInviteError(data.error || "عذراً، هذه الدعوة غير صالحة أو قد تكون انتهت صلاحيتها.");
          } else {
            setInviteEmail(data.email);
            setInviteRoleName(data.roleName);
          }
        } catch (err) {
          setInviteError("فشل الاتصال بالخادم للتحقق من الدعوة.");
        } finally {
          setIsVerifyingInvite(false);
        }
      };

      verifyToken();
    }
  }, [mode, inviteToken]);

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

  const onRegisterInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setLoginError("يرجى إدخال اسمك الكامل لتسجيل حسابك.");
      return;
    }
    if (password.length < 6) {
      setLoginError("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
      return;
    }
    if (password !== confirmPassword) {
      setLoginError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsRegistering(true);
    setLoginError("");

    try {
      const response = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          name: fullName,
          password: password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setLoginError(data.error || "حدث خطأ غير متوقع أثناء تفعيل الحساب.");
        setIsRegistering(false);
      } else {
        // Automatically sign up/log in right after
        const { error } = await handleLogin(inviteEmail, password);
        if (error) {
          setLoginError("مرحباً بك! تم تفعيل عضويتك للمنصة بنجاح. يرجى تسجيل الدخول.");
          setIsRegistering(false);
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      }
    } catch (err: any) {
      setLoginError(err.message || "فشلت عملية تفعيل العضوية وإنشاء الحساب.");
      setIsRegistering(false);
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

      {/* Login / Invite Form Side */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-slate-950 relative z-10 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="transform transition-transform hover:scale-105 duration-300 mb-6">
              <Logo />
            </div>

            {isVerifyingInvite ? (
              <>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
                  جاري التحقق من الدعوة...
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                  نحن نقوم بالتحقق من صحة رابط الدعوة الخاص بك حالياً...
                </p>
              </>
            ) : inviteError ? (
              <>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 text-center">
                  رابط دعوة غير صالح
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                  {inviteError}
                </p>
              </>
            ) : mode === "invite" ? (
              <>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
                  إنشاء حساب جديد وتفعيل الدعوة
                </h2>
                <div className="mt-3 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold text-center border border-sky-100 dark:border-sky-800">
                  دورك: {inviteRoleName}
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
                  مرحباً بك مجدداً
                </h2>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                  قم بتسجيل الدخول للوصول إلى مساحة العمل الخاصة بك
                </p>
              </>
            )}
          </div>

          <div className="mt-6">
            {isVerifyingInvite ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : inviteError ? (
              <div className="space-y-4 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full flex justify-center items-center rounded-xl bg-slate-900 dark:bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800 dark:hover:bg-sky-500 transition-all duration-200"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            ) : mode === "invite" ? (
              <form onSubmit={onRegisterInvite} className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    البريد الإلكتروني
                  </label>
                  <input
                    disabled
                    type="email"
                    value={inviteEmail}
                    className="block w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 sm:text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    الاسم الكامل
                  </label>
                  <input
                    id="fullName"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                    placeholder="الاسم الثلاثي أو الثنائي"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    كلمة المرور
                  </label>
                  <input
                    id="password"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="confirmPassword"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                    placeholder="••••••••"
                  />
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
                      جاري معالجة طلبك وتأكيد الدعوة بنجاح...
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="flex w-full justify-center items-center rounded-xl bg-slate-900 dark:bg-sky-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-all duration-200 ease-in-out"
                  >
                    {isRegistering ? <LoadingSpinner /> : "تفعيل الحساب والانضمام للفريق"}
                  </button>
                </div>
              </form>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

