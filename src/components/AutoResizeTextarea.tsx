'use client';

import * as React from 'react';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ value, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

  // Ajusta a altura com base no conteúdo
  React.useLayoutEffect(() => {
    const textarea = combinedRef.current;
    if (textarea) {
      // Reseta a altura para recalcular o scrollHeight
      textarea.style.height = 'auto'; 
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, combinedRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = combinedRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Textarea
      ref={combinedRef}
      value={value}
      onChange={handleChange}
      rows={1} // Começa com uma linha
      className="overflow-hidden resize-none min-h-[40px] h-auto" // Garante que o CSS não interfira
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export { AutoResizeTextarea };
