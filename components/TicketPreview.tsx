import React from 'react';
import { TicketElement } from '../types';

interface TicketPreviewProps {
  elements: TicketElement[];
  width: number;
  onElementSelect: (id: string) => void;
  selectedId: string | null;
  variables: Record<string, string>;
}

const TicketPreview: React.FC<TicketPreviewProps> = ({ elements, width, onElementSelect, selectedId, variables }) => {
  
  const processContent = (content: string) => {
    let processed = content;
    // Replace {key} with value from variables
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processed = processed.replace(regex, value);
    });
    // Fallback for un-replaced variables for cleaner UI? Or leave them? 
    // Leaving them is better so user knows they are variables.
    return processed;
  };

  return (
    <div className="flex justify-center p-8 bg-slate-300 overflow-y-auto h-full shadow-inner">
      <div 
        className="bg-white shadow-2xl relative transition-all duration-300"
        style={{ width: `${width}px`, minHeight: '600px', paddingBottom: '40px' }} 
      >
        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          
          let contentNode = null;
          if (el.type === 'spacing') {
             contentNode = <div style={{ height: `${el.spacingHeight}px` }} className="w-full" />;
          } else if (el.type === 'image') {
             contentNode = (
               <div className="w-full flex" style={{ justifyContent: el.align }}>
                 {el.content ? (
                   <img src={el.content} alt="ticket graphic" className="max-w-full grayscale contrast-125 block" />
                 ) : (
                   <div className="border-2 border-dashed border-gray-400 p-4 text-xs text-gray-500 bg-gray-50 text-center w-32 h-32 flex items-center justify-center">
                      {el.variableName || "No Image"}
                   </div>
                 )}
               </div>
             );
          } else {
            // Text
            contentNode = (
              <div 
                className={`w-full whitespace-pre-wrap break-words ticket-font leading-none`}
                style={{ 
                    textAlign: el.align,
                    fontWeight: el.isBold ? 'bold' : 'normal',
                    fontSize: el.size === 'large' ? '24px' : '16px', // Standard thermal often 24px width for normal kanji
                    lineHeight: el.size === 'large' ? '1.2' : '1.5'
                }}
              >
                {processContent(el.content)}
              </div>
            );
          }

          return (
            <div 
              key={el.id}
              onClick={(e) => {
                  e.stopPropagation();
                  onElementSelect(el.id);
              }}
              className={`relative cursor-pointer hover:bg-blue-50/50 border-2 ${isSelected ? 'border-blue-500 z-10' : 'border-transparent'}`}
            >
              {contentNode}
            </div>
          );
        })}
        
        {/* Paper Tear Effect at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-3 bg-slate-300" style={{
            clipPath: 'polygon(0% 0%, 2% 100%, 4% 0%, 6% 100%, 8% 0%, 10% 100%, 12% 0%, 14% 100%, 16% 0%, 18% 100%, 20% 0%, 22% 100%, 24% 0%, 26% 100%, 28% 0%, 30% 100%, 32% 0%, 34% 100%, 36% 0%, 38% 100%, 40% 0%, 42% 100%, 44% 0%, 46% 100%, 48% 0%, 50% 100%, 52% 0%, 54% 100%, 56% 0%, 58% 100%, 60% 0%, 62% 100%, 64% 0%, 66% 100%, 68% 0%, 70% 100%, 72% 0%, 74% 100%, 76% 0%, 78% 100%, 80% 0%, 82% 100%, 84% 0%, 86% 100%, 88% 0%, 90% 100%, 92% 0%, 94% 100%, 96% 0%, 98% 100%, 100% 0%)'
        }}></div>
      </div>
    </div>
  );
};

export default TicketPreview;