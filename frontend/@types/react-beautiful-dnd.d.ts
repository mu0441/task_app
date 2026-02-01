declare module 'react-beautiful-dnd' {
  export interface DropResult {
    source: {
      droppableId: string;
      index: number;
    };
    destination?: {
      droppableId: string;
      index: number;
    };
    destination?: {
      droppableId: string;
      index: number;
    };
    draggableId: string;
    type: string;
    reason: 'DROP' | 'CANCEL';
  }

  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => void;
    droppableProps: Record<string, any>;
    placeholder?: React.ReactNode;
  }

  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith?: string;
    isUsingPlaceholder: boolean;
  }

  export interface DraggableProvided {
    innerRef: (element: HTMLElement | null) => void;
    draggableProps: Record<string, any>;
    dragHandleProps?: Record<string, any>;
  }

  export interface DraggableStateSnapshot {
    isDragging: boolean;
    draggingOver?: string;
    isClone: boolean;
  }

  export type DragDropContextProps = {
    onDragEnd: (result: DropResult) => void;
    onDragStart?: (initial: any) => void;
    onDragUpdate?: (update: any) => void;
  };

  export const DragDropContext: React.ComponentType<any>;
  export const Droppable: React.ComponentType<any>;
  export const Draggable: React.ComponentType<any>;
}
