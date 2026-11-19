// client/src/platform/pages/Webhooks.jsx — /platform/webhooks
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiZap, FiAlertTriangle, FiCheckCircle, FiClock, FiLink } from "react-icons/fi";
import { api, } from "../api";
import { BASE_URL } from "../../api/apiClient";
import { Card, PageHeader, Table, Tabs, Badge, Stat, Pagination, Loading, Drawer, KeyValue, Empty, Input, fmtDateTime, ago, useApi } from "../ui";

function WebhookDrawer({ id, onClose }) {
  const { data, loading } = useApi(() => api.get(`/webhooks/${id}`), [id]);
  const w = data?.item;
  return (
    <Drawer open onClose={onClose} title="Webhook request" width="max-w-2xl">
      {loading || !w ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <KeyValue
            items={[
              ["Provider", w.provider],
              ["Event", w.event || "—"],
              ["Received", fmtDateTime(w.createdAt)],
              ["Response", <Badge key="s" tone={w.success ? "green" : "red"}>HTTP {w.statusCode}</Badge>],
              ["Signature", w.signatureValid === false ? "Invalid" : w.signatureValid ? "Valid" : "—"],
              ["Duration", `${w.durationMs} ms`],
              ["Path", w.path],
              ["IP", w.ip],
              ["Size", w.rawSize ? `${w.rawSize} bytes` : "—"],
              w.error && ["Error", <span key="e" className="text-rose-600">{w.error}</span>],
            ]}
          />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Headers</p>
            <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(w.headers, null, 2)}</pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Payload</p>
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(w.payload, null, 2)}</pre>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function Webhooks() {
  const [sp, setSp] = useSearchParams();
  const success = sp.get("success") || "";
  const from = sp.get("from") || "";
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const { data, loading } = useApi(() => api.get("/webhooks", { success, from, page }), [success, from, page], { interval: 30000 });
  const s = data?.stats;
  return (
    <div>
      <PageHeader title="Webhooks" subtitle="Every inbound webhook request (Razorpay) — payload, signature check and response." />
      {s && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Received (24h)" value={s.last24h} icon={FiZap} tone="blue" />
            <Stat label="Failed (24h)" value={s.failed24h} icon={FiAlertTriangle} tone={s.failed24h ? "red" : "slate"} />
            <Stat label="Success rate (7d)" value={s.successRate7d === null ? "—" : `${s.successRate7d}%`} icon={FiCheckCircle} />
            <Stat label="Last received" value={ago(s.lastReceivedAt)} icon={FiClock} tone="slate" />
          </div>
          <Card className="mb-4" bodyClass="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><FiLink /> Endpoint: <code className="rounded bg-slate-100 px-1.5 py-0.5">{BASE_URL}{s.endpoint.replace(/^\/api/, "")}</code></span>
            <span>Secret: {s.secretConfigured ? <Badge tone="green">configured</Badge> : <Badge tone="red">RAZORPAY_WEBHOOK_SECRET missing</Badge>}</span>
            <span>Events (30d): {s.byEvent.map((e) => `${e.event} ×${e.count}`).join(", ") || "none"}</span>
          </Card>
        </>
      )}
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <Tabs
            value={success}
            onChange={(v) => { setSp(v ? { success: v } : {}); setPage(1); }}
            tabs={[
              { value: "", label: "All" },
              { value: "true", label: "Succeeded" },
              { value: "false", label: "Failed" },
            ]}
          />
          <Input type="date" className="!w-auto" value={from} onChange={(e) => setSp({ ...(success ? { success } : {}), ...(e.target.value ? { from: e.target.value } : {}) })} />
        </div>
        {loading && !data ? (
          <Loading />
        ) : (
          <>
            <Table
              onRowClick={(w) => setView(w.id)}
              rows={data?.items}
              empty={<Empty title="No webhooks received" text="Razorpay will post here once a webhook is configured in your Razorpay dashboard." />}
              columns={[
                { key: "at", label: "Received", render: (w) => <span className="whitespace-nowrap text-xs">{fmtDateTime(w.createdAt)}</span> },
                { key: "p", label: "Provider", render: (w) => <Badge>{w.provider}</Badge> },
                { key: "e", label: "Event", render: (w) => w.event || "—" },
                { key: "s", label: "Status", render: (w) => <Badge tone={w.success ? "green" : "red"}>{w.statusCode}</Badge> },
                { key: "sig", label: "Signature", render: (w) => (w.signatureValid === false ? <Badge tone="red">invalid</Badge> : w.signatureValid ? <Badge tone="green">ok</Badge> : "—") },
                { key: "d", label: "Time", align: "right", render: (w) => `${w.durationMs} ms` },
                { key: "err", label: "Error", render: (w) => <span className="text-xs text-rose-600">{w.error || ""}</span> },
              ]}
            />
            <Pagination page={data?.page || 1} pageSize={data?.pageSize || 50} total={data?.total || 0} onChange={setPage} />
          </>
        )}
      </Card>
      {view && <WebhookDrawer id={view} onClose={() => setView(null)} />}
    </div>
  );
}
