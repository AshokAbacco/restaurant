// client/src/platform/pages/Settings.jsx — /platform/settings
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlay } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import { Card, PageHeader, Button, Field, Input, Textarea, Toggle, Loading, Badge, Tabs, useApi } from "../ui";

// Field definitions per section — label, hint and input type. Anything a
// section stores that isn't listed here is still saved, just not editable.
const SECTIONS = {
  general: {
    title: "General",
    subtitle: "Branding and the support contact shown to restaurants in Help & Support.",
    fields: [
      ["platformName", "Platform name"],
      ["companyName", "Company / legal name"],
      ["supportEmail", "Support email"],
      ["supportPhone", "Support phone"],
      ["supportWhatsapp", "Support WhatsApp"],
      ["timezone", "Timezone"],
      ["currency", "Currency"],
    ],
  },
  subscriptions: {
    title: "Subscriptions & renewals",
    subtitle: "Reminders, grace period and automatic actions. Automations run every hour.",
    fields: [
      ["expiryReminderDays", "Reminder days before expiry", "list", "Comma separated, e.g. 7,3,1"],
      ["sendExpiryReminderMessages", "Send in-app expiry reminders automatically", "bool"],
      ["autoCreateRenewalFollowUps", "Create renewal follow-ups automatically", "bool"],
      ["renewalFollowUpLeadDays", "Create renewal follow-ups this many days before expiry", "number"],
      ["gracePeriodDays", "Grace period after expiry (days)", "number"],
      ["autoSuspendExpired", "Auto-suspend restaurants after the grace period", "bool", "Users are blocked from signing in until renewed."],
    ],
  },
  messaging: {
    title: "Messaging",
    subtitle: "How conversations with restaurants behave.",
    fields: [
      ["emailRestaurantOnReply", "Email the owner when we reply", "bool"],
      ["notifyTeamOnNewMessage", "Email the team when a restaurant writes", "bool"],
      ["autoReplyEnabled", "Auto-reply to new restaurant messages", "bool"],
      ["autoReplyText", "Auto-reply text", "text"],
      ["signature", "Email signature", "text"],
    ],
  },
  notifications: {
    title: "Team notifications",
    subtitle: "Where platform alerts go.",
    fields: [
      ["notifyEmail", "Notification email", "string", "Defaults to the company email if empty."],
      ["onNewSignup", "New signup", "bool"],
      ["onPayment", "New payment", "bool"],
      ["onFailedPayment", "Failed payment", "bool"],
      ["onEnquiry", "New website enquiry", "bool", "The contact form already emails the company inbox — enable if the notification email is different."],
      ["onWebhookFailure", "Webhook failure", "bool"],
      ["onServerError", "Server error", "bool"],
    ],
  },
  activity: {
    title: "Activity tracking",
    subtitle: "When a restaurant counts as inactive or at risk.",
    fields: [
      ["trackUsage", "Track feature usage", "bool", "Aggregated per restaurant per day; never slows requests."],
      ["inactiveAfterDays", "Inactive after (days)", "number"],
      ["churnRiskAfterDays", "Churn risk after (days)", "number"],
    ],
  },
  health: {
    title: "Health thresholds",
    subtitle: "When the Health page raises warnings.",
    fields: [
      ["slowResponseMs", "Slow API p95 (ms)", "number"],
      ["dbLatencyWarnMs", "Slow database ping (ms)", "number"],
      ["errorRateWarnPct", "Error rate warning (%)", "number"],
      ["snapshotIntervalMin", "Snapshot interval (minutes)", "number"],
      ["retentionDays", "Keep health history (days)", "number"],
    ],
  },
  security: {
    title: "Security",
    subtitle: "Platform admin sign-in rules.",
    fields: [
      ["sessionHours", "Session length (hours)", "number"],
      ["maxFailedLogins", "Lock after failed sign-ins", "number"],
      ["lockMinutes", "Lock duration (minutes)", "number"],
      ["minPasswordLength", "Minimum password length", "number"],
    ],
  },
};

function Section({ name, def, value, canWrite, onSaved }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(value), [value]);
  const dirty = JSON.stringify(v) !== JSON.stringify(value);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/settings/${name}`, v);
      toast.success(`${def.title} saved`);
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={def.title} subtitle={def.subtitle} action={canWrite && <Button size="sm" disabled={!dirty} loading={busy} onClick={save}>Save</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {def.fields.map(([key, label, type = "string", hint]) => {
          const val = v?.[key];
          if (type === "bool") {
            return (
              <div key={key} className="sm:col-span-2">
                <Toggle checked={Boolean(val)} onChange={(x) => setV((s) => ({ ...s, [key]: x }))} label={label} description={hint} disabled={!canWrite} />
              </div>
            );
          }
          if (type === "text") {
            return (
              <Field key={key} label={label} hint={hint} className="sm:col-span-2">
                <Textarea value={val ?? ""} onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))} disabled={!canWrite} className="min-h-[70px]" />
              </Field>
            );
          }
          return (
            <Field key={key} label={label} hint={hint}>
              <Input
                type={type === "number" ? "number" : "text"}
                value={type === "list" ? (Array.isArray(val) ? val.join(",") : val ?? "") : val ?? ""}
                onChange={(e) => setV((s) => ({ ...s, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                disabled={!canWrite}
              />
            </Field>
          );
        })}
      </div>
    </Card>
  );
}

export default function Settings() {
  const { can } = usePlatformAuth();
  const { data, loading, reload } = useApi(() => api.get("/settings"), []);
  const [tab, setTab] = useState("general");
  const [running, setRunning] = useState(false);
  if (loading && !data) return <Loading />;
  const env = data.environment;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Tune how the platform behaves."
        actions={
          can("settings.write") && (
            <Button
              variant="secondary"
              icon={FiPlay}
              loading={running}
              onClick={async () => {
                setRunning(true);
                try {
                  const r = await api.post("/settings/run-automations");
                  toast.success(`Automations: ${r.result.followUps} follow-ups, ${r.result.reminders} reminders, ${r.result.suspended} suspended`);
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setRunning(false);
                }
              }}
            >
              Run automations now
            </Button>
          )
        }
      />
      <Card title="Environment" subtitle="Read from the server's .env — change these on the server and restart." bodyClass="flex flex-wrap gap-2 p-5">
        <Badge tone={env.emailConfigured ? "green" : "red"}>Email {env.emailConfigured ? `✓ ${env.emailSender}` : "not configured"}</Badge>
        <Badge tone={env.razorpayConfigured ? "green" : "red"}>Razorpay keys {env.razorpayConfigured ? "✓" : "missing"}</Badge>
        <Badge tone={env.webhookSecretConfigured ? "green" : "red"}>Webhook secret {env.webhookSecretConfigured ? "✓" : "missing"}</Badge>
        <Badge tone={env.platformJwtSecret ? "green" : "amber"}>PLATFORM_JWT_SECRET {env.platformJwtSecret ? "✓" : "using derived key"}</Badge>
        <Badge>NODE_ENV {env.nodeEnv}</Badge>
        {env.clientOrigin && <Badge>Client {env.clientOrigin}</Badge>}
      </Card>
      <Tabs value={tab} onChange={setTab} tabs={Object.entries(SECTIONS).map(([k, d]) => ({ value: k, label: d.title }))} />
      <Section name={tab} def={SECTIONS[tab]} value={data.settings[tab]} canWrite={can("settings.write")} onSaved={() => reload({ silent: true })} />
    </div>
  );
}
