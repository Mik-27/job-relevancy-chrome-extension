'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOutreachHistory, markOutreachAsSent, triggerColdOutreach } from '@/lib/api';
import { OutreachRecord, OutreachContact } from '@/types';
import { FaSearch, FaExternalLinkAlt, FaEnvelopeOpenText, FaCheck, FaChevronRight, FaChevronLeft, FaRedo, FaPlus, FaCloudUploadAlt, FaTimes, FaTrash, FaFileUpload, FaKeyboard } from 'react-icons/fa';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/ui/Skeleton';

type InputMode = 'manual' | 'upload';

export default function OutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [isNewWorkflowModalOpen, setIsNewWorkflowModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- Modal State ---
  const [mode, setMode] = useState<InputMode>('manual');
  const [contacts, setContacts] = useState<OutreachContact[]>([{ name: '', email: '', company: '', job_link: '' }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // --- Pagination & Search State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const toast = useToast();

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

  // --- Modal Handlers ---
  const handleInputChange = (index: number, field: keyof OutreachContact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const addRow = () => {
    setContacts([...contacts, { name: '', email: '', company: '', job_link: '' }]);
  };

  const removeRow = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setModalError('');
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setModalError('');

    try {
      if (mode === 'manual') {
        const validContacts = contacts.filter(c => c.name && c.email && c.company);
        if (validContacts.length === 0) throw new Error("Please add at least one complete contact.");
        
        await triggerColdOutreach({ contacts: validContacts });
        setContacts([{ name: '', email: '', company: '', job_link: '' }]);
      } else {
        if (!selectedFile) throw new Error("Please select a file.");
        
        await triggerColdOutreach({ file: selectedFile });
        setSelectedFile(null);
      }
      setIsNewWorkflowModalOpen(false);
      fetchData(); // Refresh the list
      toast.success("Outreach workflow started successfully.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to start workflow.");
    } finally {
      setIsSending(false);
    }
  };

  const closeModal = () => {
    setIsNewWorkflowModalOpen(false);
    setMode('manual');
    setContacts([{ name: '', email: '', company: '', job_link: '' }]);
    setSelectedFile(null);
    setModalError('');
  };

  if (error) return <div className="p-8 text-error">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div className="flex flex-col w-1/4">
          <h1 className="text-3xl font-bold text-foreground">Cold Outreach</h1>
          <p className="text-muted mt-1">
            {loading ? (
              <Skeleton variant="line" className="h-4 w-52 mt-1" />
            ) : (
              <>Showing {records.length} of {totalItems} records</>
            )}
          </p>
        </div>
        
        

        <div className='flex w-1/4 items-center justify-end'>
            <button 
              className='flex items-center bg-primary text-white px-4 py-2 rounded-lg'
              onClick={() => setIsNewWorkflowModalOpen(true)}
            >
                <FaPlus /> 
                <span className="ml-2">New Outreach workflow</span>
            </button>
        </div>
      </div>

      {/* Search Bar */}
      {loading ? (
        <div className="w-full mb-4 px-2">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <div className="relative w-full mb-4 px-2">
          <input 
            name="search" 
            type="text" 
            placeholder="Search name or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          <FaSearch className="absolute left-3 top-3 text-muted text-xs ml-2" />
        </div>
      )}

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
                <OutreachTableSkeletonRows rowCount={8} />
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted italic">No records found.</td></tr>
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
                {loading ? (
                  <Skeleton variant="line" className="h-4 w-32" />
                ) : (
                  <>Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong></>
                )}
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
    

      {/* --- New Outreach Workflow Modal --- */}
      {isNewWorkflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal}>
          <div 
            className="bg-card border border-border rounded-xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">New Cold Outreach Workflow</h3>
              <button onClick={closeModal} className="text-muted hover:text-white transition">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button 
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition ${
                  mode === 'manual' 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-secondary border-border text-muted hover:text-foreground'
                }`}
                onClick={() => setMode('manual')}
              >
                <FaKeyboard /> Manual Entry
              </button>
              <button 
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition ${
                  mode === 'upload' 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-secondary border-border text-muted hover:text-foreground'
                }`}
                onClick={() => setMode('upload')}
              >
                <FaFileUpload /> Upload File
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {mode === 'manual' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted mb-3">Enter contacts individually.</p>
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input 
                          placeholder="Name" 
                          value={contact.name} 
                          onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition"
                          required
                        />
                        <input 
                          placeholder="Email" 
                          type="email"
                          value={contact.email} 
                          onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition"
                          required
                        />
                        <input 
                          placeholder="Company" 
                          value={contact.company} 
                          onChange={(e) => handleInputChange(index, 'company', e.target.value)}
                          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition"
                          required
                        />
                        <input 
                          placeholder="Job Link (Optional)" 
                          value={contact.job_link || ''} 
                          onChange={(e) => handleInputChange(index, 'job_link', e.target.value)}
                          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition"
                        />
                      </div>
                      {contacts.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeRow(index)}
                          className="p-2 text-error hover:bg-error/20 rounded-lg transition"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 border border-primary/30 rounded-lg transition"
                  >
                    <FaPlus /> Add Contact
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    Upload an Excel (.xlsx) or CSV file. <br/>
                    <strong>Required columns:</strong> Name, Email, Company. <br/>
                    <strong>Optional column:</strong> Job Link.
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-gray/50 transition">
                    <input 
                      type="file" 
                      accept=".xlsx, .csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-700 hover:file:cursor-pointer cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-foreground">Selected: <strong className='text-success'>{selectedFile.name}</strong></p>
                  )}
                </div>
              )}

              {modalError && (
                <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                  {modalError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending || (mode === 'upload' && !selectedFile)}
                className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSending ? (
                  'Starting Workflow...'
                ) : (
                  <>
                    <FaCloudUploadAlt size={18} /> Start AI Agent
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const OutreachTableSkeletonRows = ({ rowCount = 8 }: { rowCount?: number }) => (
  <>
    {Array.from({ length: rowCount }).map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="p-4">
          <Skeleton variant="line" className="h-4 w-32 mb-2" />
          <Skeleton variant="line" className="h-3 w-44" />
        </td>
        <td className="p-4">
          <Skeleton variant="line" className="h-4 w-28" />
        </td>
        <td className="p-4">
          <Skeleton variant="pill" className="h-6 w-20" />
        </td>
        <td className="p-4">
          <Skeleton variant="line" className="h-4 w-24" />
        </td>
        <td className="p-4">
          <Skeleton variant="line" className="h-4 w-24" />
        </td>
        <td className="p-4">
          <div className="flex justify-end gap-2">
            <Skeleton variant="circle" className="h-8 w-8" />
            <Skeleton variant="circle" className="h-8 w-8" />
            <Skeleton variant="circle" className="h-8 w-8" />
          </div>
        </td>
      </tr>
    ))}
  </>
);