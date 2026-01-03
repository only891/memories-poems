
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { GeminiService, GroundingSource } from '../services/gemini';

export interface ExplanationData {
    text: string;
    sources: GroundingSource[];
}

interface GeminiPanelProps {
  poemText: string;
  cachedData?: ExplanationData;
  onCacheUpdate: (key: string, value: ExplanationData) => void;
  onClose: () => void;
}

const LOADING_MESSAGES = [
  "正在开启深度推理模式...",
  "AI 正在沉思诗句意境...",
  "正在跨时空查阅文献...",
  "推敲典故中...",
  "神游千古，感悟诗情..."
];

const GeminiPanel: React.FC<GeminiPanelProps> = ({ poemText, cachedData, onCacheUpdate, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const currentPoemRef = useRef<string>('');
  const service = GeminiService.getInstance();
  const isVisible = !!poemText;

  const handleExplain = useCallback(async () => {
    if (!poemText) return;
    
    currentPoemRef.current = poemText;

    if (cachedData) {
        setExplanation(cachedData.text);
        setSources(cachedData.sources || []);
        setLoading(false);
        return;
    }

    setLoading(true);
    setExplanation('');
    setSources([]);

    try {
      let accumulatedText = '';
      let accumulatedSources: GroundingSource[] = [];

      await service.streamPoemExplanation(
        poemText, 
        (chunk) => {
            if (currentPoemRef.current === poemText) {
                accumulatedText += chunk;
                setExplanation(accumulatedText);
                // 当产生一定内容时取消全屏加载，提升感知体验
                if (accumulatedText.length > 30) {
                    setLoading(false); 
                }
            }
        },
        (newSources) => {
             if (currentPoemRef.current === poemText) {
                 const existingUrls = new Set(accumulatedSources.map(s => s.url));
                 newSources.forEach(s => {
                     if (!existingUrls.has(s.url)) {
                         accumulatedSources.push(s);
                         existingUrls.add(s.url);
                     }
                 });
                 setSources([...accumulatedSources]);
             }
        }
      );
      
      if (currentPoemRef.current === poemText) {
         onCacheUpdate(poemText, { text: accumulatedText, sources: accumulatedSources });
      }
    } catch (e) {
      console.error(e);
      if (currentPoemRef.current === poemText) {
        setExplanation('AI 在深思时遇到了迷雾（请检查 API Key 权限或余额），请稍后再试。');
      }
    } finally {
      if (currentPoemRef.current === poemText) {
        setLoading(false);
      }
    }
  }, [poemText, cachedData, onCacheUpdate, service]);

  useEffect(() => {
    if (isVisible) {
        handleExplain();
    } else {
        setExplanation('');
        setSources([]);
    }
  }, [isVisible, handleExplain]);

  useEffect(() => {
    let interval: number;
    if (loading) {
      let index = 0;
      setLoadingText(LOADING_MESSAGES[0]);
      interval = window.setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingText(LOADING_MESSAGES[index]);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStart;
      if (diff > 50) { 
          onClose();
          setTouchStart(null);
      }
  };

  return (
    <>
        <div 
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 transition-opacity duration-500 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />
        
        <div 
            className={`absolute bottom-0 left-0 right-0 h-[75vh] bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.15)] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        >
            <div 
                className="flex items-center justify-center p-5 border-b border-slate-50 cursor-pointer shrink-0"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onClick={onClose}
            >
                <div className="w-14 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex justify-between items-start mb-6 shrink-0">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">Thinking Mode</span>
                            <h3 className="text-xl font-black text-amber-900">千古绝句深思</h3>
                        </div>
                        <p className="text-sm text-slate-500 font-serif border-l-4 border-amber-200 pl-4 py-1 italic bg-amber-50/30 rounded-r-lg">
                            {poemText}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative text-slate-700">
                    {loading && !explanation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-amber-800 mb-2">Gemini 正在进行深度文化推理</p>
                                <p className="text-xs text-slate-400 animate-pulse">{loadingText}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="pb-10 animate-fade-in">
                            <div className="text-[17px] leading-[2] text-justify font-serif mb-10 markdown-body px-1">
                                <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>

                            {sources.length > 0 && (
                                <div className="mt-10 pt-8 border-t border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-5">参考来源 · 引经据典</h4>
                                    <div className="grid gap-3">
                                        {sources.map((source, i) => (
                                            <a 
                                                key={i} 
                                                href={source.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100 group shadow-sm"
                                            >
                                                <span className="text-xs font-medium text-slate-600 truncate mr-4 group-hover:text-amber-800">{source.title}</span>
                                                <svg className="w-4 h-4 text-slate-300 group-hover:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                                </svg>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default GeminiPanel;
