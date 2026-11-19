// client/src/platform/pages/Plans.jsx — /platform/plans
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiCopy, FiTrash2, FiPower, FiStar, FiCheck, FiEyeOff } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, Textarea, Toggle, Loading, ErrorBox, Empty, inr, num, fmtDate, useApi, cx } from "../ui";
import { ConfirmModal } from "../components";

const MODULES = [
  ["pos", "POS & orders"],
  ["kot", "KOT"],
  ["billing", "Billing"],
  ["tables", "Tables"],
  ["reservations", "Reservations"],
  ["menu", "Menu"],
  ["kitchen", "Kitchen display"],
  ["inventory", "Inventory"],
  ["expenses", "Expenses"],
  ["employees", "Employees"],
  ["crm", "CRM & loyalty"],
  ["reports", "Reports"],
  ["profit-loss", "Profit & loss"],
  ["kiosk", "Kiosk / QR ordering"],
];

const EMPTY = {
  code: "",
  name: "",
  description: "",
  cycle: "month",
  months: 1,
  price: 0,
  comparePrice: "",
  gstRate: 18,
  maxBranches: 50,
  trialDays: 30,
  isPublic: true,
  isFeatured: false,
  isActive: true,
  sortOrder: 10,
  features: "",
  modules: MODULES.map(([k]) => k),
};

function PlanModal({ open, onClose, plan, onDone }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(
      plan
        ? {
            ...EMPTY,
            ...plan,
            comparePrice: plan.comparePrice ?? "",
            gstRate: Math.round((plan.gstRate ?? 0.18) * 100),
            trialDays: plan.trialDays || 30,
            features: (plan.features || []).join("\n"),
            modules: plan.modules?.length ? plan.modules : MODULES.map(([k]) => k),
          }
        : EMPTY,
    );
  }, [open, plan]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const isTrial = f.cycle === "trial";
  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        ...f,
        isTrial,
        months: Number(f.months),
        price: Number(f.price),
        comparePrice: f.comparePrice === "" ? null : Number(f.comparePrice),
        gstRate: Number(f.gstRate) / 100,
        maxBranches: Number(f.maxBranches),
        trialDays: isTrial ? Number(f.trialDays) : null,
        sortOrder: Number(f.sortOrder),
      };
      if (plan) await api.patch(`/plans/${plan.id}`, body);
      else await api.post("/plans", body);
      toast.success(plan ? "Plan updated — checkout uses the new price immediately" : "Plan created");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const perMonth = Number(f.price) || 0;
  const periodTotal = perMonth * (Number(f.months) || 1);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? `Edit plan — ${plan.name}` : "Create plan"}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{plan ? "Save changes" : "Create plan"}</Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={f.name} onChange={set("name")} placeholder="e.g. Quarterly" />
          </Field>
          <Field label="Code" hint="Stable id stored on restaurants. Can't change once in use.">
            <Input value={f.code} onChange={set("code")} placeholder="quarterly" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={f.description || ""} onChange={set("description")} />
          </Field>
          <Field label="Billing type">
            <Select
              value={f.cycle}
              onChange={(e) => {
                const v = e.target.value;
                setF((x) => ({ ...x, cycle: v, months: v === "year" ? 12 : v === "trial" ? 1 : x.months }));
              }}
              options={[
                { value: "trial", label: "Free trial" },
                { value: "month", label: "Monthly / multi-month" },
                { value: "year", label: "Yearly" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </Field>
          {isTrial ? (
            <Field label="Trial length (days)">
              <Input type="number" min={1} value={f.trialDays} onChange={set("trialDays")} />
            </Field>
          ) : (
            <Field label="Months per billing period">
              <Input type="number" min={1} value={f.months} onChange={set("months")} />
            </Field>
          )}
          {!isTrial && (
            <>
              <Field label="Price per branch per month (₹)">
                <Input type="number" min={0} value={f.price} onChange={set("price")} />
              </Field>
              <Field label="Compare-at price (₹, optional)" hint="Shown struck-through on the pricing page.">
                <Input type="number" min={0} value={f.comparePrice} onChange={set("comparePrice")} />
              </Field>
              <Field label="GST %">
                <Input type="number" min={0} max={100} value={f.gstRate} onChange={set("gstRate")} />
              </Field>
              <Field label="Max branches">
                <Input type="number" min={1} value={f.maxBranches} onChange={set("maxBranches")} />
              </Field>
            </>
          )}
          <Field label="Sort order">
            <Input type="number" value={f.sortOrder} onChange={set("sortOrder")} />
          </Field>
          <Field label="Features (one per line)" className="sm:col-span-2">
            <Textarea value={f.features} onChange={set("features")} className="min-h-[120px]" />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-600">Modules included</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODULES.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={f.modules.includes(k)}
                    onChange={(e) => setF((x) => ({ ...x, modules: e.target.checked ? [...x.modules, k] : x.modules.filter((m) => m !== k) }))}
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E7EAE1] bg-[#F8FAF5] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{f.name || "Plan name"}</p>
            {isTrial ? (
              <p className="mt-1 text-2xl font-black text-[#3FA34D]">Free · {f.trialDays} days</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {inr(perMonth)}
                  <span className="text-sm font-medium text-slate-500">/branch/mo</span>
                </p>
                {f.comparePrice && <p className="text-xs text-slate-400 line-through">{inr(f.comparePrice)}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Billed {inr(periodTotal)} + {f.gstRate}% GST every {f.months} month(s) per branch
                </p>
              </>
            )}
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {String(f.features)
                .split("\n")
                .filter(Boolean)
                .slice(0, 8)
                .map((x) => (
                  <li key={x} className="flex gap-1.5">
                    <FiCheck className="mt-0.5 shrink-0 text-[#3FA34D]" />
                    {x}
                  </li>
                ))}
            </ul>
          </div>
          <Toggle checked={Boolean(f.isActive)} onChange={set("isActive")} label="Active" description="Inactive plans can't be bought or assigned." disabled={Boolean(plan)} />
          <Toggle checked={Boolean(f.isPublic)} onChange={set("isPublic")} label="Show on pricing page" description="Hidden plans can still be assigned by the team." />
          <Toggle checked={Boolean(f.isFeatured)} onChange={set("isFeatured")} label="Featured" description="Highlighted as 'Most popular'." />
        </div>
      </div>
    </Modal>
  );
}

function PlanCard({ p, onEdit, onReload }) {
  const { can } = usePlatformAuth();
  const [confirm, setConfirm] = useState(null);
  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      onReload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div className={cx("flex flex-col rounded-2xl border bg-white p-5", p.isFeatured ? "border-[#3FA34D] ring-2 ring-[#3FA34D]/15" : "border-[#E7EAE1]", !p.isActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
            {p.isTrial && <Badge tone="blue">Trial</Badge>}
            {p.isFeatured && <Badge tone="green"><FiStar /> Featured</Badge>}
            {!p.isPublic && <Badge><FiEyeOff /> Hidden</Badge>}
            {!p.isActive && <Badge tone="red">Inactive</Badge>}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{p.code}</p>
        </div>
      </div>
      {p.isTrial ? (
        <p className="mt-3 text-2xl font-black text-[#3FA34D]">Free <span className="text-sm font-medium text-slate-500">· {p.trialDays || p.durationDays || 30} days</span></p>
      ) : (
        <p className="mt-3 text-2xl font-black text-slate-900">
          {inr(p.price)}
          <span className="text-sm font-medium text-slate-500">/branch/mo</span>
        </p>
      )}
      <p className="text-xs text-slate-500">
        {p.isTrial ? "1 branch" : `${p.months} month billing · GST ${Math.round(p.gstRate * 100)}% · up to ${p.maxBranches} branches`}
      </p>
      {p.description && <p className="mt-2 text-xs text-slate-500">{p.description}</p>}
      <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-600">
        {(p.features || []).slice(0, 6).map((x) => (
          <li key={x} className="flex gap-1.5">
            <FiCheck className="mt-0.5 shrink-0 text-[#3FA34D]" />
            {x}
          </li>
        ))}
        {(p.features || []).length > 6 && <li className="text-slate-400">+{p.features.length - 6} more</li>}
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#F6F7F4] p-3 text-center">
        <div>
          <p className="text-[10px] uppercase text-slate-400">Active</p>
          <p className="text-sm font-bold">{num(p.subscribers.active)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">All-time</p>
          <p className="text-sm font-bold">{num(p.subscribers.total)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Revenue</p>
          <p className="text-sm font-bold">{inr(p.revenue.revenue, { compact: true })}</p>
        </div>
      </div>
      {!p.isActive && p.deactivatedAt && <p className="mt-2 text-[11px] text-slate-400">Deactivated {fmtDate(p.deactivatedAt)}</p>}
      {can("plans.write") && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => onEdit(p)}>Edit</Button>
          <Button
            size="sm"
            variant={p.isActive ? "dangerSoft" : "secondary"}
            icon={FiPower}
            onClick={() => (p.isActive ? setConfirm("deactivate") : act(() => api.post(`/plans/${p.id}/active`, { isActive: true }), "Plan activated"))}
          >
            {p.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" variant="ghost" icon={FiCopy} onClick={() => act(() => api.post(`/plans/${p.id}/duplicate`), "Duplicated (inactive copy)")} title="Duplicate" />
          {!p.subscribers.total && !p.revenue.payments && (
            <Button size="sm" variant="ghost" icon={FiTrash2} onClick={() => setConfirm("delete")} title="Delete" />
          )}
        </div>
      )}
      <ConfirmModal
        open={confirm === "deactivate"}
        onClose={() => setConfirm(null)}
        title={`Deactivate ${p.name}?`}
        text={`New customers can't buy it and it disappears from the pricing page. The ${p.subscribers.active} restaurant(s) already on it keep their plan until it expires.`}
        danger
        confirmLabel="Deactivate"
        onConfirm={async () => {
          await api.post(`/plans/${p.id}/active`, { isActive: false });
          toast.success("Plan deactivated");
          onReload();
        }}
      />
      <ConfirmModal
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title={`Delete ${p.name}?`}
        text="This plan has never been used, so it can be removed permanently."
        danger
        confirmLabel="Delete"
        onConfirm={async () => {
          await api.del(`/plans/${p.id}`);
          toast.success("Plan deleted");
          onReload();
        }}
      />
    </div>
  );
}

export default function Plans() {
  const { can } = usePlatformAuth();
  const { data, error, loading, reload } = useApi(() => api.get("/plans"), []);
  const [modal, setModal] = useState({ open: false, plan: null });
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const active = data.plans.filter((p) => p.isActive);
  const inactive = data.plans.filter((p) => !p.isActive);
  const trial = active.filter((p) => p.isTrial);
  const paid = active.filter((p) => !p.isTrial);
  const r = () => reload({ silent: true });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        subtitle="What the platform sells. Changes apply to the public checkout and to renewals immediately."
        actions={can("plans.write") && <Button icon={FiPlus} onClick={() => setModal({ open: true, plan: null })}>Create plan</Button>}
      />
      <Card bodyClass="px-5 py-3">
        <p className="text-xs text-slate-500">
          Checkout currently accepts: <b className="text-slate-700">{data.checkoutPlans.join(", ")}</b>. Pricing is per branch per month; a plan's total = price × branches × months + GST.
        </p>
      </Card>
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Trial period</h2>
        {trial.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{trial.map((p) => <PlanCard key={p.id} p={p} onEdit={(plan) => setModal({ open: true, plan })} onReload={r} />)}</div>
        ) : (
          <Card><Empty title="No active trial plan" text="Create a plan with billing type 'Free trial' to offer one." /></Card>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Current pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{paid.map((p) => <PlanCard key={p.id} p={p} onEdit={(plan) => setModal({ open: true, plan })} onReload={r} />)}</div>
      </section>
      {inactive.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Deactivated / drafts</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{inactive.map((p) => <PlanCard key={p.id} p={p} onEdit={(plan) => setModal({ open: true, plan })} onReload={r} />)}</div>
        </section>
      )}
      <PlanModal open={modal.open} plan={modal.plan} onClose={() => setModal({ open: false, plan: null })} onDone={r} />
    </div>
  );
}
