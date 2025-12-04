export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric Cards */}
        <div className="p-6 bg-card rounded-lg border border-border">
          <h3 className="text-gray-400">Applications</h3>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="p-6 bg-card rounded-lg border border-border">
          <h3 className="text-gray-400">Resumes Tailored</h3>
          <p className="text-3xl font-bold">24</p>
        </div>
      </div>
    </div>
  );
}