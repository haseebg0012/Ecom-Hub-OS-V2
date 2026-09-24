import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Archive, Trash2, XCircle, Loader2 } from 'lucide-react';
import { AuditActionType } from '../../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  recordName: string;
  recordType: string;
  actionType?: AuditActionType;
  warningMessage?: string;
  isIrreversible?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  recordName,
  recordType,
  actionType = 'delete',
  warningMessage,
  isIrreversible = false,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionIcon = () => {
    switch (actionType) {
      case 'archive':
        return <Archive className="w-5 h-5 text-amber-600" />;
      case 'cancel':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      default:
        return isIrreversible ? (
          <ShieldAlert className="w-5 h-5 text-rose-600" />
        ) : (
          <Trash2 className="w-5 h-5 text-rose-600" />
        );
    }
  };

  const getActionVerb = () => {
    switch (actionType) {
      case 'archive':
        return 'Archive';
      case 'cancel':
        return 'Cancel';
      case 'deactivate':
        return 'Deactivate';
      case 'soft_delete':
        return 'Move to Archive';
      default:
        return 'Delete';
    }
  };

  const defaultWarning =
    actionType === 'cancel'
      ? `This will mark the ${recordType.toLowerCase()} as cancelled while preserving audit and payment records.`
      : actionType === 'archive'
      ? `This will archive the ${recordType.toLowerCase()} from active pipeline views while preserving historical financial metrics.`
      : isIrreversible
      ? `This action is irreversible. All linked records and data will be permanently removed.`
      : `This will remove the ${recordType.toLowerCase()} from active records while retaining an audit trail for your organization.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          {/* Header Icon + Title */}
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                actionType === 'archive'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-rose-50 border border-rose-200'
              }`}
            >
              {getActionIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Target: <span className="font-semibold text-[#0F172A]">{recordName}</span>
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              isIrreversible
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : actionType === 'archive'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-80" />
            <span>{warningMessage || defaultWarning}</span>
          </div>

          {/* Reason Input */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Reason for audit log <span className="text-[#94A3B8] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate entry, client contract ended, cancelled by request"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-white rounded-xl border border-transparent hover:border-[#E2E8F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
              actionType === 'archive'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{getActionVerb()} {recordType}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
