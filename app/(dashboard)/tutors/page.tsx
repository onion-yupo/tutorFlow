import { getTutorsPageData } from "@/lib/queries/tutors";

export default async function TutorsPage() {
  const tutors = await getTutorsPageData();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tutors.map((tutor) => (
        <article key={tutor.id} className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">辅导老师画像</p>
          <h1 className="mt-2 text-2xl font-semibold">{tutor.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{tutor.scope}</p>
          <div className="mt-6 rounded-2xl bg-secondary/80 p-4">
            <p className="text-sm">{tutor.performance}</p>
            <p className="mt-2 text-sm font-medium text-primary">{tutor.status}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
