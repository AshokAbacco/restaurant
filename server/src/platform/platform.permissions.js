// ==============================================
// server/src/platform/platform.permissions.js
// Role -> permission map for platform staff. A PlatformAdmin's effective
// permissions are their role's defaults with their personal `permissions`
// JSON overrides applied on top ({ "plans.write": false }).
// ==============================================

export const PERMISSIONS = [
  { key: "dashboard.read", label: "View dashboard", group: "Overview" },
  { key: "restaurants.read", label: "View restaurants", group: "Restaurants" },
  { key: "restaurants.write", label: "Edit / suspend restaurants", group: "Restaurants" },
  { key: "renewals.read", label: "View renewals", group: "Renewals" },
  { key: "renewals.write", label: "Renew / extend / change plans", group: "Renewals" },
  { key: "messages.read", label: "Read conversations", group: "Messages" },
  { key: "messages.write", label: "Reply to restaurants", group: "Messages" },
  { key: "followups.read", label: "View follow-ups", group: "Follow-ups" },
  { key: "followups.write", label: "Create / update follow-ups", group: "Follow-ups" },
  { key: "plans.read", label: "View plans", group: "Money & records" },
  { key: "plans.write", label: "Create / edit / deactivate plans", group: "Money & records" },
  { key: "payments.read", label: "View payments", group: "Money & records" },
  { key: "payments.write", label: "Record offline payments", group: "Money & records" },
  { key: "activity.read", label: "View activity logs", group: "Money & records" },
  { key: "webhooks.read", label: "View webhooks", group: "Money & records" },
  { key: "enquiries.read", label: "View website enquiries", group: "Money & records" },
  { key: "enquiries.write", label: "Handle website enquiries", group: "Money & records" },
  { key: "team.read", label: "View platform team", group: "Admin" },
  { key: "team.write", label: "Manage platform team", group: "Admin" },
  { key: "settings.read", label: "View settings", group: "Admin" },
  { key: "settings.write", label: "Change settings", group: "Admin" },
  { key: "health.read", label: "View system health", group: "Admin" },
  { key: "health.write", label: "Resolve errors", group: "Admin" },
  { key: "reports.read", label: "View & export reports", group: "Admin" },
];

const ALL = PERMISSIONS.map((p) => p.key);
const READS = ALL.filter((k) => k.endsWith(".read"));

export const ROLE_DEFAULTS = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((k) => k !== "team.write"),
  SUPPORT: [
    "dashboard.read",
    "restaurants.read",
    "renewals.read",
    "messages.read",
    "messages.write",
    "followups.read",
    "followups.write",
    "plans.read",
    "activity.read",
    "enquiries.read",
    "enquiries.write",
    "health.read",
  ],
  FINANCE: [
    "dashboard.read",
    "restaurants.read",
    "renewals.read",
    "renewals.write",
    "messages.read",
    "messages.write",
    "followups.read",
    "followups.write",
    "plans.read",
    "plans.write",
    "payments.read",
    "payments.write",
    "activity.read",
    "webhooks.read",
    "enquiries.read",
    "reports.read",
  ],
  VIEWER: READS.filter((k) => k !== "team.read" && k !== "settings.read"),
};

export const ROLES = [
  { key: "SUPER_ADMIN", label: "Super admin", description: "Full control, including team and settings." },
  { key: "ADMIN", label: "Admin", description: "Everything except managing the platform team." },
  { key: "SUPPORT", label: "Support", description: "Restaurants, messages, follow-ups and enquiries." },
  { key: "FINANCE", label: "Finance", description: "Plans, payments, renewals and reports." },
  { key: "VIEWER", label: "Viewer", description: "Read-only access." },
];

export const effectivePermissions = (admin) => {
  const base = new Set(ROLE_DEFAULTS[admin?.role] || []);
  if (admin?.role === "SUPER_ADMIN") return [...base];
  const overrides = admin?.permissions && typeof admin.permissions === "object" ? admin.permissions : {};
  for (const [key, allowed] of Object.entries(overrides)) {
    if (!ALL.includes(key)) continue;
    if (allowed) base.add(key);
    else base.delete(key);
  }
  return [...base];
};
