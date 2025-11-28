
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Save, FolderOpen, Code, FileText, Image as ImageIcon, Copy, ArrowDownToLine, MoveVertical, Printer } from 'lucide-react';
import TicketPreview from './components/TicketPreview';
import EditorPanel from './components/EditorPanel';
import { TicketElement, TicketProject, DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_PREVIEW_OVERLAY_SCALE } from './types';
import { parseCSharp } from './utils/csharpParser';
import { generateCSharp, CodeLine } from './utils/csharpGenerator';
import JSZip from 'jszip';

// 1. Initial Elements
const INITIAL_ELEMENTS: TicketElement[] = [];

const INITIAL_VARIABLES = {
    'typename': '寶特瓶',
    'num': '5',
    'date': '112/11/10'
};

function App() {
  const [elements, setElements] = useState<TicketElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Dimensions and Scale state
  const [ticketWidth, setTicketWidth] = useState<number>(DEFAULT_WIDTH);
  const [ticketHeight, setTicketHeight] = useState<number>(DEFAULT_HEIGHT);
  const [previewOverlayScale, setPreviewOverlayScale] = useState<number>(DEFAULT_PREVIEW_OVERLAY_SCALE);

  const [projectName, setProjectName] = useState<string>("TicketProject");
  const [variables, setVariables] = useState<Record<string, string>>(INITIAL_VARIABLES);
  
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [importCode, setImportCode] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Computed C# Code Lines (Structured)
  const generatedCodeLines: CodeLine[] = useMemo(() => generateCSharp(elements), [elements]);

  // Join lines for clipboard copy
  const fullCodeString = generatedCodeLines.map(l => l.text).join('\n');

  // --- Auto-scroll to highlighted code ---
  useEffect(() => {
    if (selectedId && codeContainerRef.current) {
        // Find the highlighted element in the code view
        const highlighted = codeContainerRef.current.querySelector('[data-highlighted="true"]');
        if (highlighted) {
            highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [selectedId]);

  // --- Actions ---

  const addElement = (type: 'text' | 'image' | 'spacing') => {
    const newEl: TicketElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? '新文字項目' : '',
      align: 'left',
      isBold: false,
      size: 'normal',
      spacingHeight: type === 'spacing' ? 24 : undefined,
      variableName: type === 'image' ? 'logo.bin' : undefined
    };

    if (selectedId) {
        const index = elements.findIndex(el => el.id === selectedId);
        if (index !== -1) {
            const newElements = [...elements];
            newElements.splice(index + 1, 0, newEl);
            setElements(newElements);
        } else {
            setElements([...elements, newEl]);
        }
    } else {
        setElements([...elements, newEl]);
    }
    
    setSelectedId(newEl.id);
    
    if (type === 'image' && imageInputRef.current) {
        setTimeout(() => imageInputRef.current?.click(), 0);
    }
  };

  const handleUpdate = (id: string, updates: Partial<TicketElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleDelete = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;
    
    const newElements = [...elements];
    if (direction === 'up' && index > 0) {
        [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
    } else if (direction === 'down' && index < elements.length - 1) {
        [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    }
    setElements(newElements);
    setSelectedId(id);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && selectedId) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        const isInput = activeTag === 'input' || activeTag === 'textarea';
        if (!isInput) {
          handleDelete(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  // --- Project Management (Hybrid Strategy) ---

  const base64ToBlob = (base64: string): { blob: Blob, ext: string } | null => {
      const matches = base64.match(/^data:image\/([a-zA-Z0-9.\-+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return null;

      const subtype = matches[1].toLowerCase();
      const data = matches[2];

      try {
          const binStr = atob(data);
          const len = binStr.length;
          const arr = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              arr[i] = binStr.charCodeAt(i);
          }
          
          const blob = new Blob([arr], { type: `image/${subtype}` });
          
          let ext = 'bin';
          if (subtype === 'jpeg' || subtype === 'jpg') ext = 'jpg';
          else if (subtype === 'png') ext = 'png';
          else if (subtype === 'bmp' || subtype === 'x-ms-bmp') ext = 'bmp';
          else if (subtype === 'gif') ext = 'gif';

          return { blob, ext };
      } catch (e) {
          console.error("Base64 decode error", e);
          return null;
      }
  };

  const saveProject = async () => {
    // 1. Prepare Data
    const project: TicketProject = {
        name: projectName,
        width: ticketWidth,
        height: ticketHeight,
        previewOverlayScale: previewOverlayScale,
        elements,
        variables
    };
    
    const jsonString = JSON.stringify(project, null, 2);
    const jsonFileName = `${projectName || 'TicketProject'}.json`;
    const imageElements = elements.filter(el => el.type === 'image' && el.content && el.content.startsWith('data:image'));

    // --- Fallback Strategy (ZIP) ---
    const executeZipFallback = async (reason: string) => {
        try {
            const zip = new JSZip();
            // Add JSON
            zip.file(jsonFileName, jsonString);
            
            // Add Images to folder
            if (imageElements.length > 0) {
                const imgFolder = zip.folder("image");
                imageElements.forEach(el => {
                    const result = base64ToBlob(el.content);
                    if (result && imgFolder) {
                         let rawName = el.variableName || `img_${el.id}`;
                         rawName = rawName.split(/[\\/]/).pop() || `img_${el.id}`;
                         const baseName = rawName.replace(/\.[^/.]+$/, "");
                         const fileName = `${baseName}.${result.ext}`;
                         imgFolder.file(fileName, result.blob);
                    }
                });
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName || 'TicketProject'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`提示: ${reason}\n\n系統已自動改用 ZIP 格式打包專案與圖片下載。`);
        } catch (zipErr) {
            console.error("ZIP Fallback Error", zipErr);
            alert("儲存失敗，且 ZIP 備案也發生錯誤。");
        }
    };

    // --- Primary Strategy (File System Access API) ---
    // Check if API exists
    if (!('showDirectoryPicker' in window)) {
        await executeZipFallback("您的瀏覽器不支援直接資料夾存取 (Directory Access)。");
        return;
    }

    try {
        // Try to open folder picker
        const dirHandle = await (window as any).showDirectoryPicker({
            id: 'ticket-project-save',
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Write JSON
        const fileHandle = await dirHandle.getFileHandle(jsonFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        // Write Images
        if (imageElements.length > 0) {
            const imgDirHandle = await dirHandle.getDirectoryHandle('image', { create: true });
            
            for (const el of imageElements) {
                const result = base64ToBlob(el.content);
                if (result) {
                    let rawName = el.variableName || `img_${el.id}`;
                    rawName = rawName.split(/[\\/]/).pop() || `img_${el.id}`;
                    const baseName = rawName.replace(/\.[^/.]+$/, "");
                    const fileName = `${baseName}.${result.ext}`;
                    
                    const imgFileHandle = await imgDirHandle.getFileHandle(fileName, { create: true });
                    const imgWritable = await imgFileHandle.createWritable();
                    await imgWritable.write(result.blob);
                    await imgWritable.close();
                }
            }
        }

        alert(`專案儲存成功！\n位置: [已選資料夾]\n包含: ${jsonFileName} 及 image/ 資料夾`);

    } catch (err: any) {
        // User cancelled picker
        if (err.name === 'AbortError') return;

        console.error("Save Error:", err);

        // SecurityError usually means iframe restriction or non-HTTPS
        if (err.name === 'SecurityError' || err.message?.includes('Cross origin')) {
            await executeZipFallback("因瀏覽器安全性限制 (如在 iframe 或預覽視窗中)，無法直接存取硬碟資料夾。");
        } else {
            alert(`儲存發生錯誤: ${err.message}`);
        }
    }
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const jsonString = ev.target?.result as string;
            const project = JSON.parse(jsonString) as TicketProject;
            
            if (project.elements) {
                const sanitizedElements = project.elements.map(el => ({
                    ...el,
                    spacingHeight: el.type === 'spacing' 
                        ? (el.spacingHeight !== undefined ? el.spacingHeight : 24) 
                        : undefined
                }));

                setElements(sanitizedElements);
                setTicketWidth(project.width || DEFAULT_WIDTH);
                setTicketHeight(project.height || project.minHeight || DEFAULT_HEIGHT);
                setPreviewOverlayScale(project.previewOverlayScale || DEFAULT_PREVIEW_OVERLAY_SCALE);
                setProjectName(project.name || "LoadedTicket");
                if (project.variables) setVariables(project.variables);
                setSelectedId(null);
            } else {
                alert("無法識別的專案格式");
            }
        } catch (err) {
            console.error(err);
            alert("檔案讀取失敗或格式錯誤");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (selectedId) {
             const el = elements.find(e => e.id === selectedId);
             if (el && el.type === 'image') {
                 handleUpdate(selectedId, { content: ev.target?.result as string });
                 return;
             }
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleImport = () => {
      const newElements = parseCSharp(importCode);
      if (newElements.length > 0) {
          setElements(newElements);
          setShowLoadModal(false);
          setImportCode("");
          setSelectedId(null);
      } else {
          alert("無法解析程式碼");
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(fullCodeString);
      alert("已複製 C# 程式碼");
  };

  const selectedElement = elements.find(el => el.id === selectedId) || null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* Top Bar */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
         <div className="flex items-center gap-3">
				<div className="w-8 h-8 ... (保留或修改樣式)">
					<img src="iconlogo.ico" alt="Logo" className="w-full h-full object-contain" />
				</div>
            <h1 className="font-bold text-slate-700 text-lg hidden sm:block tracking-tight">CS Ticket Sim</h1>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center bg-slate-100 rounded-md px-2 py-1">
                <span className="text-xs text-slate-400 mr-2">專案名稱</span>
                <input 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 w-32 sm:w-48 placeholder-slate-400"
                    placeholder="未命名專案"
                />
            </div>
         </div>

         <div className="flex gap-2">
            <button onClick={saveProject} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm">
                <Save size={16} /> <span className="hidden sm:inline">儲存專案 (Save)</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm">
                <FolderOpen size={16} /> <span className="hidden sm:inline">載入專案 (Load)</span>
            </button>
            <button onClick={() => setShowLoadModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors shadow-sm">
                <ArrowDownToLine size={16} /> <span className="hidden sm:inline">載入 C#</span>
            </button>
         </div>
      </header>

      {/* Accept only .json */}
      <input type="file" ref={fileInputRef} onChange={loadProject} accept=".json" className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Col 1: Toolbox (Fixed width) */}
        <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-4 shrink-0 z-20 shadow-sm">
           <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">工具箱</div>
           <ToolButton icon={<FileText size={24}/>} label="文字" onClick={() => addElement('text')} />
           <ToolButton icon={<ImageIcon size={24}/>} label="圖片" onClick={() => addElement('image')} />
           <ToolButton icon={<MoveVertical size={24}/>} label="間距" onClick={() => addElement('spacing')} />
        </div>

        {/* Col 2: Preview Area */}
        <div className="w-[35%] bg-slate-200 relative flex flex-col z-0" onClick={() => setSelectedId(null)}>
             <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center pointer-events-none z-10">
                 <span className="bg-slate-800/80 text-white text-xs px-2 py-1 rounded backdrop-blur">即時預覽 (Preview)</span>
             </div>
             <TicketPreview 
                elements={elements} 
                width={ticketWidth} 
                minHeight={ticketHeight}
                previewOverlayScale={previewOverlayScale}
                onElementSelect={setSelectedId}
                selectedId={selectedId}
                variables={variables}
            />
        </div>

        {/* Col 3: Properties Panel (Fixed width) */}
        <div className="w-80 bg-white border-l border-r overflow-y-auto shrink-0 z-20 shadow-sm flex flex-col">
            <div className="p-3 bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase tracking-wider">
                {selectedId ? '元素屬性 (Properties)' : '全域設定 (Global Settings)'}
            </div>
            <EditorPanel 
                element={selectedElement} 
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onMoveUp={(id) => handleMove(id, 'up')}
                onMoveDown={(id) => handleMove(id, 'down')}
                ticketWidth={ticketWidth}
                setTicketWidth={setTicketWidth}
                ticketHeight={ticketHeight}
                setTicketHeight={setTicketHeight}
                previewOverlayScale={previewOverlayScale}
                setPreviewOverlayScale={setPreviewOverlayScale}
                variables={variables}
                setVariables={setVariables}
            />
        </div>

        {/* Col 4: Code View */}
        <div className="flex-1 bg-slate-900 text-slate-300 flex flex-col min-w-[400px]">
             <div className="h-10 flex items-center justify-between px-4 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Code size={14} /> 即時程式碼 (C#)
                </span>
                <button onClick={copyToClipboard} className="text-xs hover:text-white transition-colors" title="複製">
                    <Copy size={14} />
                </button>
             </div>
             <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed" ref={codeContainerRef}>
                 {generatedCodeLines.map((line, idx) => {
                     const isHighlighted = line.elementId === selectedId;
                     return (
                         <div 
                            key={idx} 
                            data-highlighted={isHighlighted}
                            className={`px-1 rounded transition-colors duration-200 ${
                                isHighlighted ? 'bg-yellow-500/20 border-l-2 border-yellow-500 text-yellow-100' : 'border-l-2 border-transparent hover:bg-slate-800'
                            }`}
                         >
                             {line.text}
                         </div>
                     );
                 })}
             </div>
        </div>
      </div>

      {/* Load C# Modal */}
      {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                      <h2 className="font-bold text-lg text-slate-700">載入 C# 程式碼</h2>
                      <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                  </div>
                  <div className="flex-1 p-0 relative">
                      <textarea 
                        className="w-full h-full p-4 font-mono text-sm bg-white resize-none focus:outline-none"
                        value={importCode}
                        onChange={(e) => setImportCode(e.target.value)}
                        placeholder="// 請在此貼上 BinaryOut(...) 程式碼..."
                      ></textarea>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-lg">
                      <button onClick={() => setShowLoadModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium">
                          取消
                      </button>
                      <button onClick={handleImport} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow-md transition-transform active:scale-95">
                          解析並載入
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const ToolButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl w-16 transition-all group">
        <div className="bg-slate-100 group-hover:bg-white p-2 rounded-lg shadow-sm group-hover:shadow text-slate-600 group-hover:text-blue-600 transition-all">
            {icon}
        </div>
        <span className="text-[11px] font-bold">{label}</span>
    </button>
);

export default App;
