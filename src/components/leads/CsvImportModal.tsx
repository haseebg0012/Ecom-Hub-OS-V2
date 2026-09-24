import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Check, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { Lead } from '../../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted?: (count: number) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const { importLeads, checkDuplicateLead } = useCrm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    service: '',
    budget: '',
    currency: '',
    source: '',
  });

  const [isImporting, setIsImporting] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<number>(0);
  const [parsedLeads, setParsedLeads] = useState<Partial<Lead>[]>([]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({
      name: '',
      company: '',
      email: '',
      phone: '',
      service: '',
      budget: '',
      currency: '',
      source: '',
    });
    setDuplicateMatches(0);
    setParsedLeads([]);
  };

  const parseCsvText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return;

    // Split headers respecting quotes
    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Auto-map headers heuristically
    const autoMap: Record<string, string> = { ...columnMapping };
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('name') && !lower.includes('company')) autoMap.name = h;
      else if (lower.includes('company') || lower.includes('organization')) autoMap.company = h;
      else if (lower.includes('email')) autoMap.email = h;
      else if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) autoMap.phone = h;
      else if (lower.includes('service') || lower.includes('inquiry')) autoMap.service = h;
      else if (lower.includes('budget') || lower.includes('value') || lower.includes('amount')) autoMap.budget = h;
      else if (lower.includes('currency')) autoMap.currency = h;
      else if (lower.includes('source') || lower.includes('channel')) autoMap.source = h;
    });

    setColumnMapping(autoMap);
    setStep('mapping');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleProceedToPreview = () => {
    // Generate parsed lead objects based on mappings
    let dupCount = 0;
    const leadsList: Partial<Lead>[] = csvRows.map((row) => {
      const getVal = (colName: string) => {
        const header = columnMapping[colName];
        if (!header) return null;
        const idx = csvHeaders.indexOf(header);
        return idx !== -1 ? row[idx] || null : null;
      };

      const email = getVal('email');
      const phone = getVal('phone');
      const company = getVal('company');

      const isDup = checkDuplicateLead(email, phone, company).isDuplicate;
      if (isDup) dupCount++;

      return {
        name: getVal('name') || 'Imported Prospect',
        company,
        email,
        phone,
        service: getVal('service') || 'eCommerce Growth',
        budget: getVal('budget') ? Number(getVal('budget')?.replace(/[^0-9.]/g, '')) || 0 : 0,
        currency: getVal('currency') || 'USD',
        source: getVal('source') || 'Import',
        status: 'New',
        priority: 'Medium',
      };
    });

    setDuplicateMatches(dupCount);
    setParsedLeads(leadsList);
    setStep('preview');
  };

  const handleExecuteImport = async () => {
    setIsImporting(true);
    const res = await importLeads(parsedLeads);
    setIsImporting(false);

    if (res.success) {
      if (onImportCompleted) onImportCompleted(res.importedCount);
      onClose();
      handleReset();
    }
  };

  const loadSampleCsv = () => {
    const sample = `Full Name,Company Name,Email Address,Phone Number,Service Requested,Estimated Budget,Currency,Source
Farhan Siddiqui,Apex Textile Mills,farhan@apextextiles.com,+92 321 4455667,Shopify Plus Migration,15000,USD,Import
Sara Al-Mansoor,Gulf Luxury Fragrances,sara@gulfluxury.ae,+971 50 1234567,Headless B2B Portal,18500,USD,Import
Kamran Raza,Raza Footwear,kamran@razafootwear.pk,+92 300 9876543,CRO & Checkout Audit,350000,PKR,Import
Omer Farooq,Karakoram Provisions,omer@karakoramprovisions.com,+92 333 4445556,Wholesale Portal,12000,USD,Import`;
    parseCsvText(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Import Leads via CSV</h3>
              <p className="text-[11px] text-[#64748B]">
                Upload CSV file, map fields & detect duplicate prospects
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              handleReset();
            }}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-4 text-xs font-semibold text-[#64748B] shrink-0">
          <span className={`flex items-center gap-1.5 ${step === 'upload' ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
            Upload
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${step === 'mapping' ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
            Column Mapping
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${step === 'preview' ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
            Validation & Import
          </span>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#4F46E5] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#F8FAFC]/50 hover:bg-[#EEF2FF]/20"
              >
                <div className="w-12 h-12 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-[#0F172A]">
                  Click to select or drag & drop CSV file
                </h4>
                <p className="text-xs text-[#64748B] mt-1">
                  Supports comma-separated values (.csv) with standard column headers
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-[#0F172A]">Need sample data to test?</h5>
                  <p className="text-[11px] text-[#64748B]">
                    Instantly load a pre-formatted eCommerce leads test dataset.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  className="px-3 py-1.5 text-xs font-medium text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors"
                >
                  Load Sample CSV
                </button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#EEF2FF]/60 border border-[#E0E7FF] rounded-xl text-xs text-[#4F46E5] flex items-center justify-between">
                <span>
                  Detected <strong>{csvHeaders.length}</strong> headers and <strong>{csvRows.length}</strong> lead rows in CSV.
                </span>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold underline hover:text-[#4338CA]"
                >
                  Choose different file
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Map CSV Columns to EcomHub OS Lead Fields
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'name', label: 'Lead Full Name *', required: true },
                    { key: 'company', label: 'Company / Brand Name' },
                    { key: 'email', label: 'Email Address' },
                    { key: 'phone', label: 'Phone Number' },
                    { key: 'service', label: 'Service Inquired' },
                    { key: 'budget', label: 'Estimated Budget' },
                    { key: 'currency', label: 'Currency (USD / PKR)' },
                    { key: 'source', label: 'Lead Source' },
                  ].map((field) => (
                    <div key={field.key} className="p-3 border border-[#E2E8F0] rounded-xl bg-white space-y-1.5">
                      <label className="text-xs font-semibold text-[#0F172A] block">
                        {field.label}
                      </label>
                      <select
                        value={columnMapping[field.key] || ''}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      >
                        <option value="">-- Do not map --</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Duplicate Summary Banner */}
              {duplicateMatches > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Warning: </span>
                    <span>
                      {duplicateMatches} of {parsedLeads.length} leads match existing email or phone numbers in your active tenant pipeline. They will be flagged and imported safely with historical audit trails.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All {parsedLeads.length} leads passed unique validation checks with zero duplicate conflicts.</span>
                </div>
              )}

              {/* Table Preview */}
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] mb-2 uppercase tracking-wider">
                  Lead Records Preview (First 5)
                </h4>
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white text-xs">
                  <div className="grid grid-cols-4 p-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#64748B]">
                    <span>Name & Company</span>
                    <span>Contact Info</span>
                    <span>Service</span>
                    <span>Budget</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {parsedLeads.slice(0, 5).map((l, i) => (
                      <div key={i} className="grid grid-cols-4 p-2.5 items-center">
                        <div className="truncate">
                          <p className="font-semibold text-[#0F172A] truncate">{l.name}</p>
                          <p className="text-[10px] text-[#64748B] truncate">{l.company || '—'}</p>
                        </div>
                        <div className="truncate">
                          <p className="text-[#0F172A] truncate">{l.email || '—'}</p>
                          <p className="text-[10px] text-[#64748B] truncate">{l.phone || '—'}</p>
                        </div>
                        <div className="text-[#334155] truncate">{l.service || 'General'}</div>
                        <div className="font-semibold text-[#0F172A]">
                          {l.budget ? `${l.currency} ${Number(l.budget).toLocaleString()}` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between shrink-0">
          {step === 'upload' ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
              className="px-3.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg transition-colors"
            >
              ← Back
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                handleReset();
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
            >
              Cancel
            </button>

            {step === 'mapping' && (
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Validate & Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Import {parsedLeads.length} Leads</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
