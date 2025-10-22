/**
 * Field Overlay Component
 * Overlay per posizionare e ridimensionare campi su PDF
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Move } from 'lucide-react';

export interface Field {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'signature';
  dataKey: string;
  pdfFieldName?: string;
  page: number;
  x: number; // Coordinate normalizzate 0-1
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

interface FieldOverlayProps {
  fields: Field[];
  currentPage: number;
  pdfWidth: number;
  pdfHeight: number;
  onFieldsChange: (fields: Field[]) => void;
  onFieldSelect?: (field: Field | null) => void;
  selectedField?: Field | null;
  previewData?: Record<string, any>;
}

export function FieldOverlay({
  fields,
  currentPage,
  pdfWidth,
  pdfHeight,
  onFieldsChange,
  onFieldSelect,
  selectedField,
  previewData
}: FieldOverlayProps) {
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [resizingField, setResizingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const pageFields = fields.filter(f => f.page === currentPage - 1);

  const handleMouseDown = (e: React.MouseEvent, field: Field) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDraggedField(field.id);
    onFieldSelect?.(field);
    
    // Calcola offset dal punto di click rispetto all'angolo del campo
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, field: Field) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizingField(field.id);
    onFieldSelect?.(field);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Handle dragging
    if (draggedField) {
      const field = fields.find(f => f.id === draggedField);
      if (!field) return;

      // Posizione del mouse relativa al container
      const mouseX = e.clientX - rect.left - dragOffset.x;
      const mouseY = e.clientY - rect.top - dragOffset.y;
      
      // Converti in coordinate normalizzate (0-1)
      const normalizedX = Math.max(0, Math.min(1 - field.width, mouseX / pdfWidth));
      const normalizedY = Math.max(0, Math.min(1 - field.height, mouseY / pdfHeight));
      
      onFieldsChange(
        fields.map(f =>
          f.id === draggedField
            ? { ...f, x: normalizedX, y: normalizedY }
            : f
        )
      );
    }

    // Handle resizing
    if (resizingField) {
      const field = fields.find(f => f.id === resizingField);
      if (!field) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const fieldLeft = field.x * pdfWidth;
      const fieldTop = field.y * pdfHeight;
      
      // Calcola nuova larghezza e altezza dalla posizione del mouse
      const newWidth = mouseX - fieldLeft;
      const newHeight = mouseY - fieldTop;
      
      // Applica limiti: minimo 30px, massimo fino al bordo del PDF
      const minWidth = 30;
      const minHeight = 20;
      const maxWidth = pdfWidth - fieldLeft;
      const maxHeight = pdfHeight - fieldTop;
      
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      
      const normalizedWidth = clampedWidth / pdfWidth;
      const normalizedHeight = clampedHeight / pdfHeight;
      
      onFieldsChange(
        fields.map(f =>
          f.id === resizingField
            ? { ...f, width: normalizedWidth, height: normalizedHeight }
            : f
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggedField(null);
    setResizingField(null);
  };

  const handleDeleteField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onFieldsChange(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      onFieldSelect?.(null);
    }
  };

  const getFieldColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-500/10 border-blue-500';
      case 'date': return 'bg-green-500/10 border-green-500';
      case 'checkbox': return 'bg-yellow-500/10 border-yellow-500';
      case 'signature': return 'bg-purple-500/10 border-purple-500';
      default: return 'bg-gray-500/10 border-gray-500';
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggedField || resizingField) {
        setDraggedField(null);
        setResizingField(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggedField, resizingField]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ width: pdfWidth, height: pdfHeight }}
    >
      {pageFields.map((field) => {
        const left = field.x * pdfWidth;
        const top = field.y * pdfHeight;
        const width = field.width * pdfWidth;
        const height = field.height * pdfHeight;
        const isSelected = selectedField?.id === field.id;
        const isDragging = draggedField === field.id;

        return (
          <div
            key={field.id}
            className={`absolute pointer-events-auto transition-shadow ${
              isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'
            } ${getFieldColor(field.type)} border-2 ${
              isSelected ? 'ring-4 ring-blue-400/50' : ''
            }`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
            onMouseDown={(e) => handleMouseDown(e, field)}
          >
            {/* Field Label */}
            <div className="absolute -top-7 left-0 text-xs font-semibold px-2 py-1 bg-slate-800 text-white rounded-t whitespace-nowrap flex items-center gap-1 shadow-lg">
              <Move size={12} />
              {field.dataKey}
            </div>

            {/* Preview Data */}
            {previewData && previewData[field.dataKey] && (
              <div 
                className="w-full h-full flex items-center px-2 text-sm font-medium"
                style={{
                  justifyContent: field.align || 'left',
                  fontSize: field.fontSize ? `${field.fontSize}px` : undefined
                }}
              >
                {field.type === 'checkbox' 
                  ? (previewData[field.dataKey] ? '✓' : '')
                  : String(previewData[field.dataKey])}
              </div>
            )}

            {/* Delete Button */}
            {isSelected && (
              <button
                onClick={(e) => handleDeleteField(field.id, e)}
                className="absolute -top-7 -right-0 p-1 bg-red-600 text-white rounded-tr hover:bg-red-700 shadow-lg"
              >
                <X size={14} />
              </button>
            )}

            {/* Type Badge */}
            <div className="absolute bottom-0 left-0 text-xs px-1 py-0.5 bg-slate-800 text-white rounded-br opacity-75">
              {field.type}
            </div>

            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-blue-600 hover:bg-blue-700 transition-colors"
              style={{
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, field)}
              title="Trascina per ridimensionare"
            />
          </div>
        );
      })}
    </div>
  );
}
