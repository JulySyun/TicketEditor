import React from 'react';
import { TicketElement } from '../types';
import { AlignLeft, AlignCenter, AlignRight, Bold, Type, ChevronsUp, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface EditorPanelProps {
  element: TicketElement | null;
  onUpdate: (id: string, updates: Partial<TicketElement>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  
  // Global Settings props
  ticketWidth: number;
  setTicketWidth: (w: number) => void;
  variables: Record<string, string>;
  setVariables: (v: Record<string, string>) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    element, onUpdate, onDelete, onMoveUp, onMoveDown,
    ticketWidth, setTicketWidth, variables, setVariables
}) => {
  
  // If no element selected, show Global Settings
  if (!element) {
    return (
      <div className="p-4 space-y-6">
        <h3 className="font-bold text-lg text-slate-700 border-b pb-2">票券設定 (Settings)</h3>
        
        {/* Width Control */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500">票券寬度 (Width)</label>
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="300" 
                    max="800" 
                    value={ticketWidth} 
                    onChange={(e) => setTicketWidth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{ticketWidth}px</span>
            </div>
            <p className="text-xs text-slate-400">標準 80mm 熱感應紙約 576 dots</p>
        </div>

        {/* Variables Control */}
        <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-semibold text-slate-500">測試變數 (Test Variables)</label>
            <p className="text-xs text-slate-400 mb-2">輸入下方變數來預覽結果 (對應 {'{var}'})</p>
            
            <div className="grid gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">typename (品項)</label>
                    <input 
                        className="border rounded p-1 text-sm"
                        value={variables['typename'] || ''}
                        onChange={(e) => setVariables({...variables, 'typename': e.target.value})}
                        placeholder="例如: 寶特瓶"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">num (數量)</label>
                    <input 
                        className="border rounded p-1 text-sm"
                        value={variables['num'] || ''}
                        onChange={(e) => setVariables({...variables, 'num': e.target.value})}
                        placeholder="例如: 10"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-blue-600">date (日期)</label>
                    <input 
                        className="border rounded p-1 text-sm"
                        value={variables['date'] || ''}
                        onChange={(e) => setVariables({...variables, 'date': e.target.value})}
                        placeholder="例如: 112/01/01"
                    />
                </div>
            </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
            請點擊左側票券畫面中的元素進行編輯。
        </div>
      </div>
    );
  }

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
          <label className="text-xs font-semibold uppercase text-slate-500">對齊 (Align)</label>
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
            <label className="text-xs font-semibold uppercase text-slate-500">樣式 (Style)</label>
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
            <label className="text-xs font-semibold uppercase text-slate-500">內容 (Content)</label>
            <textarea
              value={element.content}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              className="w-full h-40 p-3 border border-slate-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="輸入文字..."
            />
            <p className="text-xs text-slate-400">支援變數: {'{typename}'}, {'{num}'}, {'{date}'}</p>
          </div>
        </>
      )}

      {/* Spacing Controls */}
      {element.type === 'spacing' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-slate-500">高度 dots (Height)</label>
          <div className="flex items-center gap-2">
             <ChevronsUp className="text-slate-400" />
             <input
                type="number"
                value={element.spacingHeight || 12}
                onChange={(e) => onUpdate(element.id, { spacingHeight: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
             />
          </div>
        </div>
      )}

      {/* Image Controls */}
      {element.type === 'image' && (
        <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">C# 檔案名稱 (File Name)</label>
                <input
                    type="text"
                    value={element.variableName || "image.bin"}
                    onChange={(e) => onUpdate(element.id, { variableName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="example.bin"
                />
            </div>
            {/* Re-upload */}
             <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">更換圖片 (Change Image)</label>
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
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;