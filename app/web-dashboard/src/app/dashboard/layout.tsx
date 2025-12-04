'use client';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-8 text-blue-400">Resume HQ</h2>
        <nav className="flex-1 space-y-2">
          <a href="/dashboard" className="block p-2 rounded hover:bg-gray-800">Overview</a>
          <a href="/dashboard/profile" className="block p-2 rounded hover:bg-gray-800">My Profile</a>
          <a href="/dashboard/tracker" className="block p-2 rounded hover:bg-gray-800">App Tracker</a>
        </nav>
        <button onClick={handleLogout} className="text-left p-2 text-gray-400 hover:text-white">
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}