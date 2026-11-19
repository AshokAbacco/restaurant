// client/src/platform/pages/Login.jsx — /platform/login
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail, FiShield, FiBarChart2, FiMessageSquare, FiHeart } from "react-icons/fi";
import { usePlatformAuth } from "../PlatformAuth";
import { firstAllowedPath } from "../PlatformLayout";
import { Button, FullPageSpinner } from "../ui";

export default function PlatformLogin() {
  const { admin, loading, login } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (admin) return <Navigate to={location.state?.from || firstAllowedPath(admin)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      navigate(location.state?.from || firstAllowedPath(me), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#F6F7F4] font-sans lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0F1712] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#3FA34D]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#3FA34D]/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3FA34D] font-black">P</div>
          <span className="text-lg font-bold">Platform Admin</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Every restaurant on your platform, in one place.</h1>
          <p className="mt-4 text-white/60">Revenue, renewals, conversations, usage and system health — monitored and acted on from a single console.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {[
              [FiBarChart2, "Live revenue & growth"],
              [FiMessageSquare, "Two-way messaging"],
              [FiShield, "Role-based team access"],
              [FiHeart, "Server & DB health"],
            ].map(([Icon, t]) => (
              <div key={t} className="flex items-center gap-2 text-white/75">
                <Icon className="text-[#6FD27D]" /> {t}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">Restricted area · activity is logged</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3FA34D]/10 text-[#3FA34D] lg:hidden">
              <FiShield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Platform team only. Restaurant staff sign in at /login.</p>
          </div>
          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Email</span>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E2E6DC] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#3FA34D] focus:ring-2 focus:ring-[#3FA34D]/15"
                placeholder="you@company.com"
              />
            </div>
          </label>
          <label className="mb-6 block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Password</span>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E2E6DC] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#3FA34D] focus:ring-2 focus:ring-[#3FA34D]/15"
                placeholder="••••••••"
              />
            </div>
          </label>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Sign in to platform
          </Button>
        </form>
      </div>
    </div>
  );
}
