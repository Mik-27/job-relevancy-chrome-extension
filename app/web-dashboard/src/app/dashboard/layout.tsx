'use client';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link'; // Use Next.js Link for better performance

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname(); // To check active link

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Helper for active link styling
  const linkClass = (path: string) => 
    `block p-2 rounded-lg transition-colors ${
      pathname === path 
        ? 'bg-primary text-white font-medium' 
        : 'text-muted hover:bg-secondary hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e1e1e] border-r border-border p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-8 text-white tracking-tight">Resume Analyzer HQ</h2>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            Overview
          </Link>
          <Link href="/dashboard/profile" className={linkClass('/dashboard/profile')}>
            My Profile
          </Link>
          {/* <Link href="/dashboard/tracker" className={linkClass('/dashboard/tracker')}>
            App Tracker
          </Link> */}
          <Link href="/dashboard/outreach" className={linkClass('/dashboard/outreach')}>
            Cold Outreach
          </Link>
        </nav>

        <div className="pt-4 border-t border-border">
          <button 
            onClick={handleLogout} 
            className="w-full text-left p-2 text-muted hover:text-error hover:bg-[#3a1d1d] rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        {children}
      </main>
    </div>
  );
}