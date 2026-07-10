export default function NursingShell({ sidebar, topbar, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      {sidebar}
      <div className="lg:pl-72">
        {topbar}
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
