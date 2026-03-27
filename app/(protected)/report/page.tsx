export default function ReportPage() {
  return (
    <div>
      <div className="space-y-2 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Reports
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          View detailed analytics and business insights
        </p>
      </div>

      <div className="mt-6 sm:mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Reports and analytics coming soon. Connect with your Spring Boot
          backend to view business metrics.
        </p>
      </div>
    </div>
  );
}
