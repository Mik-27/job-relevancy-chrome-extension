'use client';

import { useState, useEffect, ReactNode } from 'react';
import { getOutreachHistory } from '@/lib/api';
import { OutreachRecord } from '@/types';
import { FaPaperPlane, FaFileAlt, FaBriefcase, FaArrowRight, FaPlus, FaSearch } from 'react-icons/fa';
import Link from 'next/link';

export default function DashboardPage() {
  const [outreachCount, setOutreachCount] = useState(0);
  const [recentOutreach, setRecentOutreach] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data for the outreach stats
    getOutreachHistory(1, 5)
      .then((data) => {
        setOutreachCount(data.total);
        setRecentOutreach(data.items); // Get top 5 recent
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Helper for status colors (consistent with Outreach Page)
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/40';
      case 'drafted':
      case 'complete':
        return 'bg-success/10 text-success border-success/20';
      case 'queued':
      case 'processing':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'failed':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-secondary text-muted border-border';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted mt-1">Overview of your job search activity.</p>
        </div>
        <div className="flex gap-3">
           <Link href="/dashboard/tracker" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 text-foreground px-4 py-2 rounded-lg transition-all">
              <FaBriefcase className="text-muted" />
              <span>View Jobs</span>
           </Link>
        </div>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Applications (Placeholder data for now) */}
        <MetricCard 
          title="Total Applications"
          value="12" 
          subtext="+2 this week"
          icon={<FaBriefcase />}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />

        {/* Card 2: Resumes Tailored (Placeholder data for now) */}
        <MetricCard 
          title="Resumes Tailored"
          value="24" 
          subtext="Last tailored 2 hours ago"
          icon={<FaFileAlt />}
          color="text-purple-400"
          bg="bg-purple-400/10"
        />

        {/* Card 3: Cold Outreach (Real Data) */}
        <MetricCard 
          title="Cold Emails Drafted"
          value={loading ? "..." : outreachCount.toString()}
          subtext="Via AI Agent"
          icon={<FaPaperPlane />}
          color="text-green-400"
          bg="bg-green-400/10"
        />
      </div>

      {/* --- Main Content Split --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Recent Activity Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Recent Outreach</h3>
            <Link href="/dashboard/outreach" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <FaArrowRight size={12} />
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
               <div className="p-8 text-center text-muted">Loading activity...</div>
            ) : recentOutreach.length === 0 ? (
               <div className="p-8 text-center text-muted">No recent activity. Start the extension!</div>
            ) : (
              <div className="divide-y divide-border">
                {recentOutreach.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-[#333] transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center text-muted">
                        {record.prospect_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{record.prospect_name}</p>
                        <p className="text-sm text-muted">{record.company_name || 'Unknown Company'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`px-2 pt-0.5 pb-1 rounded-xl text-xs border ${getStatusColor(record.status)}`}>
                          {record.status}
                       </span>
                       <span className="text-xs text-muted hidden sm:block">
                         {new Date(record.created_at).toLocaleDateString()}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions / Tips */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
          
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
             <ActionRow 
               icon={<FaPlus />} 
               title="Update Master CV" 
               desc="Keep your base profile up to date."
               href="/dashboard/profile"
             />
             <ActionRow 
               icon={<FaSearch />} 
               title="Search History" 
               desc="Review past cold emails."
               href="/dashboard/outreach"
             />
          </div>

          {/* Mini Promo / Status */}
          <div className="bg-gradient-to-br from-primary/20 to-card border border-primary/30 rounded-xl p-6">
            <h4 className="font-bold text-foreground mb-2">Extension Active</h4>
            <p className="text-sm text-muted mb-4">
              Your Chrome extension is connected and ready to scrape jobs.
            </p>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden">
              <div className="h-full bg-success w-full animate-pulse"></div>
            </div>
            <p className="text-xs text-success mt-2 flex items-center gap-1">
              ● System Operational
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Internal Components for Cleanliness ---

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: ReactNode;
  color: string;
  bg: string;
}

const MetricCard = ({ title, value, subtext, icon, color, bg }: MetricCardProps) => (
  <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted">{title}</p>
        <h3 className="text-3xl font-bold text-foreground mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-xs text-muted mt-4">{subtext}</p>
  </div>
);

interface ActionRowProps {
  icon: ReactNode;
  title: string;
  desc: string;
  href: string;
}

const ActionRow = ({ icon, title, desc, href }: ActionRowProps) => (
  <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#333] transition-colors group">
    <div className="p-2 rounded-md bg-background border border-border text-muted group-hover:text-primary group-hover:border-primary transition-colors">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
    </div>
    <FaArrowRight className="ml-auto text-muted opacity-0 group-hover:opacity-100 transition-opacity text-xs" />
  </Link>
);