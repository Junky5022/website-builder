import { useState } from 'react';
import { PlusCircle, FolderOpen, Trash2, Key, Clock } from 'lucide-react';
import { listProjectMetas, deleteProject } from '../../utils/storage';

interface Props {
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onChangeKey: () => void;
}

export default function ProjectPicker({ onSelect, onCreate, onChangeKey }: Props) {
  const [projects, setProjects] = useState(() => listProjectMetas());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim() || 'Untitled Project';
    onCreate(name);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    deleteProject(id);
    setProjects(listProjectMetas());
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <h1 className="text-2xl font-bold text-white">Vibe Design Studio</h1>
            </div>
            <p className="text-slate-400 mt-1 ml-9">Your design projects</p>
          </div>
          <button onClick={onChangeKey} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl px-3 py-2 transition">
            <Key className="w-4 h-4" /> API Key
          </button>
        </div>

        {/* New project */}
        {creating ? (
          <form onSubmit={handleCreate} className="bg-slate-800 border border-indigo-500 rounded-2xl p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-2 transition">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="border border-slate-600 text-slate-400 hover:text-white rounded-xl px-4 py-2 transition">Cancel</button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-2xl p-4 mb-4 flex items-center gap-3 text-slate-400 hover:text-white transition group"
          >
            <PlusCircle className="w-5 h-5 group-hover:text-indigo-400 transition" />
            <span className="font-medium">New project</span>
          </button>
        )}

        {/* Projects list */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No projects yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{p.name}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Updated {formatDate(p.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => handleDelete(p.id, e)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <FolderOpen className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
