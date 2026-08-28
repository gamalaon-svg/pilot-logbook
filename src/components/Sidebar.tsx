export type ViewName = "logbook" | "totals" | "backup";

interface SidebarProps {
  activeView: ViewName;
  onSelectView: (view: ViewName) => void;
}

const NAV_ITEMS: { view: ViewName; label: string }[] = [
  { view: "logbook", label: "Logbook" },
  { view: "totals", label: "Totals" },
  { view: "backup", label: "Backup" }
];

export function Sidebar({ activeView, onSelectView }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">Pilot Logbook</div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          className={`sidebar-nav-item${activeView === item.view ? " active" : ""}`}
          onClick={() => onSelectView(item.view)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
