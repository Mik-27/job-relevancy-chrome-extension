'use client';

import { useState, useEffect } from 'react';
import { getOutreachHistory, markOutreachAsSent } from '@/lib/api';
import { OutreachRecord } from '@/types';
import { FaSearch, FaExternalLinkAlt, FaEnvelopeOpenText, FaCheck } from 'react-icons/fa';

export default function OutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getOutreachHistory()
      .then(setRecords)
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false));
  }, []);

  // Status Badge Helper
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
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

  // Simple Search Filter
  const filteredRecords = records.filter(r => 
    r.prospect_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- NEW: Helper for Date/Time formatting ---
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // --- NEW: Helper to generate Gmail URL ---
  const getGmailDraftUrl = (record: OutreachRecord): string | null => {
    if (!record.draft_metadata) return null;

    // Handle case where metadata might be wrapped in an array (based on your input)
    // or just an object.
    let data: OutreachRecord['draft_metadata'] = record.draft_metadata;
    if (typeof data === 'string') {
    try {
        data = JSON.parse(data);
    } catch (e) {
        console.error('Failed to parse draft_metadata:', e);
        return null;
    }
    }

    // Extract message ID
    const messageId = data?.message?.id;
    if (messageId) {
      // Construct the specific link to open this draft
      return `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`;
    }
    return null;
  };

  // --- NEW: Handler for marking as sent ---
  const handleMarkSent = async (id: string) => {
    // Optimistic update or simple reload? Let's do a quick local state update
    try {
      await markOutreachAsSent(id);
      
      // Update local state to reflect change immediately
      setRecords(prevRecords => prevRecords.map(r => 
        r.id === id ? { ...r, status: 'sent', sent_at: new Date().toISOString() } : r
      ));
    } catch (err) {
      console.error("Failed to mark as sent", err);
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="p-8 text-muted animate-pulse">Loading outreach history...</div>;
  if (error) return <div className="p-8 text-error">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cold Outreach</h1>
          <p className="text-muted mt-1">Track your AI-generated email drafts.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search name or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
          />
          <FaSearch className="absolute left-3 top-3 text-muted text-xs" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="p-4 font-semibold text-muted">Prospect</th>
                <th className="p-4 font-semibold text-muted">Company</th>
                <th className="p-4 font-semibold text-muted">Status</th>
                <th className="p-4 font-semibold text-muted">Date Drafted</th>
                <th className="p-4 font-semibold text-muted">Date Sent</th>
                <th className="p-4 font-semibold text-muted text-end pr-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted italic">
                    No records found. Start a campaign from the extension!
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (

                    <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{record.prospect_name}</div>
                      <div className="text-xs text-muted">{record.prospect_email}</div>
                    </td>
                    <td className="p-4 text-foreground">
                      {record.company_name || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="p-4 text-muted">
                      {record.sent_at ? formatDateTime(record.sent_at) : ''}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {/* --- Mark as Sent Button --- */}
                      {/* Only show if status is 'drafted' or 'complete', not if already 'sent' */}
                      {record.status !== 'sent' && (record.status === 'drafted' || record.status === 'complete') && (
                        <button
                          onClick={() => handleMarkSent(record.id)}
                          className="inline-flex items-center justify-center p-2 text-success hover:text-white hover:bg-success/20 rounded transition"
                          title="Mark as Sent"
                        >
                          <FaCheck />
                        </button>
                      )}
                      
                      {getGmailDraftUrl(record) && (
                        <a 
                          href={getGmailDraftUrl(record)!} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition"
                          title="Open Draft in Gmail"
                        >
                          <FaEnvelopeOpenText />
                        </a>
                      )}

                      {/* Existing Job Link Button */}
                      {record.job_link && (
                        <a 
                          href={record.job_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-2 text-muted hover:text-primary hover:bg-secondary rounded transition"
                          title="View Job Posting"
                        >
                          <FaExternalLinkAlt />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}