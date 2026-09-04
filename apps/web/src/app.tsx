import { useState } from "react";
import { ApartmentEditor } from "./modules/apartment/apartment-editor";
import { ApartmentProjectList } from "./modules/apartment/apartment-project-list";
import { CreateApartmentProjectForm } from "./modules/apartment/create-apartment-project-form";
import { HomeMark } from "./modules/apartment/icons";

export default function App() {
  const [projectId, setProjectId] = useState<string>();

  if (projectId !== undefined) {
    return <ApartmentEditor projectId={projectId} onClose={() => setProjectId(undefined)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-hairline bg-surface px-10 py-5">
        <HomeMark className="shrink-0 text-accent" />
        <span className="font-display text-base font-bold tracking-[-0.02em] text-ink">
          home-bird
        </span>
        <span className="ml-auto text-meta text-muted">
          Plausible concepts, not measured designs
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center gap-24 px-10 py-10">
        <section className="flex w-[452px] shrink-0 flex-col gap-7">
          <div className="flex flex-col gap-5">
            <span className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
              Start a project
            </span>
            <h1 className="font-display text-[52px] leading-[1.05] font-bold tracking-[-0.035em] text-ink">
              Every apartment starts with its plan.
            </h1>
            <p className="max-w-[400px] text-[17px] leading-[1.6] text-muted">
              Upload the floor plan once. Map the rooms, attach the references you have been
              collecting, and see the whole place as one picture.
            </p>
          </div>
          <ApartmentProjectList onOpen={setProjectId} />
        </section>

        <CreateApartmentProjectForm onCreated={setProjectId} />
      </main>
    </div>
  );
}
