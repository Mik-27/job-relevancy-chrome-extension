'use client';

import { useState, useEffect, useRef } from 'react';
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
  FaPaperPlane,
  FaUserCircle,
  FaChevronUp,
  FaFileAlt,
} from 'react-icons/fa';
import { FaHeadset } from 'react-icons/fa6';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('User');
  
  // Ref for click-outside detection (optional, simplified here)
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user info for the sidebar footer
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.user_metadata.first_name || user.email || 'User');
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Helper to determine nav item styling
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
          relative flex flex-col bg-card border-r border-border shadow-xl z-20
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Header / Logo Area */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-border/50 flex-shrink-0`}>
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">
              Resume HQ
            </h2>
          )}
          
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

          {/* --- NEW LINK --- */}
          <Link href="/dashboard/resumes" className={linkClass('/dashboard/resumes')} title={isCollapsed ? "My Resumes" : ""}>
            <div className="text-xl"><FaFileAlt /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              My Resumes
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
          <Link href="/dashboard/interview" className={linkClass('/dashboard/interview')} title={isCollapsed ? "Live Interview" : ""}>
            <div className="text-xl"><FaHeadset /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              Live Interview
            </span>
          </Link>

        </nav>

        {/* --- Footer: User Profile Dropdown --- */}
        <div className="p-3 border-t border-border/50 relative" ref={menuRef}>
          
          {/* Dropdown Menu Popup */}
          {isUserMenuOpen && (
            <div className={`
              absolute bottom-[calc(100%+0.5rem)] left-2 right-2
              bg-[#1e1e1e] border border-border rounded-xl shadow-2xl overflow-hidden
              animate-in slide-in-from-bottom-2 duration-200
              ${isCollapsed ? 'w-48 left-2' : ''} /* Adjust width when collapsed so text fits */
            `}>
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-xs text-muted border-b border-border/50 mb-1">
                  Signed in as <br/> <span className="text-foreground font-medium truncate block">{userEmail}</span>
                </div>

                <Link 
                  href="/dashboard/profile" 
                  className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-white hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <FaUser className="text-primary" /> My Profile
                </Link>

                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors text-left"
                >
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* User Button (Toggle) */}
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`
              w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200
              hover:bg-secondary/50 border border-transparent hover:border-border
              ${isUserMenuOpen ? 'bg-secondary/50 border-border' : ''}
              ${isCollapsed ? 'justify-center' : 'justify-between'}
            `}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/30 flex-shrink-0">
                <FaUserCircle size={20} />
              </div>
              
              {!isCollapsed && (
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate max-w-[110px]">
                    {userEmail}
                  </p>
                  <p className="text-xs text-muted truncate">Free Plan</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
               <FaChevronUp size={12} className={`text-muted transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background" onClick={() => setIsUserMenuOpen(false)}>
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}