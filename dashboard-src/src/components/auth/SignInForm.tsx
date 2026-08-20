import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";

const inputClasses =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-brand-400/50 dark:focus:ring-brand-400/10";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const nextMessage =
      typeof location.state === "object" &&
      location.state &&
      "message" in location.state &&
      typeof location.state.message === "string"
        ? location.state.message
        : "";

    setMessage(nextMessage);
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const { error: signInError, requiresPasswordChange } = await signIn(
        email,
        password
      );
      if (signInError) {
        setError(signInError);
      } else {
        navigate(requiresPasswordChange ? "/force-password-change" : "/");
      }
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">أهلا بك</h2>

        <div>
          <label className="mb-2 block text-xs text-gray-500 dark:text-white/70">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            autoComplete="username"
            required
            dir="ltr"
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-gray-500 dark:text-white/70">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={`${inputClasses} pl-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? (
                <EyeCloseIcon className="fill-gray-400 dark:fill-white/40" />
              ) : (
                <EyeIcon className="fill-gray-400 dark:fill-white/40" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-gray-500 dark:text-white/60">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
              className="h-3.5 w-3.5 rounded border-gray-300 bg-white accent-brand-500 dark:border-white/20 dark:bg-white/5"
            />
            ابقني مسجلًا
          </label>
          <Link
            to="/reset-password"
            className="text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "تسجيل الدخول"
          )}
        </button>

        <p className="pt-1 text-center text-xs text-gray-400 dark:text-white/50">
          ليس لديك حساب؟{" "}
          <Link
            to="/signup"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            إنشاء حساب
          </Link>
        </p>
      </form>
    </div>
  );
}
