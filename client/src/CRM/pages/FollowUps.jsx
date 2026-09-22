// src/crm/pages/FollowUps.jsx
//
// Everything that needs a person to act on it, across all customers:
// follow-up calls due, and feedback/complaints still open.
import { useCallback, useEffect, useState } from "react";
import { listReminders, updateReminder, listFeedback, updateFeedback } from "../crmApi";
import CrmTabs from "../components/CrmTabs";
import { ReminderRow, FeedbackCard } from "./CustomerProfile";
import { CrmPage, ErrorNote, EmptyState, chipClass } from "../components/crmUI";

const REMINDER_FILTERS = [
  ["all", "All"],
  ["open", "Due now"],
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["done", "Done"],
];

const FEEDBACK_FILTERS = [
  ["active", "Open"],
  ["complaints", "Open complaints"],
  ["RESOLVED", "Resolved"],
  ["all", "All"],
];

export default function FollowUps() {
  const [reminderFilter, setReminderFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("active");
  const [reminders, setReminders] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");

  const loadReminders = useCallback(async () => {
    try {
      // "all" sends no filter: every reminder, pending ones first (soonest
      // due at the top), then done and cancelled.
      const params =
        reminderFilter === "all" ? {} : reminderFilter === "done" ? { status: "DONE" } : { due: reminderFilter };
      setReminders(await listReminders(params));
    } catch (err) {
      setError(err.message);
    }
  }, [reminderFilter]);

  const loadFeedback = useCallback(async () => {
    try {
      let rows;
      if (feedbackFilter === "active" || feedbackFilter === "complaints") {
        const type = feedbackFilter === "complaints" ? "COMPLAINT" : undefined;
        const [open, progress] = await Promise.all([
          listFeedback({ status: "OPEN", type }),
          listFeedback({ status: "IN_PROGRESS", type }),
        ]);
        rows = [...open.data, ...progress.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else {
        rows = (await listFeedback(feedbackFilter === "all" ? {} : { status: feedbackFilter })).data;
      }
      setFeedback(rows);
    } catch (err) {
      setError(err.message);
    }
  }, [feedbackFilter]);

  useEffect(() => { loadReminders(); }, [loadReminders]);
  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  return (
    <CrmPage title="Follow-ups & feedback" subtitle="Calls to make and complaints to close, across all customers." tabs={<CrmTabs />}>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-2 text-base font-bold text-[#1F2937] dark:text-white">Follow-up reminders</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {REMINDER_FILTERS.map(([k, l]) => <button key={k} onClick={() => setReminderFilter(k)} className={chipClass(reminderFilter === k)}>{l}</button>)}
          </div>
          {reminders.length === 0 ? <EmptyState>Nothing here. Schedule follow-ups from a customer's profile.</EmptyState> : (
            <ul className="space-y-2">
              {reminders.map((r) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  showCustomer
                  onUpdate={async (row, payload) => {
                    await updateReminder(row.id, payload).catch((e) => setError(e.message));
                    loadReminders();
                  }}
                />
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-2 text-base font-bold text-[#1F2937] dark:text-white">Feedback & complaints</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {FEEDBACK_FILTERS.map(([k, l]) => <button key={k} onClick={() => setFeedbackFilter(k)} className={chipClass(feedbackFilter === k)}>{l}</button>)}
          </div>
          {feedback.length === 0 ? <EmptyState>No feedback in this view.</EmptyState> : (
            <ul className="space-y-2">
              {feedback.map((f) => (
                <FeedbackCard
                  key={f.id}
                  f={f}
                  showCustomer
                  onUpdate={async (row, payload) => {
                    await updateFeedback(row.id, payload).catch((e) => setError(e.message));
                    loadFeedback();
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </CrmPage>
  );
}