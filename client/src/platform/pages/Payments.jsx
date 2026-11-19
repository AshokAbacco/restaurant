// client/src/platform/pages/Payments.jsx — /platform/payments
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiDownload, FiPlus, FiDollarSign, FiPercent, FiCreditCard, FiAlertTriangle } from "react-icons/fi";
import { api, downloadCsv } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import {
  Card,
  PageHeader,
  Table,
  Tabs,
  StatusBadge,
  Badge,
  Button,
  Stat,
  Select,
  Input,
  SearchInput,
  Pagination,
  Loading,
  Drawer,
  KeyValue,
  Modal,
  Field,
  Textarea,
  inr,
  num,
  fmtDateTime,
  titleCase,
  useApi,
} from "../ui";
import { RestaurantPicker } from "../components";

function RecordModal({ open, onClose, onDone }) {
  const [f, setF] = useState({ organizationId: "", amount: "", paymentMethod: "upi", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/payments", { ...f, amount: Number(f.amount) });
      toast.success("Payment recorded");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record offline payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Record</Button>
        </>
      }
    >
      <p className="mb-4 text-xs text-slate-500">Records money received without changing the plan. To extend a plan and record payment together, use Renew.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Restaurant" className="sm:col-span-2">
          <RestaurantPicker value={f.organizationId} onChange={set("organizationId")} />
        </Field>
        <Field label="Amount incl. GST (₹)">
          <Input type="number" value={f.amount} onChange={set("amount")} />
        </Field>
        <Field label="Method">
          <Select value={f.paymentMethod} onChange={set("paymentMethod")} options={["upi", "bank_transfer", "cash", "cheque", "razorpay", "other"]} />
        </Field>
        <Field label="Reference / UTR" className="sm:col-span-2">
          <Input value={f.reference} onChange={set("reference")} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={f.notes} onChange={set("notes")} />
        </Field>
      </div>
    </Modal>
  );
}

function PaymentDrawer({ id, onClose }) {
  const { data, loading } = useApi(() => api.get(`/payments/${id}`), [id]);
  const p = data?.payment;
  return (
    <Drawer open onClose={onClose} title="Payment details">
      {loading || !p ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-slate-900">{inr(p.amount)}</p>
            <StatusBadge status={p.status} />
          </div>
          <KeyValue
            items={[
              ["Restaurant", p.organization ? <Link key="o" className="text-[#3FA34D]" to={`/platform/restaurants/${p.organization.id}`}>{p.organization.name}</Link> : p.restaurantName],
              ["Contact", `${p.contactName || "—"} · ${p.email}`],
              ["Phone", p.phone],
              ["Plan", `${p.planId} · ${p.tierLabel || p.tierKey || ""}`],
              ["Billing", `${p.billingCycle} · ${p.branches} branch(es)`],
              ["Subtotal", inr(p.subtotal)],
              ["GST", inr(p.gst)],
              ["Source", titleCase(p.source)],
              ["Method", p.paymentMethod || "razorpay"],
              ["Reference", p.reference || p.razorpayPaymentId || "—"],
              ["Razorpay order", p.razorpayOrderId || "—"],
              ["Invoice", p.invoiceNumber || "—"],
              ["Created", fmtDateTime(p.createdAt)],
              ["Recorded by", p.recordedBy?.name || (p.source === "checkout" ? "Customer checkout" : "—")],
              p.errorMessage && ["Error", p.errorMessage],
              p.notes && ["Notes", p.notes],
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}

export default function Payments() {
  const [sp, setSp] = useSearchParams();
  const { can } = usePlatformAuth();
  const params = {
    status: sp.get("status") || "",
    source: sp.get("source") || "",
    q: sp.get("q") || "",
    from: sp.get("from") || "",
    to: sp.get("to") || "",
    page: Number(sp.get("page") || 1),
  };
  const set = (patch) => setSp(Object.fromEntries(Object.entries({ ...params, page: "", ...patch }).filter(([, v]) => v)));
  const { data, loading, reload } = useApi(() => api.get("/payments", params), [sp.toString()]);
  const [view, setView] = useState(null);
  const [rec, setRec] = useState(false);
  const s = data?.summary;
  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Every plan purchase — website checkouts, renewals and offline payments."
        actions={
          <>
            <Button variant="secondary" icon={FiDownload} onClick={() => downloadCsv("/payments/export", params).catch((e) => toast.error(e.message))}>Export CSV</Button>
            {can("payments.write") && <Button icon={FiPlus} onClick={() => setRec(true)}>Record payment</Button>}
          </>
        }
      />
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Collected (filtered)" value={inr(s.paidAmount, { compact: true })} sub={`${num(s.paidCount)} paid payments`} icon={FiDollarSign} />
          <Stat label="Net of GST" value={inr(s.paidSubtotal, { compact: true })} sub={`GST ${inr(s.paidGst, { compact: true })}`} icon={FiPercent} tone="blue" />
          <Stat label="Average payment" value={inr(s.avgTicket)} sub={Object.entries(s.bySource).map(([k, v]) => `${k}: ${v.count}`).join(" · ") || "—"} icon={FiCreditCard} tone="violet" />
          <Stat
            label="Failed / unpaid"
            value={num((s.byStatus.FAILED?.count || 0) + (s.byStatus.VERIFICATION_FAILED?.count || 0) + (s.byStatus.CREATED?.count || 0))}
            sub={`${s.byStatus.CREATED?.count || 0} abandoned checkouts`}
            icon={FiAlertTriangle}
            tone="red"
          />
        </div>
      )}
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <Tabs
            value={params.status}
            onChange={(v) => set({ status: v })}
            tabs={[
              { value: "", label: "All" },
              { value: "PAID", label: "Paid", count: s?.byStatus?.PAID?.count },
              { value: "CREATED", label: "Pending" },
              { value: "FAILED", label: "Failed" },
              { value: "VERIFICATION_FAILED", label: "Verify failed" },
            ]}
          />
          <Select className="!w-36" value={params.source} onChange={(e) => set({ source: e.target.value })} placeholder="All sources" options={["checkout", "renewal", "manual"]} />
          <Input type="date" className="!w-auto" value={params.from} onChange={(e) => set({ from: e.target.value })} />
          <span className="text-xs text-slate-400">to</span>
          <Input type="date" className="!w-auto" value={params.to} onChange={(e) => set({ to: e.target.value })} />
          <SearchInput value={params.q} onChange={(q) => set({ q })} placeholder="Restaurant, email, invoice, UTR…" />
        </div>
        {loading && !data ? (
          <Loading />
        ) : (
          <>
            <Table
              onRowClick={(p) => setView(p.id)}
              rows={data?.payments}
              columns={[
                { key: "date", label: "Date", render: (p) => <span className="whitespace-nowrap text-xs">{fmtDateTime(p.createdAt)}</span> },
                { key: "r", label: "Restaurant", render: (p) => <div><p className="font-semibold text-slate-900">{p.organizationName}</p><p className="text-xs text-slate-500">{p.email}</p></div> },
                { key: "plan", label: "Plan", render: (p) => <span className="text-sm">{p.planId} · {p.branches} br · {p.billingCycle}</span> },
                { key: "src", label: "Source", render: (p) => <Badge tone={p.source === "checkout" ? "blue" : p.source === "renewal" ? "green" : "slate"}>{p.source}</Badge> },
                { key: "m", label: "Method", render: (p) => <span className="text-xs">{p.paymentMethod || "razorpay"}</span> },
                { key: "inv", label: "Invoice", render: (p) => <span className="text-xs">{p.invoiceNumber || "—"}</span> },
                { key: "st", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
                { key: "amt", label: "Amount", align: "right", render: (p) => <b>{inr(p.amount)}</b> },
              ]}
            />
            <Pagination page={data?.page || 1} pageSize={data?.pageSize || 25} total={data?.total || 0} onChange={(p) => set({ page: String(p) })} />
          </>
        )}
      </Card>
      {view && <PaymentDrawer id={view} onClose={() => setView(null)} />}
      <RecordModal open={rec} onClose={() => setRec(false)} onDone={() => reload({ silent: true })} />
    </div>
  );
}
