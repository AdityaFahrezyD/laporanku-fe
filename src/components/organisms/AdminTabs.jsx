import { resources } from '../../services/admin'

export default function AdminTabs({ tab, navigate }) {

  return (
    <div
      role="tablist"
      aria-label="Pengelolaan data"
      className="mb-5 flex min-w-0 flex-wrap gap-2 border-b border-primary/10 pb-3"
    >
      {resources.map((r, index) => (
        <button
          key={r.id}
          id={"tab-" + r.id}
          type="button"
          role="tab"
          aria-selected={tab === r.id}
          aria-controls={"panel-" + r.id}
          tabIndex={tab === r.id ? 0 : -1}
          onClick={() => navigate(r.id)}
          onKeyDown={(event) => {
            if (
              !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            )
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? resources.length - 1
                  : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    resources.length) %
                  resources.length;
            navigate(resources[next].id);
            document.getElementById("tab-" + resources[next].id)?.focus();
          }}
          className={
            "whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium " +
            (tab === r.id
              ? "bg-primary text-white"
              : "bg-white text-muted hover:bg-primary/5")
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
