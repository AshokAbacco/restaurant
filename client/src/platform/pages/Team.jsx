// client/src/platform/pages/Team.jsx — /platform/team
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUserPlus, FiEdit2, FiKey, FiTrash2, FiCopy } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import { Card, PageHeader, Table, Badge, Button, Modal, Field, Input, Select, Toggle, Loading, Avatar, ago, titleCase, useApi, cx } from "../ui";
import { ConfirmModal } from "../components";

function SecretBox({ value }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
      <code className="text-sm font-bold text-amber-900">{value}</code>
      <Button size="sm" variant="secondary" icon={FiCopy} onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success("Copied"))}>Copy</Button>
    </div>
  );
}

function MemberModal({ open, onClose, member, meta, onDone }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  useEffect(() => {
    if (!open) return;
    setSecret(null);
    setF(
      member
        ? { name: member.name, phone: member.phone || "", role: member.role, overrides: member.permissionOverrides || {} }
        : { name: "", email: "", phone: "", role: "SUPPORT", password: "", sendInvite: true, overrides: {} },
    );
  }, [open, member]);
  if (!meta) return null;
  const defaults = new Set(meta.roleDefaults[f.role] || []);
  const effective = (key) => (key in (f.overrides || {}) ? f.overrides[key] : defaults.has(key));
  const togglePerm = (key) =>
    setF((x) => {
      const o = { ...(x.overrides || {}) };
      const next = !effective(key);
      if (next === defaults.has(key)) delete o[key];
      else o[key] = next;
      return { ...x, overrides: o };
    });
  const groups = meta.permissions.reduce((acc, p) => ((acc[p.group] ||= []).push(p), acc), {});
  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...f, permissions: f.overrides };
      if (member) {
        await api.patch(`/team/${member.id}`, body);
        toast.success("Saved");
        onDone();
        onClose();
      } else {
        const r = await api.post("/team", body);
        toast.success(r.emailed ? "Member added — invite emailed" : "Member added");
        onDone();
        if (r.temporaryPassword) setSecret(r.temporaryPassword);
        else onClose();
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? `Edit ${member.name}` : "Add team member"}
      size="xl"
      footer={
        secret ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={busy}>{member ? "Save" : "Add member"}</Button>
          </>
        )
      }
    >
      {secret ? (
        <div>
          <p className="text-sm text-slate-600">Share this temporary password securely. It won't be shown again.</p>
          <SecretBox value={secret} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <Field label="Name"><Input value={f.name || ""} onChange={set("name")} /></Field>
            {!member && <Field label="Email"><Input type="email" value={f.email || ""} onChange={set("email")} /></Field>}
            <Field label="Phone"><Input value={f.phone || ""} onChange={set("phone")} /></Field>
            <Field label="Role">
              <Select value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value, overrides: {} }))} options={meta.roles.map((r) => ({ value: r.key, label: r.label }))} />
            </Field>
            <p className="text-xs text-slate-500">{meta.roles.find((r) => r.key === f.role)?.description}</p>
            {!member && (
              <>
                <Field label="Password" hint="Leave empty to generate a temporary one."><Input type="text" value={f.password || ""} onChange={set("password")} /></Field>
                <Toggle checked={f.sendInvite} onChange={set("sendInvite")} label="Email the login details" />
              </>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Permissions {f.role === "SUPER_ADMIN" && <span className="font-normal text-slate-400">— super admins always have everything</span>}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groups).map(([g, perms]) => (
                <div key={g} className="rounded-xl border border-[#E7EAE1] p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g}</p>
                  {perms.map((p) => {
                    const on = f.role === "SUPER_ADMIN" || effective(p.key);
                    const overridden = p.key in (f.overrides || {});
                    return (
                      <label key={p.key} className={cx("flex items-center gap-2 py-0.5 text-sm", f.role === "SUPER_ADMIN" && "opacity-60")}>
                        <input type="checkbox" checked={on} disabled={f.role === "SUPER_ADMIN"} onChange={() => togglePerm(p.key)} />
                        <span className={overridden ? "font-semibold text-violet-700" : "text-slate-700"}>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Purple = changed from the role's default.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Team() {
  const { admin, can } = usePlatformAuth();
  const { data, loading, reload } = useApi(() => api.get("/team"), []);
  const meta = useApi(() => api.get("/team/meta"), []);
  const [modal, setModal] = useState({ open: false, member: null });
  const [confirm, setConfirm] = useState(null);
  const [secret, setSecret] = useState(null);
  if (loading && !data) return <Loading />;
  const r = () => reload({ silent: true });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform team"
        subtitle="Who can access the platform admin, and what each person is allowed to do."
        actions={can("team.write") && <Button icon={FiUserPlus} onClick={() => setModal({ open: true, member: null })}>Add member</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(meta.data?.roles || []).map((role) => (
          <Card key={role.key} bodyClass="p-4">
            <p className="text-sm font-bold text-slate-800">{role.label}</p>
            <p className="mt-1 text-xs text-slate-500">{role.description}</p>
            <p className="mt-2 text-xs font-semibold text-[#3FA34D]">{data.team.filter((m) => m.role === role.key).length} member(s)</p>
          </Card>
        ))}
      </div>
      <Card bodyClass="p-0">
        <Table
          rows={data.team}
          columns={[
            {
              key: "n",
              label: "Member",
              render: (m) => (
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} />
                  <div>
                    <p className="font-semibold text-slate-900">{m.name} {m.id === admin.id && <Badge tone="blue">you</Badge>}</p>
                    <p className="text-xs text-slate-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                  </div>
                </div>
              ),
            },
            { key: "role", label: "Role", render: (m) => <Badge tone={m.role === "SUPER_ADMIN" ? "violet" : "slate"}>{titleCase(m.role)}</Badge> },
            { key: "p", label: "Permissions", render: (m) => <span className="text-xs text-slate-500">{m.permissions.length} {Object.keys(m.permissionOverrides || {}).length ? "(customised)" : ""}</span> },
            { key: "w", label: "Workload", render: (m) => <span className="text-xs">{m.openFollowUps} follow-ups · {m.openConversations} chats</span> },
            { key: "seen", label: "Last seen", render: (m) => <span className="text-xs">{ago(m.lastSeenAt || m.lastLoginAt)}</span> },
            { key: "st", label: "Status", render: (m) => <Badge tone={m.isActive ? "green" : "slate"}>{m.isActive ? "Active" : "Deactivated"}</Badge> },
            {
              key: "a",
              label: "",
              render: (m) =>
                can("team.write") && (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setModal({ open: true, member: m })} />
                    <Button size="sm" variant="secondary" icon={FiKey} title="Reset password" onClick={() => setConfirm({ type: "reset", m })} />
                    {m.id !== admin.id && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => api.patch(`/team/${m.id}`, { isActive: !m.isActive }).then(() => { toast.success("Updated"); r(); }).catch((e) => toast.error(e.message))}>
                          {m.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="sm" variant="dangerSoft" icon={FiTrash2} onClick={() => setConfirm({ type: "delete", m })} />
                      </>
                    )}
                  </div>
                ),
            },
          ]}
        />
      </Card>
      <MemberModal open={modal.open} member={modal.member} meta={meta.data} onClose={() => setModal({ open: false, member: null })} onDone={r} />
      <ConfirmModal
        open={confirm?.type === "reset"}
        onClose={() => setConfirm(null)}
        title={`Reset password for ${confirm?.m?.name}?`}
        text="A new temporary password is generated and every session they have is signed out."
        confirmLabel="Reset password"
        onConfirm={async () => {
          const res = await api.post(`/team/${confirm.m.id}/reset-password`);
          setSecret(res.temporaryPassword);
        }}
      />
      <ConfirmModal
        open={confirm?.type === "delete"}
        onClose={() => setConfirm(null)}
        title={`Remove ${confirm?.m?.name}?`}
        text="Their account is deleted. Follow-ups and conversations assigned to them become unassigned."
        danger
        confirmLabel="Remove"
        onConfirm={async () => {
          await api.del(`/team/${confirm.m.id}`);
          toast.success("Removed");
          r();
        }}
      />
      <Modal open={Boolean(secret)} onClose={() => setSecret(null)} title="Temporary password" size="sm" footer={<Button onClick={() => setSecret(null)}>Done</Button>}>
        <p className="text-sm text-slate-600">Share this securely. It won't be shown again.</p>
        {secret && <SecretBox value={secret} />}
      </Modal>
    </div>
  );
}
