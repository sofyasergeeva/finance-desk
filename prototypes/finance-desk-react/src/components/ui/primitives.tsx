import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { XIcon } from '@phosphor-icons/react';

export function Button({
  className = '',
  variant = 'default',
  ...props
}: React.ComponentProps<'button'> & {
  variant?: 'default' | 'primary' | 'mint' | 'ghost' | 'danger';
}) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props} />;
}
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({
  children,
  className = '',
  closeLabel = 'Закрыть',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={`dialog-content ${className}`} {...props}>
        {children}
        <DialogPrimitive.Close className="icon-button dialog-close" aria-label={closeLabel}>
          <XIcon size={20} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export const Tabs = TabsPrimitive.Root;
export function TabsList({
  className = '',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={`tabs-list ${className}`} {...props} />;
}
export function TabsTrigger({
  className = '',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={`tabs-trigger ${className}`} {...props} />;
}
export function TabsContent({
  className = '',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={`tabs-content ${className}`} {...props} />;
}
export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
export function CollapsibleContent({
  className = '',
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content className={`collapsible-content ${className}`} {...props} />;
}
