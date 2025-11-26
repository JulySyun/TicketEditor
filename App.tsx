import React, { useState, useRef, useMemo } from 'react';
import { Save, FolderOpen, Code, FileText, Image as ImageIcon, Copy, ArrowDownToLine, MoveVertical } from 'lucide-react';
import TicketPreview from './components/TicketPreview';
import EditorPanel from './components/EditorPanel';
import { TicketElement, TicketProject, DEFAULT_WIDTH } from './types';
import { parseCSharp } from './utils/csharpParser';
import { generateCSharp } from './utils/csharpGenerator';

const INITIAL_ELEMENTS: TicketElement[] = [
    { id: '1', type: 'text', content: '北斗鎮公所\n活動兌換券', align: 'center', isBold: true, size: 'large' },
    { id: '2', type: 'spacing', content: '', align: 'left', isBold: false, size: 'normal', spacingHeight: 24 },
    { id: '3', type: 'text', content: '{typename}    {num}    個', align: 'left', isBold: true, size: 'large' },
    { id: '4', type: 'spacing', content: '', align: 'left', isBold: false, size: 'normal', spacingHeight: 24 },
    { id: '5', type: 'text', content: '回收日期:{date}', align: 'left', isBold: false, size: 'normal' },
    { id: '6', type: 'text', content: '彰化縣環境保護局 廣告', align: 'center', isBold: false, size: 'normal' },
];

const INITIAL_VARIABLES = {
    'typename': '寶特瓶',
    'num': '5',
    'date': '112/11/10'
};

function App() {
  const [elements, setElements] = useState<TicketElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketWidth, setTicketWidth] = useState<number>(DEFAULT_WIDTH);
  const [projectName, setProjectName] = useState<string>("TicketProject");
  const [variables, setVariables] = useState<Record<string, string>>(INITIAL_VARIABLES);
  
  // Modal for Paste C#
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [importCode, setImportCode] = useState("");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Computed C# Code for Right Panel
  const generatedCode = useMemo(() => generateCSharp(elements), [elements]);

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
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    
    if (type === 'image' && imageInputRef.current) {
        imageInputRef.current.click();
    }
  };

  const handleUpdate = (id: string, updates: Partial<TicketElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleDelete = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
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
    setSelectedId(id); // Keep focus
  };

  // --- Project Management ---

  const saveProject = () => {
    const project: TicketProject = {
        name: projectName,
        width: ticketWidth,
        elements,
        variables
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const project = JSON.parse(ev.target?.result as string) as TicketProject;
            if (project.elements) {
                setElements(project.elements);
                setTicketWidth(project.width || DEFAULT_WIDTH);
                setProjectName(project.name || "LoadedTicket");
                if (project.variables) setVariables(project.variables);
                setSelectedId(null);
            }
        } catch (err) {
            alert("無效的專案檔案 (Invalid project file)");
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
             if (el && el.type === 'image' && el.content === '') {
                 handleUpdate(selectedId, { content: ev.target?.result as string });
                 return;
             }
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  // --- Code Logic ---

  const handleImport = () => {
      const newElements = parseCSharp(importCode);
      if (newElements.length > 0) {
          setElements(newElements);
          setShowLoadModal(false);
          setImportCode("");
          setSelectedId(null);
      } else {
          alert("無法解析程式碼，請確認格式 (Could not parse).");
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedCode);
      // Optional toast here
      alert("已複製 C# 程式碼 (Copied)!");
  };

  const selectedElement = elements.find(el => el.id === selectedId) || null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* --- Top Bar --- */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md">T</div>
            <h1 className="font-bold text-slate-700 text-lg hidden sm:block tracking-tight">Thermal Ticket Sim</h1>
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
                <Save size={16} /> <span className="hidden sm:inline">儲存專案</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm">
                <FolderOpen size={16} /> <span className="hidden sm:inline">載入專案</span>
            </button>
            <button onClick={() => setShowLoadModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors shadow-sm">
                <ArrowDownToLine size={16} /> <span className="hidden sm:inline">載入 C#</span>
            </button>
         </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={loadProject} accept=".json" className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* --- Main Workspace (4 Columns) --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Col 1: Toolbox */}
        <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-4 shrink-0 z-20 shadow-sm">
           <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">工具箱</div>
           <ToolButton icon={<FileText size={24}/>} label="文字" onClick={() => addElement('text')} />
           <ToolButton icon={<ImageIcon size={24}/>} label="圖片" onClick={() => addElement('image')} />
           <ToolButton icon={<MoveVertical size={24}/>} label="間距" onClick={() => addElement('spacing')} />
        </div>

        {/* Col 2: Preview Area */}
        <div className="flex-1 bg-slate-100 relative flex flex-col min-w-[300px]" onClick={() => setSelectedId(null)}>
             <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center pointer-events-none z-10">
                 <span className="bg-slate-800/80 text-white text-xs px-2 py-1 rounded backdrop-blur">即時預覽 (Preview)</span>
             </div>
             <TicketPreview 
                elements={elements} 
                width={ticketWidth} 
                onElementSelect={setSelectedId}
                selectedId={selectedId}
                variables={variables}
            />
        </div>

        {/* Col 3: Properties Panel */}
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
                variables={variables}
                setVariables={setVariables}
            />
        </div>

        {/* Col 4: Code View */}
        <div className="w-96 bg-slate-900 text-slate-300 flex flex-col shrink-0">
             <div className="h-10 flex items-center justify-between px-4 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Code size={14} /> 即時程式碼 (C#)
                </span>
                <button onClick={copyToClipboard} className="text-xs hover:text-white transition-colors" title="複製">
                    <Copy size={14} />
                </button>
             </div>
             <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                 <pre>{generatedCode}</pre>
             </div>
        </div>
      </div>

      {/* --- Load C# Modal --- */}
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