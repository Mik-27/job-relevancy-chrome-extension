'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  FaChartPie, 
  FaUser, 
  FaBriefcase, 
  FaSignOutAlt, 
  FaChevronLeft, 
  FaChevronRight,
  FaPaperPlane
} from 'react-icons/fa';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Helper to determine nav item styling based on state
  const linkClass = (path: string) => 
    `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 mb-1 group relative ${
      pathname === path 
        ? 'bg-primary text-white shadow-md' 
        : 'text-muted hover:bg-secondary hover:text-white'
    } ${
      isCollapsed ? 'justify-center' : 'justify-start'
    }`;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* --- Sidebar --- */}
      <aside 
        className={`
          relative flex flex-col bg-card border-r border-border shadow-xl z-10
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Header / Logo Area */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-border/50`}>
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">
              Resume HQ
            </h2>
          )}
          
          {/* Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-1.5 rounded-md bg-secondary/50 text-muted hover:text-white hover:bg-primary/80 transition-colors
              ${isCollapsed ? '' : ''}
            `}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          
          <Link href="/dashboard" className={linkClass('/dashboard')} title={isCollapsed ? "Overview" : ""}>
            <div className="text-xl"><FaChartPie /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              Overview
            </span>
          </Link>

          <Link href="/dashboard/profile" className={linkClass('/dashboard/profile')} title={isCollapsed ? "My Profile" : ""}>
            <div className="text-xl"><FaUser /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              My Profile
            </span>
          </Link>

          <Link href="/dashboard/tracker" className={linkClass('/dashboard/tracker')} title={isCollapsed ? "App Tracker" : ""}>
            <div className="text-xl"><FaBriefcase /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              App Tracker
            </span>
          </Link>

          <Link href="/dashboard/outreach" className={linkClass('/dashboard/outreach')} title={isCollapsed ? "Cold Outreach" : ""}>
            <div className="text-xl"><FaPaperPlane /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              Cold Outreach
            </span>
          </Link>

        </nav>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-border/50">
          <button 
            onClick={handleLogout} 
            className={`
              w-full flex items-center gap-3 p-2 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all duration-200
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={isCollapsed ? "Sign Out" : ""}
          >
            <div className="text-xl"><FaSignOutAlt /></div>
            {!isCollapsed && <span className="whitespace-nowrap font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      {/* Because the sidebar is part of the flex container, this 'flex-1' div will automatically resize */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background">
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}