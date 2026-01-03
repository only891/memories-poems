
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
  "正在查阅古籍...",
  "寻访名士...",
  "推敲字句...",
  "斟酌韵律...",
  "神游太虚...",
  "煮酒论诗..."
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

    // Hit cache first
    if (cachedData) {
        setExplanation(cachedData.text);
        setSources(cachedData.sources || []);
        setLoading(false);
        return;
    }

    // No cache, fetch new
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
                // 收到第一个字块时立即取消 loading 状态，让用户感觉速度很快
                setLoading(false); 
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
      // Stream finished, update cache
      if (currentPoemRef.current === poemText) {
         onCacheUpdate(poemText, { text: accumulatedText, sources: accumulatedSources });
      }
    } catch (e) {
      console.error(e);
      if (currentPoemRef.current === poemText) {
        setExplanation('AI 正在翻阅古籍，请稍后再试...');
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

  // Rotate loading messages
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

  // Simple swipe down detection
  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStart;
      if (diff > 50) { // Swipe down threshold
          onClose();
          setTouchStart(null);
      }
  };

  return (
    <>
        {/* Backdrop */}
        <div 
            className={`absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity duration-500 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />
        
        {/* Drawer Panel */}
        <div 
            className={`absolute bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        >
            {/* Header / Handle */}
            <div 
                className="flex items-center justify-center p-3 border-b border-slate-100 cursor-pointer shrink-0"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onClick={onClose} // Also close on header click for desktop/ease
            >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-1" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex justify-between items-start mb-4 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-amber-900 flex items-center gap-1.5 mb-1">
                            <span>✨ 深度典故解析</span>
                        </h3>
                        <p className="text-xs text-slate-400 italic">
                            {poemText}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative text-slate-700">
                    {loading && !explanation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                            <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                            <span className="text-xs text-amber-600 animate-pulse transition-all duration-300">{loadingText}</span>
                        </div>
                    ) : (
                        <div className="pb-4">
                            <div className="text-sm leading-7 text-justify animate-fade-in font-serif mb-4 markdown-body">
                                <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                            {/* Sources display hidden as per request */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default GeminiPanel;
