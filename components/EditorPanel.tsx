
import React, { useState, useEffect } from 'react';
import { TicketElement } from '../types';
import { AlignLeft, AlignCenter, AlignRight, Bold, Type, ChevronsUp, Trash2, ArrowUp, ArrowDown, Layers, ArrowDownFromLine, Image as ImageIcon, CheckCircle2, AlertCircle, Plus, Minus } from 'lucide-react';

interface EditorPanelProps {
  element: TicketElement | null;
  onUpdate: (id: string, updates: Partial<TicketElement>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  
  // Global Settings props
  ticketWidth: number;
  setTicketWidth: (w: number) => void;
  ticketHeight: number;
  setTicketHeight: (h: number) => void;
  previewOverlayScale: number;
  setPreviewOverlayScale: (f: number) => void;
  variables: Record<string, string>;
  setVariables: (v: Record<string, string>) => void;
}

// ------------------------------------------------------------------
// Helper Component: Spinbox
// Defined outside EditorPanel to prevent focus loss on re-render
// ------------------------------------------------------------------
interface SpinboxProps {
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
}

const Spinbox: React.FC<SpinboxProps> = ({ value, onChange, min, max, step = 1, suffix = "" }) => {
    // Local string state to support typing decimals (e.g. "0.") without immediate parsing glitch
    const [inputValue, setInputValue] = useState(String(value));

    // Sync local state when prop changes externally
    useEffect(() => {
        // Only update if the parsed value is different to avoid cursor jumps while typing valid numbers
        // or if the string representation is completely off (e.g. initial load)
        if (parseFloat(inputValue) !== value) {
             setInputValue(String(value));
        }
    }, [value]);

    const handleBlur = () => {
        // On blur, format strictly to number to clean up "0." or invalid inputs
        setInputValue(String(value));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setInputValue(raw); // Update UI immediately

        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
            // Clamp isn't applied immediately to allow typing (e.g. deleting to empty)
            // But we should ensure we pass a valid number up if possible.
            // Actually, let's just pass raw parsed if valid, parent/logic usually clamps or we clamp here.
            // For a smoother experience, we clamp on button press, but allow free typing within reason.
            if (raw !== "" && raw !== "-") {
                 onChange(parsed);
            }
        }
    };

    // Helper to fix floating point math issues on button click
    const updateValue = (newVal: number) => {
        // Determine precision based on step
        const precision = step.toString().split('.')[1]?.length || 0;
        const rounded = parseFloat(newVal.toFixed(precision));
        const clamped = Math.min(Math.max(rounded, min), max);
        onChange(clamped);
        setInputValue(String(clamped));
    };

    return (
      <div className="flex items-center w-full bg-slate-800 border border-slate-600 rounded overflow-hidden">
          <button 
              onClick={() => updateValue(value - step)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center min-w-[32px]"
          >
              <Minus size={14} />
          </button>
          <div className="flex-1 relative flex items-center justify-center bg-transparent">
            <input 
                type="number"
                step={step}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className="w-full bg-transparent text-center text-white text-sm font-mono focus:outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-xs text-slate-500 mr-2 select-none pointer-events-none absolute right-0">{suffix}</span>}
          </div>
          <button 
              onClick={() => updateValue(value + step)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center min-w-[32px]"
          >
              <Plus size={14} />
          </button>
      </div>
    );
};

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    element, onUpdate, onDelete, onMoveUp, onMoveDown,
    ticketWidth, setTicketWidth, ticketHeight, setTicketHeight, 
    previewOverlayScale, setPreviewOverlayScale,
    variables, setVariables
}) => {
  
  // Common style for dark inputs
  const inputStyle = "w-full p-2 bg-slate-800 text-white border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500";
  const labelStyle = "text-xs font-semibold uppercase text-slate-500";

  // If no element selected, show Global Settings
  if (!element) {
    return (
      <div className="p-4 space-y-6">
        <h3 className="font-bold text-lg text-slate-700 border-b pb-2">票券設定 (Settings)</h3>
        
        {/* Width Control */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500">票券寬度 (Width)</label>
            <div className="flex flex-col gap-2">
                <input 
                    type="range" 
                    min="100" 
                    max="400" 
                    value={ticketWidth} 
                    onChange={(e) => setTicketWidth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <Spinbox 
                    value={ticketWidth} 
                    onChange={setTicketWidth} 
                    min={100} 
                    max={400} 
                    suffix="px"
                />
            </div>
            <p className="text-xs text-slate-400">範圍: 100px - 400px (熱感紙常見寬度)</p>
        </div>

        {/* Height Control */}
         <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500">預覽最小高度 (Min Height)</label>
            <Spinbox 
                value={ticketHeight} 
                onChange={setTicketHeight} 
                min={400} 
                max={2000} 
                step={50}
                suffix="px"
            />
        </div>

        <div className="border-t pt-4 my-2">
            <h4 className="font-bold text-sm text-slate-700 mb-4">縮放設定 (Scaling)</h4>
            
            {/* Preview Overlay Scale Control (Visual Only) */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                    預覽疊加微調 (Preview Visual)
                    <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">僅視覺</span>
                </label>
                <div className="flex flex-col gap-2">
                    {/* Range slider removed as requested */}
                    <Spinbox 
                        value={previewOverlayScale} 
                        onChange={setPreviewOverlayScale} 
                        min={0.1} 
                        max={5.0} 
                        step={0.001}
                        suffix="x"
                    />
                </div>
                <p className="text-xs text-slate-400 leading-tight">
                    僅調整預覽畫面中 Overlay 的疊加距離，<br/>不會影響生成的程式碼。
                </p>
            </div>
        </div>

        {/* Variables Control */}
        <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-semibold text-slate-500">測試變數 (Test Variables)</label>
            <p className="text-xs text-slate-400 mb-2">輸入下方變數來預覽結果 (對應 {'{var}'})</p>
            
            <div className="grid gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">typename (品項)</label>
                    <input 
                        className={inputStyle}
                        value={variables['typename'] || ''}
                        onChange={(e) => setVariables({...variables, 'typename': e.target.value})}
                        placeholder="例如: 寶特瓶"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">num (數量)</label>
                    <input 
                        className={inputStyle}
                        value={variables['num'] || ''}
                        onChange={(e) => setVariables({...variables, 'num': e.target.value})}
                        placeholder="例如: 10"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">date (日期)</label>
                    <input 
                        className={inputStyle}
                        value={variables['date'] || ''}
                        onChange={(e) => setVariables({...variables, 'date': e.target.value})}
                        placeholder="例如: 112/01/01"
                    />
                </div>
            </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
            請點擊左側列表或票券畫面中的元素進行編輯。
            <br/><br/>
            快捷鍵: 點選元素後按 <b>Backspace</b> 可刪除。
        </div>
      </div>
    );
  }

  // Calculate overlay state for Spacing elements
  const isSpacingElement = element.type === 'spacing';
  const isOverlayMode = isSpacingElement && (element.spacingHeight || 0) < 0;
  const spacingAbsValue = Math.abs(element.spacingHeight || 0);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-lg text-slate-700">編輯 {element.type === 'text' ? '文字' : element.type === 'image' ? '圖片' : '間距'}</h3>
        <div className="flex gap-1">
            <button onClick={() => onMoveUp(element.id)} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="上移">
                <ArrowUp size={16} />
            </button>
            <button onClick={() => onMoveDown(element.id)} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="下移">
                <ArrowDown size={16} />
            </button>
            <button onClick={() => onDelete(element.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="刪除">
                <Trash2 size={16} />
            </button>
        </div>
      </div>

      {/* Alignment Controls */}
      {element.type !== 'spacing' && (
        <div className="space-y-2">
          <label className={labelStyle}>對齊 (Align)</label>
          <div className="flex bg-slate-200 rounded p-1 w-full justify-between">
            <button
              onClick={() => onUpdate(element.id, { align: 'left' })}
              className={`flex-1 flex justify-center py-2 rounded ${element.align === 'left' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-300 text-slate-500'}`}
              title="靠左"
            >
              <AlignLeft size={18} />
            </button>
            <button
              onClick={() => onUpdate(element.id, { align: 'center' })}
              className={`flex-1 flex justify-center py-2 rounded ${element.align === 'center' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-300 text-slate-500'}`}
              title="置中"
            >
              <AlignCenter size={18} />
            </button>
            <button
              onClick={() => onUpdate(element.id, { align: 'right' })}
              className={`flex-1 flex justify-center py-2 rounded ${element.align === 'right' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-300 text-slate-500'}`}
              title="靠右"
            >
              <AlignRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Text Specific Controls */}
      {element.type === 'text' && (
        <>
          <div className="space-y-2">
            <label className={labelStyle}>樣式 (Style)</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate(element.id, { isBold: !element.isBold })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-all ${element.isBold ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                <Bold size={16} /> 粗體
              </button>
              <button
                onClick={() => onUpdate(element.id, { size: element.size === 'normal' ? 'large' : 'normal' })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-all ${element.size === 'large' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                <Type size={16} /> 放大(2x)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelStyle}>內容 (Content)</label>
            <textarea
              value={element.content}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              className={`${inputStyle} h-40 font-mono`}
              placeholder="輸入文字..."
            />
            <p className="text-xs text-slate-400">支援變數: {'{typename}'}, {'{num}'}, {'{date}'}</p>
          </div>
        </>
      )}

      {/* Spacing Controls */}
      {element.type === 'spacing' && (
        <div className="space-y-4">
          <label className={labelStyle}>高度 (Height)</label>
          
          {/* Mode Switcher */}
          <div className="flex bg-slate-200 rounded p-1 w-full justify-between gap-1">
                <button
                    onClick={() => {
                        // Switch to Feed (Positive)
                        const val = spacingAbsValue || 24;
                        onUpdate(element.id, { spacingHeight: val });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${
                        !isOverlayMode 
                        ? 'bg-white shadow text-blue-600 ring-1 ring-black/5' 
                        : 'text-slate-500 hover:bg-slate-300'
                    }`}
                >
                    <ArrowDownFromLine size={14} /> 向下間距 (Feed)
                </button>
                <button
                    onClick={() => {
                        // Switch to Overlay (Negative)
                        const val = spacingAbsValue || 170;
                        onUpdate(element.id, { spacingHeight: -val });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${
                        isOverlayMode 
                        ? 'bg-red-50 shadow text-red-600 ring-1 ring-red-200' 
                        : 'text-slate-500 hover:bg-slate-300'
                    }`}
                >
                    <Layers size={14} /> 向上疊加 (Overlay)
                </button>
            </div>

          <div className="space-y-2">
             <label className={labelStyle}>
                 {isOverlayMode ? '重疊距離 (Overlay Distance)' : '間距高度 (Spacing Height)'}
             </label>
             <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${isOverlayMode ? 'text-red-400' : 'text-slate-400'}`}>
                    {isOverlayMode ? <Layers size={16} /> : <ChevronsUp size={16} />}
                </div>
                
                <Spinbox 
                    value={spacingAbsValue} 
                    onChange={(val) => {
                        onUpdate(element.id, { spacingHeight: isOverlayMode ? -val : val });
                    }} 
                    min={0} 
                    max={1000} 
                    suffix="dots"
                />
             </div>
             
             {isOverlayMode ? (
                 <p className="text-xs text-red-400 bg-red-50 p-2 rounded border border-red-100 mt-2">
                     <b>C# 指令:</b> BinaryOut(0x1B, 0x4B, {Math.round(spacingAbsValue)});<br/>
                     將下方元素向上拉升 {spacingAbsValue} 單位
                 </p>
             ) : (
                 <p className="text-xs text-slate-400 mt-2">
                     <b>C# 指令:</b> BinaryOut(0x1B, 0x4A, {spacingAbsValue});<br/>
                     標準空白跳行距離。
                 </p>
             )}
          </div>
        </div>
      )}

      {/* Image Controls */}
      {element.type === 'image' && (
        <div className="space-y-5">
             <div className="space-y-2">
                <label className={labelStyle}>C# 檔案名稱 (Variable Name)</label>
                <input
                    type="text"
                    value={element.variableName || "image.bin"}
                    onChange={(e) => onUpdate(element.id, { variableName: e.target.value })}
                    className={inputStyle}
                    placeholder="example.bin"
                />
                <p className="text-[10px] text-slate-400">
                    此名稱僅用於 C# 程式碼生成 (File.ReadAllBytes)。
                </p>
            </div>

            {/* Image Preview & Status - New Section */}
            <div className="bg-slate-100 p-3 rounded border border-slate-200 shadow-inner">
                <label className="text-xs font-bold text-slate-500 block mb-2 flex items-center justify-between">
                    <span>圖片資料 (Image Data)</span>
                    {element.content ? (
                        <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> 已嵌入
                        </span>
                    ) : (
                        <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle size={10} /> 空資料
                        </span>
                    )}
                </label>
                
                {element.content ? (
                    <div className="space-y-2">
                        <div className="bg-white/50 border border-slate-300 p-2 flex items-center justify-center rounded overflow-hidden">
                            <img 
                                src={element.content} 
                                alt="Stored Data" 
                                className="max-h-32 max-w-full object-contain" 
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                           <span className="text-[10px] text-slate-400">
                              Size: {(element.content.length / 1024).toFixed(1)} KB
                           </span>
                        </div>
                        <p className="text-[10px] text-green-700 bg-green-50 p-2 rounded border border-green-100 leading-tight">
                            此圖片已嵌入專案中。儲存專案 (.json) 時將會一併儲存此圖片。
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-300 rounded bg-white/50">
                        <ImageIcon size={24} className="mx-auto mb-2 opacity-30" />
                        <span className="font-semibold">尚無圖片數據</span>
                        <br/>
                        <span className="text-[10px] opacity-70 block mt-1">
                            從下方載入圖片以嵌入專案
                        </span>
                    </div>
                )}
            </div>
            
            {/* Upload Button */}
             <div className="space-y-2">
                <label className={labelStyle}>載入/更換圖片 (Load Image)</label>
                <label className="flex flex-col items-center justify-center w-full h-12 border-2 border-slate-300 border-dashed rounded cursor-pointer bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-colors group">
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-blue-600">
                        <ImageIcon size={18} />
                        <span className="text-sm font-medium">選擇圖片檔案...</span>
                    </div>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    onUpdate(element.id, { content: ev.target?.result as string });
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="hidden"
                    />
                </label>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
