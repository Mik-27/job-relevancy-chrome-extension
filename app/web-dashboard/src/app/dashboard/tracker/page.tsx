'use client';

import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Application } from '@/types';
import { getApplications, updateApplicationStatus, createApplication, deleteApplication, toggleApplicationBoardStatus } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { FaPlus, FaTrash, FaExternalLinkAlt, FaList, FaTh, FaThumbtack, FaSearch } from 'react-icons/fa';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Define columns/statuses
const STATUSES = {
  saved: { id: 'saved', title: 'Saved', color: 'border-l-4 border-gray-500 rounded-l-lg', badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  applied: { id: 'applied', title: 'Applied', color: 'border-l-4 border-blue-500 rounded-l-lg', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  interviewing: { id: 'interviewing', title: 'Interviewing', color: 'border-l-4 border-yellow-500 rounded-l-lg', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  offer: { id: 'offer', title: 'Offer', color: 'border-l-4 border-green-500 rounded-l-lg', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected: { id: 'rejected', title: 'Rejected', color: 'border-l-4 border-red-500 rounded-l-lg', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [newApp, setNewApp] = useState({ company_name: '', job_title: '', job_url: '', job_id: '', referred_by: '' });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toast = useToast();

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => toast.error("Failed to load tracker"))
      .finally(() => setLoading(false));
  }, []);

  // --- FILTERING LOGIC ---
  const filteredApplications = useMemo(() => {
    if (!searchTerm) return applications;
    const lowerTerm = searchTerm.toLowerCase();
    
    return applications.filter(app => 
      app.company_name.toLowerCase().includes(lowerTerm) ||
      app.job_title.toLowerCase().includes(lowerTerm) ||
      (app.job_id && app.job_id.toLowerCase().includes(lowerTerm))
    );
  }, [applications, searchTerm]);

  // --- Kanban Logic ---
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Application['status'];
    handleStatusChange(draggableId, newStatus);
  };

  // --- Shared Logic: Update Status ---
  const handleStatusChange = async (id: string, newStatus: string) => {
    // 1. Optimistic Update
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus as Application['status'] } : app
    ));

    // 2. API Call
    try {
      await updateApplicationStatus(id, newStatus);
      toast.success(`Status changed to ${STATUSES[newStatus as keyof typeof STATUSES].title}`);
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
      // Could revert state here if needed
    }
  };

  // --- UPDATED ADD HANDLER ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newApp.company_name || !newApp.job_title) return;

    try {
      const created = await createApplication({ ...newApp, status: 'saved' });
      setApplications([created, ...applications]);
      setIsAdding(false);
      setNewApp({ company_name: '', job_title: '', job_url: '', job_id: '', referred_by: '' });
      toast.success("Job added!");
    } catch (err) {
      toast.error("Failed to add job");
      console.error(err);
    }
  };

  const handleToggleBoard = async (id: string, currentStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Optimistic Update
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, on_board: !currentStatus } : app
    ));

    try {
      await toggleApplicationBoardStatus(id, !currentStatus);
      toast.success(!currentStatus ? "Added to Kanban Board" : "Removed from Kanban Board");
    } catch (err) {
      toast.error("Failed to update");
      console.error(err);
      // Revert on fail
      setApplications(prev => prev.map(app => 
        app.id === id ? { ...app, on_board: currentStatus } : app
      ));
    }
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete(id); // Set the ID, which opens the modal
  };

  // 4. NEW: ACTUAL DELETE LOGIC
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
        await deleteApplication(itemToDelete);
        setApplications(prev => prev.filter(a => a.id !== itemToDelete));
        toast.success("Application deleted");
        setItemToDelete(null);
    } catch(err) {
        toast.error("Failed to delete application");
        console.error(err);
    } finally {
        setIsDeleting(false);
    }
  };

  // --- Filter for Board View ---
  // Only show apps where on_board is TRUE
  const getBoardAppsByStatus = (status: string) => 
    applications.filter(a => a.status === status && a.on_board);

  if (loading) return <div className="p-8 text-muted">Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Application Tracker</h1>
          <p className="text-muted text-sm mt-1">Manage your job pipeline</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            {/* --- NEW: SEARCH BAR --- */}
            <div className="relative flex-1 md:w-64">
                <input 
                    type="text" 
                    placeholder="Search company, role, ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <FaSearch className="absolute left-3 top-3 text-muted text-xs" />
            </div>
            
            {/* --- NEW: View Toggle --- */}
            <div className="flex bg-card border border-border rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'board' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    title="Board View"
                >
                    <FaTh />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    title="List View"
                >
                    <FaList />
                </button>
            </div>

            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              {!isAdding ? <><FaPlus /> Add Job</> : "Cancel"}
            </button>
        </div>
      </div>

      {/* Add Job Form (Shared) */}
      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">Company</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground focus:outline-none focus:border-primary"
                value={newApp.company_name}
                onChange={e => setNewApp({...newApp, company_name: e.target.value})}
                required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">Job Title</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground focus:outline-none focus:border-primary"
                value={newApp.job_title}
                onChange={e => setNewApp({...newApp, job_title: e.target.value})}
                required
            />
          </div>
          <div>
                <label className="text-xs text-muted block mb-1">Job ID</label>
                <input className="w-full bg-input border border-border rounded p-2 text-foreground" value={newApp.job_id} onChange={e => setNewApp({...newApp, job_id: e.target.value})} />
             </div>
             <div>
                <label className="text-xs text-muted block mb-1">Referred By</label>
                <input className="w-full bg-input border border-border rounded p-2 text-foreground" value={newApp.referred_by} onChange={e => setNewApp({...newApp, referred_by: e.target.value})} />
             </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">URL (Optional)</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground focus:outline-none focus:border-primary"
                value={newApp.job_url}
                onChange={e => setNewApp({...newApp, job_url: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-success/20 text-success border border-success/30 px-6 py-2 rounded hover:bg-success/30 h-[42px] font-medium transition-colors">
            Save
          </button>
        </form>
      )}

      {/* --- CONDITIONAL RENDERING --- */}

      {viewMode === 'board' ? (
        /* KANBAN BOARD VIEW */
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            {Object.entries(STATUSES).map(([columnId, column]) => (
                <div key={columnId} className="flex-shrink-0 w-72 flex flex-col bg-[#1e1e1e] rounded-xl border border-border/50">
                <div className={`p-4 border-b border-border/50 font-semibold text-foreground flex justify-between items-center ${column.color}`}>
                    {column.title}
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted">
                    {getBoardAppsByStatus(columnId).length}
                    </span>
                </div>

                <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 p-3 overflow-y-auto min-h-[550px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-secondary/20' : ''
                        }`}
                    >
                        {getBoardAppsByStatus(columnId).map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                            {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                bg-card border border-border rounded-lg p-3 mb-3 shadow-sm group
                                hover:border-primary/50 transition-all
                                ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105 border-primary z-50' : ''}
                                `}
                                style={provided.draggableProps.style}
                            >
                                {/* --- NEW: Quick Unpin Button on Card --- */}
                                <button 
                                  onClick={(e) => handleToggleBoard(app.id, true, e)}
                                  className="absolute top-2 right-2 text-primary opacity-0 group-hover:opacity-100 hover:text-muted transition"
                                  title="Remove from Board (Keep in List)"
                                >
                                  <FaThumbtack size={10} />
                                </button>
                                <h4 className="font-bold text-foreground text-sm">{app.company_name}</h4>
                                <p className="text-xs text-muted mt-1">{app.job_title}</p>
                                
                                <div className="flex justify-between items-center mt-3 border-t border-border/30 pt-2">
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(app.updated_at).toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-2">
                                        {app.job_url && (
                                            <a href={app.job_url} target="_blank" className="text-muted hover:text-primary transition">
                                                <FaExternalLinkAlt size={10} />
                                            </a>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(app.id); }} className="text-muted hover:text-error transition opacity-0 group-hover:opacity-100">
                                            <FaTrash size={10} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            )}
                        </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                    )}
                </Droppable>
                </div>
            ))}
            </div>
        </DragDropContext>
      ) : (
        /* LIST VIEW */
        <div className="bg-card border border-border rounded-xl shadow-lg flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/50 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-4 font-semibold text-muted">Company</th>
                            <th className="p-4 font-semibold text-muted">Role</th>
                            <th className="p-4 font-semibold text-muted">Job ID</th>
                            <th className="p-4 font-semibold text-muted">Referred By</th>
                            <th className="p-4 font-semibold text-muted">Status</th>
                            <th className="p-4 font-semibold text-muted">Last Updated</th>
                            <th className="p-4 font-semibold text-muted text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {applications.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-muted italic">No applications found. Add one above!</td></tr>
                        ) : (
                            applications.map((app) => (
                                <tr key={app.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="p-4 font-medium text-foreground">{app.company_name}</td>
                                    <td className="p-4 text-muted">{app.job_title}</td>
                                    <td className="p-4 text-xs text-muted font-mono">{app.job_id || '-'}</td>
                                    <td className="p-4 text-xs text-muted">{app.referred_by || '-'}</td>
                                    
                                    {/* Editable Status Column */}
                                    <td className="p-4">
                                        <select 
                                            value={app.status}
                                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                            className="bg-input border border-border rounded-md text-xs py-1 px-2 text-foreground focus:outline-none focus:border-primary cursor-pointer"
                                        >
                                            {Object.entries(STATUSES).map(([key, val]) => (
                                                <option key={key} value={key}>{val.title}</option>
                                            ))}
                                        </select>
                                    </td>
                                    
                                    <td className="p-4 text-muted text-xs">
                                        {new Date(app.updated_at).toLocaleDateString()}
                                    </td>
                                    
                                    <td className="p-4 text-right flex justify-end gap-3">
                                        {app.job_url && (
                                            <a href={app.job_url} target="_blank" className="text-blue-400 hover:text-blue-300 transition" title="View Job">
                                                <FaExternalLinkAlt />
                                            </a>
                                        )}
                                        {/* --- NEW: Pin/Unpin Button --- */}
                                        <button 
                                          onClick={(e) => handleToggleBoard(app.id, app.on_board, e)} 
                                          className={`transition p-2 rounded ${app.on_board ? 'text-primary hover:bg-primary/10' : 'text-muted hover:text-foreground hover:bg-secondary'}`} 
                                          title={app.on_board ? "Remove from Board" : "Add to Board"}
                                        >
                                            <FaThumbtack />
                                        </button>
                                        <button onClick={() => handleDeleteClick(app.id)} className="text-muted hover:text-error transition" title="Delete">
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
      <ConfirmModal 
         isOpen={!!itemToDelete}
         onClose={() => setItemToDelete(null)}
         onConfirm={confirmDelete}
         title="Delete Application"
         message="Are you sure you want to remove this application from your tracker? This action cannot be undone."
         confirmText="Delete Application"
         isDanger={true}
         isLoading={isDeleting}
       />
    </div>
  );
}