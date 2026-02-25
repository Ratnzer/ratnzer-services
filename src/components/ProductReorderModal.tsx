import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '../types';
import { GripVertical, Save, X } from 'lucide-react';

interface SortableProductItemProps {
  product: Product;
  index: number;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ product, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#242636] p-4 rounded-xl flex items-center gap-3 border border-gray-700 hover:border-gray-500 transition-all touch-none ${
        isDragging ? 'shadow-lg shadow-yellow-400/50 border-yellow-400 z-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-2 bg-[#13141f] rounded-lg text-gray-400 hover:text-yellow-400 cursor-grab active:cursor-grabbing transition-colors"
        title="اسحب لتغيير الترتيب"
      >
        <GripVertical size={20} />
      </button>

      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${product.imageColor} flex-shrink-0 relative overflow-hidden`}>
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-white truncate">{product.name}</h4>
        <p className="text-[10px] text-gray-400">{product.category}</p>
      </div>

      <div className="text-right">
        <span className="text-xs font-mono font-bold text-yellow-400">${product.price}</span>
        <p className="text-[10px] text-gray-500">#{index + 1}</p>
      </div>
    </div>
  );
};

interface ProductReorderModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onSave: (reorderedProducts: Product[]) => void;
  isSaving?: boolean;
}

export const ProductReorderModal: React.FC<ProductReorderModalProps> = ({
  isOpen,
  products,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [items, setItems] = useState<Product[]>(products);

  useEffect(() => {
    setItems(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);

        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    onSave(items);
  };

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-20 text-gray-500">لا توجد منتجات لترتيبها</div>
              ) : (
                items.map((product, index) => (
                  <SortableProductItem
                    key={product.id}
                    product={product}
                    index={index}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-6 border-t border-gray-700 bg-[#242636]">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || items.length === 0}
          className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
        </button>
      </div>
    </div>
  );

  // If used in Admin tab, don't show as modal
  // Determine if we are in modal or tab mode based on props
  const isTabMode = true; 

  if (isTabMode) {
    return <div className="h-[calc(100vh-280px)] min-h-[500px]">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1a1c2b] rounded-3xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-[#242636]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GripVertical size={24} className="text-yellow-400" />
            ترتيب المنتجات
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};
