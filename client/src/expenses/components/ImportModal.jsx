// client/src/expenses/components/ImportModal.jsx
import { useState } from "react";
import expenseService from "../services/expenseService";
import { FiX, FiUpload, FiDownload, FiCheckCircle, FiAlertTriangle, FiFileText } from "react-icons/fi";
import { ui } from "../expenseTheme";

const ImportModal = ({ open, onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState(null); // { validRows, errorRows }
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setDoneCount(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError("");

    try {
      setChecking(true);
      const data = await expenseService.validateImportFile(selected);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setError("");
    try {
      setDownloadingTemplate(true);
      await expenseService.downloadImportTemplate();
    } catch (err) {
      setError(err.message || "Could not download the template. Please try again.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.validRows?.length) return;
    try {
      setImporting(true);
      const res = await expenseService.confirmImportRows(result.validRows);
      setDoneCount(res.created?.length || 0);
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-3xl max-h-[90vh]`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-bold ${ui.heading}`}>Import Expenses from Excel</h2>
          <button onClick={handleClose} className={`${ui.faint} hover:text-[#1F2937] dark:hover:text-white`}>
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {doneCount !== null ? (
            <div className="text-center py-10">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 flex items-center justify-center">
                <FiCheckCircle className="text-[#3FA34D] dark:text-[#43B75A] text-3xl" />
              </div>
              <h3 className={`mt-4 text-xl font-bold ${ui.heading}`}>
                {doneCount} expense{doneCount === 1 ? "" : "s"} imported
              </h3>
              <p className={`mt-1 text-sm ${ui.muted}`}>They're now in your expenses list.</p>
              <button onClick={handleClose} className={`${ui.btnPrimary} mt-6`}>
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: template + upload */}
              <div className={`rounded-2xl border border-dashed border-[#E7EAE1] dark:border-[#262B24] p-5`}>
                <p className={`text-sm mb-3 ${ui.muted}`}>
                  New here? Start with the template — required columns are shaded <strong>red</strong>,
                  optional ones are <strong>green</strong>, and Category/Payment Method/Payment Status have
                  dropdown lists so you can't mistype them. Full details are on the{" "}
                  <strong>Instructions</strong> sheet.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:opacity-80 disabled:opacity-50"
                >
                  <FiDownload /> {downloadingTemplate ? "Downloading…" : "Download template"}
                </button>

                <div className="mt-4">
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] py-8 hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 hover:bg-[#3FA34D]/5 dark:hover:bg-[#43B75A]/10 transition-colors">
                    <input type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                    {file ? (
                      <>
                        <FiFileText className="text-2xl text-[#3FA34D] dark:text-[#43B75A]" />
                        <span className={`text-sm font-medium ${ui.heading}`}>{file.name}</span>
                      </>
                    ) : (
                      <>
                        <FiUpload className={`text-2xl ${ui.faint}`} />
                        <span className={`text-sm ${ui.muted}`}>Tap to choose your filled-in .xlsx file</span>
                        <span className={`text-xs ${ui.faint}`}>We'll show you exactly what will be imported before anything is saved</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {checking && <p className={`text-center text-sm ${ui.faint}`}>Checking your file…</p>}

              {error && <div className="rounded-xl bg-[#EF5350]/10 text-[#EF5350] text-sm px-4 py-3">{error}</div>}

              {/* Step 2: preview */}
              {result && (
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-base font-bold ${ui.heading}`}>
                      We found {result.validRows.length + result.errorRows.length} row
                      {result.validRows.length + result.errorRows.length === 1 ? "" : "s"} in your file
                    </h3>
                    <p className={`text-sm mt-1 ${ui.muted}`}>
                      {result.errorRows.length === 0
                        ? "Everything looks good — review the preview below, then click Import."
                        : `${result.validRows.length} will be imported as-is. ${result.errorRows.length} need fixing first — only the good rows are imported, the rest are skipped until you fix and re-upload.`}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 border border-[#3FA34D]/20 dark:border-[#43B75A]/25 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-[#3FA34D] dark:text-[#43B75A]">{result.validRows.length}</p>
                      <p className="text-xs text-[#3FA34D] dark:text-[#43B75A]">Ready to import</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-[#EF5350]/10 border border-[#EF5350]/20 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-[#EF5350]">{result.errorRows.length}</p>
                      <p className="text-xs text-[#EF5350]">Rows with problems</p>
                    </div>
                  </div>

                  {result.errorRows.length > 0 && (
                    <div className="rounded-xl border border-[#EF5350]/20 overflow-hidden">
                      <div className="bg-[#EF5350]/10 px-4 py-2 flex items-center gap-2 text-sm font-semibold text-[#EF5350]">
                        <FiAlertTriangle /> Fix these rows in your file and re-upload
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-[#EF5350]/10">
                        {result.errorRows.map((row) => (
                          <div key={row.rowNumber} className="px-4 py-2.5 text-sm">
                            <span className={`font-semibold ${ui.heading}`}>Row {row.rowNumber}</span>
                            <ul className="list-disc list-inside text-[#EF5350] mt-0.5">
                              {row.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.validRows.length > 0 && (
                    <div className={`rounded-xl border border-[#E7EAE1] dark:border-[#262B24] overflow-hidden`}>
                      <div className={`bg-[#F3F5EE] dark:bg-[#1E241C] px-4 py-2 text-sm font-semibold ${ui.heading}`}>
                        Preview — {result.validRows.length} row{result.validRows.length === 1 ? "" : "s"} will be created
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`text-left text-xs uppercase ${ui.faint}`}>
                              <th className="px-4 py-2">Title</th>
                              <th className="px-4 py-2">Category</th>
                              <th className="px-4 py-2">Store</th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.validRows.map((row) => (
                              <tr key={row.rowNumber} className="border-t border-[#E7EAE1] dark:border-[#262B24]">
                                <td className={`px-4 py-2 ${ui.heading}`}>{row.title}</td>
                                <td className={`px-4 py-2 ${ui.muted}`}>{row.categoryName}</td>
                                <td className={`px-4 py-2 ${ui.muted}`}>{row.store}</td>
                                <td className={`px-4 py-2 text-right ${ui.heading}`}>
                                  ₹{Number(row.totalPaid).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {doneCount === null && (
          <div className={ui.modalFooter}>
            <button onClick={handleClose} className={ui.btnCancel}>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!result?.validRows?.length || importing}
              className={ui.btnPrimary}
            >
              {importing
                ? "Importing..."
                : `Import ${result?.validRows?.length || 0} Expense${result?.validRows?.length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
