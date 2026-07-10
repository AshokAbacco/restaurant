import React from "react";
import {
  FiFileText,
  FiCheckCircle,
  FiRefreshCw,
  FiAlertTriangle,
} from "react-icons/fi";
import { ui } from "../menuTheme";

const Card = ({
  title,
  value,
  icon: Icon,
  bg,
  iconColor,
  textColor,
}) => (
  <div
    className={`${ui.card} p-5 flex items-center justify-between`}
  >
    <div>
      <p className={`text-sm ${ui.faint}`}>
        {title}
      </p>

      <h3
        className={`text-3xl font-bold mt-2 ${textColor}`}
      >
        {value}
      </h3>
    </div>

    <div
      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg}`}
    >
      <Icon
        className={iconColor}
        size={26}
      />
    </div>
  </div>
);

const BulkImportSummary = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

      <Card
        title="Total Rows"
        value={summary.total}
        icon={FiFileText}
        bg="bg-blue-100 dark:bg-blue-900/20"
        iconColor="text-blue-600 dark:text-blue-400"
        textColor="text-blue-600 dark:text-blue-400"
      />

      <Card
        title="Created"
        value={summary.created}
        icon={FiCheckCircle}
        bg="bg-green-100 dark:bg-green-900/20"
        iconColor="text-green-600 dark:text-green-400"
        textColor="text-green-600 dark:text-green-400"
      />

      <Card
        title="Updated"
        value={summary.updated}
        icon={FiRefreshCw}
        bg="bg-amber-100 dark:bg-amber-900/20"
        iconColor="text-amber-600 dark:text-amber-400"
        textColor="text-amber-600 dark:text-amber-400"
      />

      <Card
        title="Skipped"
        value={summary.skipped}
        icon={FiAlertTriangle}
        bg="bg-red-100 dark:bg-red-900/20"
        iconColor="text-red-600 dark:text-red-400"
        textColor="text-red-600 dark:text-red-400"
      />

    </div>
  );
};

export default BulkImportSummary;