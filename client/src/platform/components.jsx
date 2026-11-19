// ==============================================
// client/src/platform/components.jsx
// Modals shared by several platform pages: renew/extend a subscription,
// send a renewal reminder, create a follow-up, start a conversation, pick
// a restaurant.
// ==============================================

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "./api";
import { Modal, Button, Field, Input, Select, Textarea, Toggle, inr, fmtDate, toInputDate, useApi } from "./ui";

export function RestaurantPicker({ value, onChange, disabled }) {
  const [q, setQ] = useState("");
  const { data } = useApi(() => api.get("/restaurants/options", { q }), [q]);
  const options = data?.options || [];
  return (
    <div className="space-y-1.5">
      <Input placeholder="Search restaurant…" value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} />
      <Select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Select a restaurant"
        options={options.map((o) => ({ value: o.id, label: `${o.name} — ${o.ownerEmail}` }))}
      />
    </div>
  );
}

export function TeamSelect({ value, onChange, placeholder = "Me" }) {
  const { data } = useApi(() => api.get("/team/options"), []);
  return (
    <Select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      options={(data?.options || []).map((o) => ({ value: o.id, label: o.name }))}
    />
  );
}

// ---------------- Renew / change plan ----------------
export function RenewModal({ open, onClose, restaurant, onDone }) {
  const { data } = useApi(() => (open ? api.get("/plans") : Promise.resolve(null)), [open]);
  const plans = useMemo(() => (data?.plans || []).filter((p) => p.isActive), [data]);
  const [form, setForm] = useState({});
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !restaurant) return;
    setForm({
      planId: restaurant.planId && !restaurant.isTrial ? restaurant.planId : "",
      branches: restaurant.branchLimit || 1,
      periods: 1,
      startFrom: "expiry",
      recordPayment: true,
      amount: "",
      paymentMethod: "upi",
      reference: "",
      note: "",
      notify: true,
    });
  }, [open, restaurant]);

  useEffect(() => {
    if (!open || !form.planId) return setQuote(null);
    api
      .get("/renewals/quote", { planId: form.planId, branches: form.branches })
      .then((d) => setQuote(d.quote))
      .catch(() => setQuote(null));
  }, [open, form.planId, form.branches]);

  if (!restaurant) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const plan = plans.find((p) => p.code === form.planId);
  const expected = quote ? quote.total * (Number(form.periods) || 1) : 0;

  const submit = async () => {
    if (!form.planId) return toast.error("Choose a plan.");
    setBusy(true);
    try {
      const r = await api.post(`/renewals/${restaurant.id}/renew`, {
        ...form,
        amount: form.amount === "" ? undefined : Number(form.amount),
      });
      toast.success(`Renewed until ${fmtDate(r.restaurant.planExpiresAt)}`);
      onDone?.();
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
      title={`Renew / change plan — ${restaurant.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Confirm renewal</Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-[#F6F7F4] px-4 py-3 text-xs text-slate-600">
        Current: <b>{restaurant.planName}</b> · {restaurant.branchLimit} branch(es) · expires <b>{fmtDate(restaurant.planExpiresAt)}</b>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan">
          <Select
            value={form.planId || ""}
            onChange={set("planId")}
            placeholder="Choose plan"
            options={plans.map((p) => ({ value: p.code, label: `${p.name}${p.isTrial ? " (trial)" : ` — ${inr(p.price)}/branch/mo`}` }))}
          />
        </Field>
        <Field label="Branches">
          <Input type="number" min={1} max={plan?.maxBranches || 50} value={form.branches || 1} onChange={set("branches")} />
        </Field>
        <Field label="Number of billing periods" hint={plan ? `${plan.isTrial ? `${plan.trialDays} days` : `${plan.months} month(s)`} each` : ""}>
          <Input type="number" min={1} max={24} value={form.periods || 1} onChange={set("periods")} />
        </Field>
        <Field label="Start from">
          <Select
            value={form.startFrom}
            onChange={set("startFrom")}
            options={[
              { value: "expiry", label: "Current expiry date (stack)" },
              { value: "today", label: "Today" },
            ]}
          />
        </Field>
      </div>
      {quote && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-[#E7EAE1] p-3 text-center text-xs">
          <div>
            <p className="text-slate-400">Subtotal</p>
            <p className="font-bold text-slate-800">{inr(quote.subtotal * (Number(form.periods) || 1))}</p>
          </div>
          <div>
            <p className="text-slate-400">GST</p>
            <p className="font-bold text-slate-800">{inr(quote.gst * (Number(form.periods) || 1))}</p>
          </div>
          <div>
            <p className="text-slate-400">Total</p>
            <p className="font-bold text-emerald-600">{inr(expected)}</p>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-3 rounded-xl border border-[#E7EAE1] p-4">
        <Toggle checked={form.recordPayment} onChange={set("recordPayment")} label="Record a payment" description="Adds a PAID entry to Payments for this renewal." />
        {form.recordPayment && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Amount received (₹)" hint={`Expected ${inr(expected)}`}>
              <Input type="number" placeholder={String(expected)} value={form.amount} onChange={set("amount")} />
            </Field>
            <Field label="Method">
              <Select value={form.paymentMethod} onChange={set("paymentMethod")} options={["upi", "bank_transfer", "razorpay", "cash", "cheque", "other"]} />
            </Field>
            <Field label="Reference / UTR">
              <Input value={form.reference} onChange={set("reference")} />
            </Field>
          </div>
        )}
      </div>
      <Field label="Internal note" className="mt-4">
        <Input value={form.note} onChange={set("note")} placeholder="e.g. Paid by owner over phone, 10% loyalty discount" />
      </Field>
      <div className="mt-4">
        <Toggle checked={form.notify} onChange={set("notify")} label="Notify the restaurant" description="Posts a confirmation in their in-app messages (and email, if enabled)." />
      </div>
    </Modal>
  );
}

// ---------------- Extend / set expiry ----------------
export function ExtendModal({ open, onClose, restaurant, onDone }) {
  const [mode, setMode] = useState("days");
  const [days, setDays] = useState(7);
  const [dateVal, setDateVal] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && restaurant) {
      setDays(7);
      setDateVal(toInputDate(restaurant.planExpiresAt));
      setNote("");
    }
  }, [open, restaurant]);
  if (!restaurant) return null;
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "days") await api.post(`/renewals/${restaurant.id}/extend`, { days: Number(days), note });
      else await api.post(`/renewals/${restaurant.id}/expiry`, { date: dateVal, note });
      toast.success("Expiry updated");
      onDone?.();
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
      title={restaurant.isTrial ? "Extend trial" : "Extend / change expiry"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Save</Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-slate-500">Currently expires {fmtDate(restaurant.planExpiresAt)}. No payment is recorded.</p>
      <Select value={mode} onChange={(e) => setMode(e.target.value)} options={[{ value: "days", label: "Add / remove days" }, { value: "date", label: "Set an exact date" }]} />
      <div className="mt-3">
        {mode === "days" ? (
          <Field label="Days" hint="Negative numbers shorten the plan.">
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
        ) : (
          <Field label="New expiry date">
            <Input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Reason" className="mt-3">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Goodwill for downtime" />
      </Field>
    </Modal>
  );
}

// ---------------- Renewal reminder ----------------
export function RemindModal({ open, onClose, restaurant, onDone }) {
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({ message: true, email: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setMessage("");
  }, [open]);
  if (!restaurant) return null;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/renewals/${restaurant.id}/remind`, {
        message: message || undefined,
        channels: Object.keys(channels).filter((k) => channels[k]),
      });
      toast.success(`Reminder sent${r.emailSkipped ? " (email not configured — in-app only)" : ""}`);
      onDone?.();
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
      title={`Send renewal reminder — ${restaurant.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Send reminder</Button>
        </>
      }
    >
      <Field label="Message" hint="Leave empty to send the standard reminder with plan name and expiry date.">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! Your subscription expires soon…" />
      </Field>
      <div className="mt-4 space-y-3">
        <Toggle checked={channels.message} onChange={(v) => setChannels((c) => ({ ...c, message: v }))} label="In-app message" description="They can reply from Help & Support → Messages." />
        <Toggle checked={channels.email} onChange={(v) => setChannels((c) => ({ ...c, email: v }))} label={`Email (${restaurant.ownerEmail})`} />
      </div>
    </Modal>
  );
}

// ---------------- Follow-up ----------------
export const FOLLOWUP_TYPES = ["RENEWAL", "PAYMENT", "ONBOARDING", "SUPPORT", "SALES", "FEEDBACK", "OTHER"];
export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export function FollowUpModal({ open, onClose, onDone, defaults = {}, followUp }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(11, 0, 0, 0);
    setForm(
      followUp
        ? {
            title: followUp.title,
            notes: followUp.notes || "",
            type: followUp.type,
            priority: followUp.priority,
            channel: followUp.channel || "",
            dueAt: new Date(followUp.dueAt).toISOString().slice(0, 16),
            assignedToId: followUp.assignedTo?.id || "",
            organizationId: followUp.organizationId || "",
            contactName: followUp.contactName || "",
            contactPhone: followUp.contactPhone || "",
            contactEmail: followUp.contactEmail || "",
          }
        : {
            title: "",
            notes: "",
            type: "SUPPORT",
            priority: "NORMAL",
            channel: "call",
            dueAt: new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            assignedToId: "",
            organizationId: "",
            contactName: "",
            contactPhone: "",
            contactEmail: "",
            ...defaults,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, followUp]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = async () => {
    if (!form.title) return toast.error("Add a title.");
    setBusy(true);
    try {
      const body = { ...form, dueAt: new Date(form.dueAt).toISOString(), organizationId: form.organizationId || null };
      if (followUp) await api.patch(`/follow-ups/${followUp.id}`, body);
      else await api.post("/follow-ups", body);
      toast.success(followUp ? "Follow-up updated" : "Follow-up created");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const lockedOrg = Boolean(defaults.organizationId) && !followUp;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={followUp ? "Edit follow-up" : "New follow-up"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{followUp ? "Save" : "Create follow-up"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input value={form.title || ""} onChange={set("title")} placeholder="e.g. Call about renewal" />
        </Field>
        <Field label="Due">
          <Input type="datetime-local" value={form.dueAt || ""} onChange={set("dueAt")} />
        </Field>
        <Field label="Assign to">
          <TeamSelect value={form.assignedToId} onChange={set("assignedToId")} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={set("type")} options={FOLLOWUP_TYPES} />
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set("priority")} options={PRIORITIES} />
        </Field>
        <Field label="Channel">
          <Select value={form.channel} onChange={set("channel")} placeholder="—" options={["call", "email", "message", "whatsapp", "meeting"]} />
        </Field>
        <Field label="Restaurant" className="sm:col-span-2">
          {lockedOrg ? (
            <Input value={defaults.organizationName || "Selected restaurant"} disabled />
          ) : (
            <RestaurantPicker value={form.organizationId} onChange={set("organizationId")} />
          )}
        </Field>
        {!form.organizationId && (
          <>
            <Field label="Contact name">
              <Input value={form.contactName || ""} onChange={set("contactName")} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contactPhone || ""} onChange={set("contactPhone")} />
            </Field>
            <Field label="Contact email" className="sm:col-span-2">
              <Input value={form.contactEmail || ""} onChange={set("contactEmail")} />
            </Field>
          </>
        )}
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes || ""} onChange={set("notes")} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------- New conversation ----------------
export const CATEGORIES = ["support", "billing", "renewal", "onboarding", "feedback", "announcement", "other"];

export function NewConversationModal({ open, onClose, onDone, organizationId, organizationName }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setForm({ organizationId: organizationId || "", subject: "", body: "", category: "support", priority: "NORMAL" });
  }, [open, organizationId]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post("/messages", form);
      toast.success("Message sent");
      onDone?.(r.conversation);
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
      title="New conversation"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Send</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Restaurant" className="sm:col-span-2">
          {organizationId ? <Input value={organizationName || ""} disabled /> : <RestaurantPicker value={form.organizationId} onChange={set("organizationId")} />}
        </Field>
        <Field label="Subject" className="sm:col-span-2">
          <Input value={form.subject || ""} onChange={set("subject")} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={set("category")} options={CATEGORIES} />
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set("priority")} options={PRIORITIES} />
        </Field>
        <Field label="Message" className="sm:col-span-2">
          <Textarea value={form.body || ""} onChange={set("body")} className="min-h-[140px]" />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------- Confirm with reason ----------------
export function ConfirmModal({ open, onClose, title, text, confirmLabel = "Confirm", danger, withReason, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(reason);
                onClose();
              } catch (e) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{text}</p>
      {withReason && (
        <Field label="Reason" className="mt-3">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[70px]" />
        </Field>
      )}
    </Modal>
  );
}
