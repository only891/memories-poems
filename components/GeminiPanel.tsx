
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
  "正在为您解析诗句...",
  "正在感悟诗中意境...",
  "正在查阅相关文献...",
  "正在组织赏析文字...",
  "灵感迸发中..."
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
                // 收到一定内容时即可取消全屏加载状态
                if (accumulatedText.length > 10) {
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
        setExplanation('AI 正在忙碌，请稍后再试。');
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
      }, 1200);
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
                <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-50 pb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-xl font-black text-slate-900">千古绝句赏析</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-serif border-l-4 border-amber-200 pl-4 py-2 italic bg-amber-50/30 rounded-r-lg">
                            {poemText}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative text-slate-700 mt-4">
                    {loading && !explanation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-500 animate-pulse tracking-wide">{loadingText}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="pb-10 animate-fade-in">
                            <div className="text-[17px] leading-[2.1] text-justify font-serif markdown-body px-1">
                                <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default GeminiPanel;
