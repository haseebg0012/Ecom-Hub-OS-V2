import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { ActiveNavSection } from '../../types';

interface AiCopilotViewProps {
  onNavigate?: (section: ActiveNavSection, entityId?: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const DEFAULT_SUGGESTIONS = [
  "Today's business summary",
  "What was our revenue this month?",
  "Show overdue invoices",
  "Which clients owe us money?",
  "Show me today's follow-ups",
  "How many new leads came this week?",
  "What are our expenses this month?",
  "Show recurring expenses"
];

export function AiCopilotView({ onNavigate }: AiCopilotViewProps) {
  const { session, activeBusiness } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations on mount or business change
  useEffect(() => {
    if (activeBusiness?.id) {
      fetchConversations();
    }
  }, [activeBusiness?.id]);

  // Fetch messages when currentConversationId changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations', {
        headers: {
          'Authorization': `Bearer user:${session?.user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
          'x-user-id': session?.user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !currentConversationId) {
          setCurrentConversationId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load AI conversations', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
        headers: {
          'Authorization': `Bearer user:${session?.user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
          'x-user-id': session?.user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user:${session?.user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
          'x-user-id': session?.user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
        body: JSON.stringify({ title: 'New Business Inquiry' }),
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations([newConv, ...conversations]);
        setCurrentConversationId(newConv.id);
        setMessages([]);
        setErrorMsg(null);
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isLoading) return;

    let convId = currentConversationId;
    // If no active conversation, create one first
    if (!convId) {
      try {
        const res = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer user:${session?.user?.id || 'usr-ecometrix-001'}`,
            'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
            'x-user-id': session?.user?.id || 'usr-ecometrix-001',
            'x-user-role': activeBusiness?.role || 'Owner',
          },
          body: JSON.stringify({ title: text.slice(0, 30) + '...' }),
        });
        if (res.ok) {
          const newConv = await res.json();
          setConversations([newConv, ...conversations]);
          convId = newConv.id;
          setCurrentConversationId(convId);
        }
      } catch (err) {
        console.error('Failed to create conversation', err);
        return;
      }
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user:${session?.user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
          'x-user-id': session?.user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
        body: JSON.stringify({
          conversation_id: convId,
          message: text,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get AI response');
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.answer || data.content || 'No response generated.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      setErrorMsg(err.message || 'AI is temporarily unavailable. Please try again.');
      const errorMsgObj: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: err.message || 'I couldn\'t retrieve that information right now.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar for History */}
      <div className={`w-72 bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 ${isHistoryOpen ? 'block' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="font-semibold text-sm text-[#0F172A]">AI Copilot History</h2>
          </div>
          <button
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#64748B]">
              No previous conversations. Start a new chat below.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-[#EEF2FF] text-[#4F46E5]'
                    : 'text-[#334155] hover:bg-[#F8FAFC]'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate flex-1">{conv.title || 'Business Inquiry'}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#64748B] flex items-center justify-between">
          <span>Active: {activeBusiness?.name || 'EcomHub Business'}</span>
          <span className="uppercase text-[10px] font-semibold bg-[#E2E8F0] px-1.5 py-0.5 rounded text-[#334155]">
            {activeBusiness?.role || 'Owner'}
          </span>
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="md:hidden text-[#64748B] hover:text-[#0F172A]"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-[#0F172A] tracking-tight">AI Business Copilot</h1>
              <p className="text-xs text-[#64748B]">Ask about your business or find the information you need.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Read-Only Copilot
            </span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[#0F172A]">How can I assist your business today?</h3>
                <p className="text-sm text-[#64748B] max-w-md mx-auto">
                  Query financial metrics, outstanding invoices, lead pipelines, client records, or summaries instantly using authorized business data.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 text-left">
                {DEFAULT_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#334155] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <span>{sug}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#4F46E5] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-[#4F46E5] text-white shadow-xs'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0F172A] text-white rounded-tr-none'
                        : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-none shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.role === 'user' ? 'text-slate-400 text-right' : 'text-[#94A3B8]'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-none px-4 py-3 text-sm text-[#64748B] flex items-center gap-2 shadow-2xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#4F46E5]" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-4 bg-white border-t border-[#E2E8F0] shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Suggestion pills if messages exist */}
            {messages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[#64748B] shrink-0 font-medium">Suggestions:</span>
                {DEFAULT_SUGGESTIONS.slice(0, 4).map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] rounded-full hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-indigo-200 transition-colors whitespace-nowrap"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex items-center">
              <textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about revenue, invoices, leads, clients, or expenses..."
                rows={1}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-4 pr-12 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] resize-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className="absolute right-2.5 p-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:hover:bg-[#4F46E5] transition-colors shadow-xs"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-center text-[11px] text-[#94A3B8]">
              EcomHub OS Copilot relies on verified business roles and controlled read-only tools.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
