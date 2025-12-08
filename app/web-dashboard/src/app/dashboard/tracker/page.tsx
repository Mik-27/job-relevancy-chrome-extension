'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Application } from '@/types';
import { getApplications, updateApplicationStatus, createApplication, deleteApplication } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { FaPlus, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';

// Define our columns
const COLUMNS = {
  saved: { id: 'saved', title: 'Saved', color: 'border-l-4 border-gray-500' },
  applied: { id: 'applied', title: 'Applied', color: 'border-l-4 border-blue-500' },
  interviewing: { id: 'interviewing', title: 'Interviewing', color: 'border-l-4 border-yellow-500' },
  offer: { id: 'offer', title: 'Offer', color: 'border-l-4 border-green-500' },
  rejected: { id: 'rejected', title: 'Rejected', color: 'border-l-4 border-red-500' },
};

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  
  // New App Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newApp, setNewApp] = useState({ company_name: '', job_title: '', job_url: '' });

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => toast.error("Failed to load tracker"))
      .finally(() => setLoading(false));
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // 1. Optimistic Update
    const newStatus = destination.droppableId as Application['status'];
    const updatedApps = applications.map(app => 
      app.id === draggableId ? { ...app, status: newStatus } : app
    );
    setApplications(updatedApps);

    // 2. API Call
    try {
      await updateApplicationStatus(draggableId, newStatus);
    } catch (err) {
      toast.error("Failed to move card");
      console.error(err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newApp.company_name || !newApp.job_title) return;

    try {
      const created = await createApplication({ ...newApp, status: 'saved' });
      setApplications([created, ...applications]);
      setIsAdding(false);
      setNewApp({ company_name: '', job_title: '', job_url: '' });
      toast.success("Job added!");
    } catch (err) {
      toast.error("Failed to add job");
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!confirm("Delete this application?")) return;
    try {
        await deleteApplication(id);
        setApplications(prev => prev.filter(a => a.id !== id));
        toast.success("Deleted");
    } catch(err) {
        toast.error("Failed to delete");
        console.error(err);
    }
  }

  // Group applications by status
  const getAppsByStatus = (status: string) => applications.filter(a => a.status === status);

  if (loading) return <div className="p-8 text-muted">Loading board...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Application Tracker</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <FaPlus /> Add Job
        </button>
      </div>

      {/* Add Job Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">Company</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground"
                value={newApp.company_name}
                onChange={e => setNewApp({...newApp, company_name: e.target.value})}
                required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">Job Title</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground"
                value={newApp.job_title}
                onChange={e => setNewApp({...newApp, job_title: e.target.value})}
                required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-muted block mb-1">URL (Optional)</label>
            <input 
                className="w-full bg-input border border-border rounded p-2 text-foreground"
                value={newApp.job_url}
                onChange={e => setNewApp({...newApp, job_url: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-success/20 text-success border border-success/30 px-6 py-2 rounded hover:bg-success/30 h-[42px]">
            Save
          </button>
        </form>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {Object.entries(COLUMNS).map(([columnId, column]) => (
            <div key={columnId} className="flex-shrink-0 w-72 flex flex-col bg-[#1e1e1e] rounded-xl border border-border/50">
              {/* Column Header */}
              <div className={`p-4 border-b border-border/50 font-semibold text-foreground flex justify-between items-center ${column.color}`}>
                {column.title}
                <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted">
                  {getAppsByStatus(columnId).length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-secondary/20' : ''
                    }`}
                  >
                    {getAppsByStatus(columnId).map((app, index) => (
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
                                    <button onClick={(e) => handleDelete(app.id, e)} className="text-muted hover:text-error transition opacity-0 group-hover:opacity-100">
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
    </div>
  );
}