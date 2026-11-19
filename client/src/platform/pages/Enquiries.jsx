// client/src/platform/pages/Enquiries.jsx — /platform/enquiries
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiDownload, FiSend, FiCheckSquare, FiTrash2, FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { api, downloadCsv } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import {
  Card,
  PageHeader,
  Table,
  Tabs,
  StatusBadge,
  Button,
  Select,
  SearchInput,
  Pagination,
  Loading,
  Drawer,
  Field,
  Textarea,
  Input,
  Badge,
  fmtDateTime,
  ago,
  useApi,
} from "../ui";
import { ConfirmModal, TeamSelect } from "../components";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"];

function EnquiryDrawer({ id, onClose, onChanged }) {
  const { can } = usePlatformAuth();
  const { data, loading, reload } = useApi(() => api.get(`/enquiries/${id}`), [id]);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState(null);
  const [fu, setFu] = useState({ dueAt: "", assignedToId: "" });
  const [busy, setBusy] = useState("");
  const [del, setDel] = useState(false);
  const item = data?.item;
  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      if (msg) toast.success(msg);
      reload({ silent: true });
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Drawer open onClose={onClose} title="Website enquiry" width="max-w-2xl">
      {loading || !item ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{item.restaurantName}</h2>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-slate-600">{item.fullName} · received {fmtDateTime(item.createdAt)}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <a href={`mailto:${item.email}`} className="flex items-center gap-1 text-[#3FA34D]"><FiMail /> {item.email}</a>
              <a href={`tel:${item.phone}`} className="flex items-center gap-1 text-[#3FA34D]"><FiPhone /> {item.phone}</a>
              {item.address && <span className="flex items-center gap-1 text-slate-500"><FiMapPin /> {item.address}</span>}
            </div>
            {data.existingOrg && (
              <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
                Already a customer: <Link className="font-semibold underline" to={`/platform/restaurants/${data.existingOrg.id}`}>{data.existingOrg.name}</Link>
              </p>
            )}
          </div>
          <div className="whitespace-pre-wrap rounded-2xl border border-[#E7EAE1] bg-[#F8FAF5] p-4 text-sm text-slate-700">{item.message}</div>

          {can("enquiries.write") && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => run("st", () => api.patch(`/enquiries/${item.id}`, { status: s }), "Status updated")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === s ? "bg-[#3FA34D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Card title="Reply by email" bodyClass="p-4">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Hi ${item.fullName}, thanks for your interest…`} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{item.repliedAt ? `Last replied ${ago(item.repliedAt)}` : "Not replied yet"}</span>
                  <Button
                    size="sm"
                    icon={FiSend}
                    disabled={!reply.trim()}
                    loading={busy === "reply"}
                    onClick={() =>
                      run("reply", async () => {
                        const r = await api.post(`/enquiries/${item.id}/reply`, { body: reply });
                        setReply("");
                        toast.success(r.emailSkipped ? "Logged (email not configured)" : "Reply sent");
                      })
                    }
                  >
                    Send reply
                  </Button>
                </div>
              </Card>
              <Card title="Create follow-up" subtitle="Schedule a call-back and track it in Follow-ups." bodyClass="p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label="Due">
                    <Input type="datetime-local" value={fu.dueAt} onChange={(e) => setFu((f) => ({ ...f, dueAt: e.target.value }))} />
                  </Field>
                  <Field label="Assign to">
                    <TeamSelect value={fu.assignedToId} onChange={(v) => setFu((f) => ({ ...f, assignedToId: v }))} />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      icon={FiCheckSquare}
                      loading={busy === "fu"}
                      onClick={() =>
                        run("fu", () => api.post(`/enquiries/${item.id}/follow-up`, { dueAt: fu.dueAt ? new Date(fu.dueAt).toISOString() : undefined, assignedToId: fu.assignedToId || undefined }), "Follow-up created")
                      }
                    >
                      Create
                    </Button>
                  </div>
                </div>
                {item.followUps.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {item.followUps.map((f) => (
                      <Link key={f.id} to={`/platform/follow-ups?open=${f.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-[#F6F7F4]">
                        <span>{f.title}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">{fmtDateTime(f.dueAt)} <StatusBadge status={f.status} /></span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Internal notes" bodyClass="p-4">
                <Textarea value={notes ?? item.adminNotes ?? ""} onChange={(e) => setNotes(e.target.value)} className="min-h-[120px]" />
                <div className="mt-2 flex justify-between">
                  <Button size="sm" variant="dangerSoft" icon={FiTrash2} onClick={() => setDel(true)}>Delete enquiry</Button>
                  <Button size="sm" variant="secondary" disabled={notes === null} onClick={() => run("notes", () => api.patch(`/enquiries/${item.id}`, { adminNotes: notes }), "Notes saved")}>
                    Save notes
                  </Button>
                </div>
              </Card>
            </>
          )}
          <ConfirmModal
            open={del}
            onClose={() => setDel(false)}
            title="Delete enquiry?"
            text="This permanently removes the enquiry."
            danger
            confirmLabel="Delete"
            onConfirm={async () => {
              await api.del(`/enquiries/${item.id}`);
              onChanged();
              onClose();
            }}
          />
        </div>
      )}
    </Drawer>
  );
}

export default function Enquiries() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "";
  const q = sp.get("q") || "";
  const page = Number(sp.get("page") || 1);
  const [view, setView] = useState(null);
  const set = (patch) => setSp(Object.fromEntries(Object.entries({ status, q, ...patch }).filter(([, v]) => v)));
  const { data, loading, reload } = useApi(() => api.get("/enquiries", { status, q, page }), [status, q, page]);
  const c = data?.counts || {};
  return (
    <div>
      <PageHeader
        title="Website enquiries"
        subtitle="Messages from the Contact page — reply, qualify and turn them into follow-ups."
        actions={<Button variant="secondary" icon={FiDownload} onClick={() => downloadCsv("/enquiries/export", { status, q }).catch((e) => toast.error(e.message))}>Export CSV</Button>}
      />
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <Tabs
            value={status}
            onChange={(v) => set({ status: v })}
            tabs={[{ value: "", label: "All", count: c.ALL }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase(), count: c[s] }))]}
          />
          <SearchInput value={q} onChange={(v) => set({ q: v })} />
        </div>
        {loading && !data ? (
          <Loading />
        ) : (
          <>
            <Table
              onRowClick={(e) => setView(e.id)}
              rows={data?.items}
              columns={[
                { key: "at", label: "Received", render: (e) => <span className="whitespace-nowrap text-xs">{fmtDateTime(e.createdAt)}<br /><span className="text-slate-400">{ago(e.createdAt)}</span></span> },
                { key: "r", label: "Restaurant", render: (e) => <div><p className="font-semibold text-slate-900">{e.restaurantName}</p><p className="text-xs text-slate-500">{e.fullName}</p></div> },
                { key: "c", label: "Contact", render: (e) => <div className="text-xs">{e.email}<br />{e.phone}</div> },
                { key: "m", label: "Message", render: (e) => <p className="line-clamp-2 max-w-sm text-xs text-slate-600">{e.message}</p> },
                { key: "fu", label: "", render: (e) => (e._count?.followUps ? <Badge tone="violet">{e._count.followUps} FU</Badge> : null) },
                { key: "s", label: "Status", render: (e) => <StatusBadge status={e.status} /> },
              ]}
            />
            <Pagination page={data?.page || 1} pageSize={data?.pageSize || 25} total={data?.total || 0} onChange={(p) => set({ page: String(p) })} />
          </>
        )}
      </Card>
      {view && <EnquiryDrawer id={view} onClose={() => setView(null)} onChanged={() => reload({ silent: true })} />}
    </div>
  );
}
