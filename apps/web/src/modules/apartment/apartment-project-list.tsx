import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { ChevronRight, PlanIcon } from "./icons";

const relativeDay = (iso: string | Date) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export function ApartmentProjectList({ onOpen }: { onOpen: (projectId: string) => void }) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.apartmentProject.list.queryOptions());

  if (projects.isPending || projects.isError || projects.data.length === 0) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-1 pt-5">
      <div className="flex items-baseline gap-3 pb-2.5">
        <h2 className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
          Your projects
        </h2>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <ul className="flex flex-col">
        {projects.data.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => onOpen(project.id)}
              className="flex w-full items-center gap-3.5 rounded-md py-3 pr-3 pl-2.5 text-left transition-all duration-[120ms] ease-settle hover:bg-surface hover:shadow-[0_1px_3px_-1px_rgb(15_26_21/0.10)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] border border-hairline bg-surface text-muted">
                <PlanIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-medium text-ink">{project.name}</span>
                <span className="truncate text-meta text-muted">
                  Floor plan only · {project.floorPlan.fileName}
                </span>
              </span>
              <span className="w-16 shrink-0 text-right text-meta text-muted">
                {relativeDay(project.createdAt)}
              </span>
              <span className="flex w-4 shrink-0 justify-end text-muted">
                <ChevronRight />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
