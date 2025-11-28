
import React from 'react';
import { TicketElement } from '../types';
import { Type, Image as ImageIcon, Layers, ArrowDownFromLine } from 'lucide-react';

interface TicketPreviewProps {
  elements: TicketElement[];
  width: number;
  minHeight: number;
  onElementSelect: (id: string) => void;
  selectedId: string | null;
  variables: Record<string, string>;
  previewOverlayScale?: number;
}

const TicketPreview: React.FC<TicketPreviewProps> = ({ 
    elements, width, minHeight, onElementSelect, selectedId, variables,
    previewOverlayScale = 1.0 
}) => {
  
  const processContent = (content: string) => {
    let processed = content;
    // Replace {key} with value from variables
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processed = processed.replace(regex, String(value));
    });
    return processed;
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Ticket Canvas */}
      <div className="flex-1 flex justify-center p-8 pl-24 overflow-y-auto bg-slate-300 shadow-inner no-scrollbar">
        <div 
            className="bg-white shadow-2xl relative transition-all duration-300"
            style={{ width: `${width}px`, minHeight: `${minHeight}px`, paddingBottom: '40px' }} 
        >
            {elements.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 select-none">
                    <p className="font-bold">空白票券 (Empty Ticket)</p>
                    <p className="text-sm">請從左側工具箱新增元素</p>
                    <p className="text-xs mt-2 opacity-60">或點選「載入 C#」貼上程式碼</p>
                </div>
            )}

            {elements.map((el, idx) => {
                const isSelected = el.id === selectedId;
                const isNegativeSpacing = el.type === 'spacing' && (el.spacingHeight || 0) < 0;

                // Determine Icon and Color for the side tag
                let Icon = Type;
                let tagColorClass = "text-slate-500 bg-slate-100 border-slate-300";
                
                if (el.type === 'image') { 
                    Icon = ImageIcon; 
                    tagColorClass = "text-purple-600 bg-purple-50 border-purple-300";
                } else if (el.type === 'spacing') {
                    if ((el.spacingHeight || 0) < 0) {
                        Icon = Layers; 
                        tagColorClass = "text-red-500 bg-red-50 border-red-300";
                    } else {
                        Icon = ArrowDownFromLine; 
                        tagColorClass = "text-blue-500 bg-blue-50 border-blue-300";
                    }
                }
                
                if (isSelected) {
                    tagColorClass = "text-white bg-blue-500 border-blue-600 ring-2 ring-blue-300";
                }

                // Calculate Visual Overlay Style
                const visualMarginBottom = isNegativeSpacing 
                    ? (el.spacingHeight || 0) * previewOverlayScale 
                    : 0;

                const wrapperStyle: React.CSSProperties = isNegativeSpacing 
                    ? { 
                        height: '0px', 
                        marginBottom: `${visualMarginBottom}px`, 
                        zIndex: 30, 
                        position: 'relative'
                    } 
                    : { 
                        zIndex: 10, 
                        position: 'relative' 
                    }; 

                // Generate Content Node based on Type
                let contentNode: React.ReactNode = null;

                if (el.type === 'spacing') {
                    const h = el.spacingHeight || 0;
                    if (h < 0) {
                        // Negative Spacing = Overlay Command (RED)
                        contentNode = (
                            <div className="w-full relative group h-0">
                                {/* Interactive Handle */}
                                <div 
                                    className={`absolute left-0 right-0 -top-2 h-4 flex items-center cursor-pointer z-50 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                                    title={`疊加設定: 向上移動 ${Math.abs(h)} 單位 (視覺預覽: ${Math.abs(Math.round(visualMarginBottom))})`}
                                >
                                    <div className="w-full border-t-2 border-red-500 border-dashed shadow-sm"></div>
                                </div>
                                {/* Label */}
                                <div className={`absolute right-0 -top-5 z-50 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded shadow-sm whitespace-nowrap font-bold">
                                        Overlay {Math.abs(h)}
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Positive Spacing = Feed (BLUE)
                        contentNode = (
                            <div 
                                style={{ height: `${h}px` }} 
                                className={`w-full relative flex items-center justify-center border-x border-transparent transition-all overflow-hidden ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-blue-50/50 hover:border-blue-100'}`}
                            >
                                <div className={`text-[10px] text-blue-400 font-mono select-none ${h < 15 && !isSelected ? 'hidden' : 'block'}`}>
                                    Feed {h}px
                                </div>
                                <div className="absolute inset-0 border-b border-blue-200 border-dashed opacity-20 pointer-events-none"></div>
                            </div>
                        );
                    }
                } else if (el.type === 'image') {
                    contentNode = (
                        <div className="w-full flex relative z-0" style={{ justifyContent: el.align }}>
                            {el.content ? (
                                <img src={el.content} alt="ticket graphic" className="max-w-full block" />
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 text-xs text-gray-400 bg-gray-50/50 w-full min-h-[100px] flex flex-col items-center justify-center p-4 select-none">
                                    <span className="font-bold">等待圖片</span>
                                    <span className="text-[10px]">(No Image Data)</span>
                                    {isSelected && <span className="text-[10px] text-blue-500 mt-1">請在右側載入圖片</span>}
                                </div>
                            )}
                        </div>
                    );
                } else if (el.type === 'text') {
                    const processed = processContent(el.content);
                    contentNode = (
                        <div 
                            className="whitespace-pre-wrap leading-tight break-words ticket-font pointer-events-auto"
                            style={{ 
                                textAlign: el.align,
                                fontWeight: el.isBold ? 'bold' : 'normal',
                                // Calibration for 270px Width:
                                // Normal (15px): Fits 30 units (e.g., "3. ... 完畢") perfectly.
                                // Large (16.5px): Fits 27 units (e.g., "兌換人: ...") perfectly.
                                fontSize: el.size === 'large' ? '16.5px' : '15px', 
                                lineHeight: el.size === 'large' ? '1.1' : '1.4',
                                letterSpacing: '0px',
                                backgroundColor: 'transparent',
                                position: 'relative',
                                zIndex: 20 
                            }}
                        >
                            {processed || <span className="text-slate-300 italic select-none">空文字 (Empty)</span>}
                        </div>
                    );
                }

                return (
                    <div 
                        key={el.id}
                        onClick={(e) => { e.stopPropagation(); onElementSelect(el.id); }}
                        className={`group transition-colors duration-100 border border-transparent relative ${isSelected ? 'ring-2 ring-blue-500 z-40 bg-blue-50/10' : 'hover:border-slate-300'}`}
                        style={wrapperStyle}
                    >
                        {/* Floating Side Tag (Outside Ticket) */}
                        <div 
                            className="absolute left-[-50px] top-0 w-10 flex justify-end"
                            onClick={(e) => { e.stopPropagation(); onElementSelect(el.id); }}
                        >
                            <button 
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all shadow-sm border ${tagColorClass}`}
                                title={`#${idx+1}: 點擊選擇`}
                            >
                                <Icon size={16} />
                                <div className="absolute -top-1 -left-1 text-[8px] font-mono bg-slate-700 text-white px-1.5 rounded-full z-10 scale-75 origin-center">
                                    {idx + 1}
                                </div>
                            </button>
                        </div>

                        {contentNode}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default TicketPreview;
