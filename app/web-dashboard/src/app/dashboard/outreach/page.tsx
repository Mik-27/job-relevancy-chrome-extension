'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOutreachHistory, markOutreachAsSent, triggerColdOutreach } from '@/lib/api';
import { OutreachRecord } from '@/types';
import { FaSearch, FaExternalLinkAlt, FaEnvelopeOpenText, FaCheck, FaChevronRight, FaChevronLeft, FaRedo } from 'react-icons/fa';

export default function OutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- Pagination & Search State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState(''); // Immediate value for input
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Value for API call

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500); // Wait 500ms after typing stops

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch page 1 if searching, otherwise current page
      const data = await getOutreachHistory(currentPage, 15, debouncedSearch);
      setRecords(data.items);
      setTotalPages(data.pages);
      setTotalItems(data.total);
    } catch (err) {
      setError('Failed to load history.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  // Trigger the fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Status Badge Helper
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/40';
      case 'drafted':
      case 'complete':
        return 'bg-success/10 text-success border-success/20';
      case 'queued':
      case 'processing':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'error':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-secondary text-muted border-border';
    }
  };

  // --- Helper for Date/Time formatting ---
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // --- Helper to generate Gmail URL ---
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

  // --- Handler for marking as sent ---
  const handleMarkSent = async (id: string) => {
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

  // --- Handler for retrying failed outreach ---
  const handleOutreachWorkflowRetry = async (id: string, prospect_name: string, prospect_email: string, company_name: string | undefined, job_link: string | undefined) => {
    try {
      // Call your retry API here
      await triggerColdOutreach({ contacts: [{ id, name: prospect_name, email: prospect_email, company: company_name, job_link }] });
    } catch (err) {
      console.error("Failed to retry outreach", err);
      alert("Failed to retry outreach");
    }
  };

  if (loading) return <div className="p-8 text-muted animate-pulse">Loading outreach history...</div>;
  if (error) return <div className="p-8 text-error">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cold Outreach</h1>
          <p className="text-muted mt-1">
            Showing {records.length} of {totalItems} records
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <input 
            type="text" 
            placeholder="Search name or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          <FaSearch className="absolute left-3 top-3 text-muted text-xs" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="flex-1 overflow-y-auto">
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
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-muted">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted italic">No records found.</td></tr>
              ) : (
                records.map((record) => (

                    <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{record.prospect_name}</div>
                      <div className="text-xs text-muted">{record.prospect_email}</div>
                    </td>
                    <td className="p-4 text-foreground">
                      {record.company_name || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 pt-0.25 pb-0.5 rounded-full text-xs font-medium border ${getStatusStyle(record.status)}`}>
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

                      {/* FIXME: Button disabled on click */}
                      {record.status === 'error' && (
                        <button
                          onClick={() => handleOutreachWorkflowRetry(record.id, record.prospect_name, record.prospect_email, record?.company_name, record.job_link)}
                          className='inline-flex items-center justify-center p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded transition'
                          title='Retry'
                        >
                          <FaRedo />
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
         {/* --- NEW: Pagination Footer --- */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between flex-shrink-0">
            <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <FaChevronLeft size={12} /> Previous
            </button>

            <span className="text-sm text-muted">
                Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
            </span>

            <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Next <FaChevronRight size={12} />
            </button>
        </div>
      </div>
    </div>
  );
}