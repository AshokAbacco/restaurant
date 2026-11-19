// client/src/platform/pages/Login.jsx — /platform/login
// Every colour is explicit so the page never inherits the restaurant app's
// dark-theme text colour (that made typed text invisible before).
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  FiLock,
  FiMail,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
  FiShield,
  FiTrendingUp,
  FiMessageSquare,
  FiActivity,
  FiCheckCircle,
} from "react-icons/fi";
import { usePlatformAuth } from "../PlatformAuth";
import { firstAllowedPath } from "../PlatformLayout";
import { FullPageSpinner } from "../ui";

const REMEMBER_KEY = "platform_last_email";

const inputBase =
  "peer h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[15px] font-medium text-slate-900 caret-[#3FA34D] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-4 [color-scheme:light] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff]";

function Preview() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* main card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-white/60">
            Revenue this month
          </p>
          <span className="flex items-center gap-1 rounded-full bg-[#3FA34D]/20 px-2 py-0.5 text-[11px] font-semibold text-[#86E295]">
            <FiTrendingUp /> 18.4%
          </span>
        </div>
        <p className="mt-1 text-3xl font-bold tracking-tight text-white">
          ₹4,82,300
        </p>
        <div className="mt-5 flex h-24 items-end gap-1.5">
          {[38, 52, 44, 61, 58, 72, 66, 80, 74, 88, 82, 96].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-[#3FA34D]/40 to-[#6FD27D]"
              style={{ height: `${h}%`, opacity: 0.45 + i * 0.045 }}
            />
          ))}
        </div>
      </div>
      {/* floating cards */}
      <div className="absolute -left-8 -bottom-10 hidden w-52 rounded-2xl border border-white/10 bg-[#121A14]/90 p-4 shadow-2xl backdrop-blur-xl xl:block">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <FiMessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-white/50">Spice Hub replied</p>
            <p className="text-xs font-semibold text-white">
              “Renewing yearly 👍”
            </p>
          </div>
        </div>
      </div>
      <div className="absolute -right-14 -top-16 hidden w-44 rounded-2xl border border-white/10 bg-[#121A14]/90 p-4 shadow-2xl backdrop-blur-xl xl:block">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6FD27D] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#6FD27D]" />
          </span>
          <p className="text-xs font-semibold text-white">All systems normal</p>
        </div>
        <p className="mt-1.5 text-[11px] text-white/50">
          DB 17 ms · API p95 60 ms
        </p>
      </div>
    </div>
  );
}

export default function PlatformLogin() {
  const { admin, loading, login } = usePlatformAuth();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "Sign in · Platform Admin";
  }, []);

  if (loading) return <FullPageSpinner />;
  if (admin)
    return (
      <Navigate to={location.state?.from || firstAllowedPath(admin)} replace />
    );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* storage unavailable */
      }
      navigate(location.state?.from || firstAllowedPath(me), { replace: true });
    } catch (err) {
      setError(err.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const ring = error
    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
    : "border-slate-200 hover:border-slate-300 focus:border-[#3FA34D] focus:ring-[#3FA34D]/15";

  return (
    <div className="flex min-h-screen bg-[#F4F6F1] font-sans text-slate-900 antialiased [color-scheme:light]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden w-[52%] overflow-hidden bg-[#0B110D] lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#3FA34D]/25 blur-[120px]" />
          <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative flex items-center gap-3 px-12 pt-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CC05C] to-[#2E8A3B] shadow-lg shadow-[#3FA34D]/30">
            <FiShield className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-white">Platform Admin</p>
            <p className="text-xs text-white/50">
              Restaurant ERP · control centre
            </p>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-12 py-10">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6FD27D]" />{" "}
              Operator console
            </span>
            <h1 className="mt-5 text-[40px] font-bold leading-[1.1] tracking-tight text-white">
              Every restaurant on your platform,{" "}
              <span className="bg-gradient-to-r from-[#86E295] to-[#3FA34D] bg-clip-text text-transparent">
                in one place.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              Track revenue and renewals, talk to restaurants, follow up on
              leads and keep an eye on system health — all from a single
              console.
            </p>
          </div>

          <div className="mt-14">
            <Preview />
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6 border-t border-white/5 px-12 py-6">
          {[
            [FiTrendingUp, "Revenue & renewals"],
            [FiMessageSquare, "Two-way messaging"],
            [FiActivity, "Usage & health"],
          ].map(([Icon, label]) => (
            <div
              key={label}
              className="flex items-center gap-2 text-xs font-medium text-white/60"
            >
              <Icon className="h-4 w-4 text-[#6FD27D]" /> {label}
            </div>
          ))}
        </div>
      </aside>

      {/* ---------- Form ---------- */}
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[420px]">
            {/* mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CC05C] to-[#2E8A3B]">
                <FiShield className="h-5 w-5 text-white" />
              </div>
              <p className="text-base font-bold text-slate-900">
                Platform Admin
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,.04),0_24px_48px_-12px_rgba(16,24,40,.12)] sm:p-9">
              <div className="mb-7">
                <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Sign in to the platform admin console.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
                >
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} noValidate className="space-y-5">
                <div>
                  <label
                    htmlFor="pa-email"
                    className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                  >
                    Work email
                  </label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="pa-email"
                      type="email"
                      autoComplete="username"
                      autoFocus={!email}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="name@company.com"
                      className={`${inputBase} ${ring}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="pa-password"
                      className="block text-[13px] font-semibold text-slate-700"
                    >
                      Password
                    </label>
                    <span className="text-xs text-slate-400">
                      Forgot it? Ask a super admin
                    </span>
                  </div>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="pa-password"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      autoFocus={Boolean(email)}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock"))}
                      placeholder="Enter your password"
                      className={`${inputBase} ${ring} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? (
                        <FiEyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <FiEye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                  {caps && (
                    <p className="mt-1.5 text-xs font-medium text-amber-600">
                      Caps Lock is on
                    </p>
                  )}
                </div>

                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#3FA34D]"
                  />
                  Remember my email on this device
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#45B054] to-[#369445] text-[15px] font-semibold text-white shadow-lg shadow-[#3FA34D]/25 transition hover:from-[#3FA34D] hover:to-[#2F8A3D] focus:outline-none focus:ring-4 focus:ring-[#3FA34D]/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#3FA34D]" />
                <span>
                  For the platform team only. Restaurant owners and staff sign
                  in at{" "}
                  <a
                    href="/login"
                    className="font-semibold text-[#2F8A3D] hover:underline"
                  >
                    /login
                  </a>
                  .
                </span>
              </div>
            </div>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <FiShield className="h-3.5 w-3.5" /> Secure area · sign-ins are
            logged
          </span>
          <span>© {new Date().getFullYear()} Restaurant ERP</span>
        </footer>
      </main>
    </div>
  );
}
