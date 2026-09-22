// src/settings/SaveToast.jsx
//
// Small fixed toast for the save result — same look as the rest of the app.
export default function SaveToast({ message }) {
  if (!message) return null;
  const ok = message.type === "success";
  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
        ok
          ? "border-[#C9E7CF] bg-[#EAF6EC] text-[#2F7D3A] dark:border-[#43B75A]/30 dark:bg-[#1D2A1F] dark:text-[#43B75A]"
          : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-[#2A1B1B] dark:text-red-400"
      }`}
    >
      {message.text}
    </div>
  );
}