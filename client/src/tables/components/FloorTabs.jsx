// src/pos/components/FloorTabs.jsx
import { Pencil, Trash2 } from "lucide-react";

// Takes the floor list and the currently selected id, renders one tab per
// floor. New floors created elsewhere show up here automatically because
// `floors` is just the parent's state. Edit/delete icons only show on the
// active tab so the row of tabs stays uncluttered.
export default function FloorTabs({
  floors,
  selectedFloorId,
  onSelect,
  onEditFloor,
  onDeleteFloor,
}) {
  if (floors.length === 0) return null;

  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-[#E7EAE1] dark:border-[#262B24]"
      role="tablist"
    >
      {floors.map((floor) => {
        const active = floor.id === selectedFloorId;
        return (
          <div key={floor.id} className="flex items-center">
            <button
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(floor.id)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-b-2 border-[#3FA34D] text-[#3FA34D] dark:border-[#43B75A] dark:text-[#43B75A]"
                  : "border-b-2 border-transparent text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#6B7280] dark:hover:text-[#9CA8A0]"
              }`}
            >
              {floor.name}
            </button>
            {active && (onEditFloor || onDeleteFloor) && (
              <span className="mr-2 flex items-center gap-0.5">
                {onEditFloor && (
                  <button
                    onClick={() => onEditFloor(floor)}
                    title="Edit floor"
                    className="rounded-md p-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDeleteFloor && (
                  <button
                    onClick={() => onDeleteFloor(floor)}
                    title="Delete floor"
                    className="rounded-md p-1 text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}