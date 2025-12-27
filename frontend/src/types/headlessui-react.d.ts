declare module '@headlessui/react' {
  import type * as React from 'react';

  export type DialogProps = {
    open: boolean;
    onClose: (value: boolean) => void;
    className?: string;
    children?: React.ReactNode;
  };

  export const Dialog: React.FC<DialogProps> & {
    Panel: React.FC<any>;
    Title: React.FC<any>;
  };
}


