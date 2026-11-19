// client/src/platform/pages/Account.jsx — /platform/account
import { useState } from "react";
import toast from "react-hot-toast";
import { api, setPlatformToken } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import { Card, PageHeader, Field, Input, Button, Badge, titleCase, fmtDateTime } from "../ui";

export default function Account() {
  const { admin, setAdmin } = usePlatformAuth();
  const [profile, setProfile] = useState({ name: admin.name, phone: admin.phone || "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState("");

  const saveProfile = async () => {
    setBusy("p");
    try {
      const r = await api.patch("/auth/me", profile);
      setAdmin(r.admin);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const changePw = async () => {
    if (pw.newPassword !== pw.confirm) return toast.error("Passwords don't match.");
    setBusy("pw");
    try {
      const r = await api.post("/auth/change-password", pw);
      setPlatformToken(r.token);
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed — other sessions were signed out");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="My account" subtitle={`${admin.email} · ${titleCase(admin.role)} · last login ${fmtDateTime(admin.lastLoginAt)}`} />
      <Card title="Profile" action={<Button size="sm" onClick={saveProfile} loading={busy === "p"}>Save</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Phone"><Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
        </div>
      </Card>
      <Card title="Change password" action={<Button size="sm" onClick={changePw} loading={busy === "pw"} disabled={!pw.currentPassword || !pw.newPassword}>Update</Button>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password"><Input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
          <Field label="New password"><Input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
          <Field label="Confirm"><Input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></Field>
        </div>
      </Card>
      <Card title="Your permissions">
        <div className="flex flex-wrap gap-1.5">
          {admin.permissions.map((p) => <Badge key={p} tone="green">{p}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
