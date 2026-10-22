'use client';

import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ value, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => internalRef.current!, []);

  // Ajusta a altura com base no conteúdo
  React.useLayoutEffect(() => {
    const textarea = internalRef.current;
    if (textarea) {
      // Reseta a altura para recalcular o scrollHeight
      textarea.style.height = 'auto'; 
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = internalRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    onChange?.(e);
  };

  return (
    <Textarea
      ref={internalRef}
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
