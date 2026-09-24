import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, Calendar, Tag, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface DocumentItem {
  id: string;
  business_id: string;
  title: string;
  category: string;
  updated_at: string;
  file_size: string;
}

export const DocumentsView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.id || 'biz-default';

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(`ecomhub_documents_${businessId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'doc-001',
        business_id: businessId,
        title: 'Standard Client Retainer Agreement 2026',
        category: 'Legal',
        updated_at: '2026-01-15',
        file_size: '2.4 MB',
      },
      {
        id: 'doc-002',
        business_id: businessId,
        title: 'Q1 Enterprise Brand Guidelines & Logos',
        category: 'Branding',
        updated_at: '2026-02-10',
        file_size: '14.8 MB',
      },
    ];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Legal');
  const [fileSize, setFileSize] = useState('1.2 MB');

  useEffect(() => {
    try {
      localStorage.setItem(`ecomhub_documents_${businessId}`, JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents, businessId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      business_id: businessId,
      title: title.trim(),
      category,
      updated_at: new Date().toISOString().split('T')[0],
      file_size: fileSize || '1.0 MB',
    };

    setDocuments([newDoc, ...documents]);
    setTitle('');
    setIsModalOpen(false);
  };

  const deleteDoc = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#4F46E5]" />
            <span>Documents & Repository</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Secure multi-tenant file repository for agreements, tax records, and proposals for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search documents by title or category..."
          className="w-full text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="divide-y divide-[#E2E8F0]">
          {filtered.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-[#0F172A] truncate">{doc.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#94A3B8]" />
                      <span>{doc.category}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#94A3B8]" />
                      <span>Updated {doc.updated_at}</span>
                    </span>
                    <span>{doc.file_size}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => alert(`Downloading ${doc.title}...`)}
                  className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="p-2 border border-[#E2E8F0] rounded-lg text-[#94A3B8] hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F172A]">No documents found</p>
              <p className="text-xs text-[#64748B] mt-1">Upload your first agreement or proposal.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">Upload Document</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Services Agreement"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Legal">Legal</option>
                    <option value="Branding">Branding</option>
                    <option value="Financial">Financial</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">File Size</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA]"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
