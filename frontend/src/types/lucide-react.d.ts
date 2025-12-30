declare module 'lucide-react' {
  import type * as React from 'react';

  export type LucideProps = React.SVGProps<SVGSVGElement> & {
    color?: string;
    size?: string | number;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  // This project installs dependencies inside Docker, so local type resolution may not see node_modules.
  // Provide minimal typings for the icons we use in the source tree.
  export const RotateCcw: React.FC<LucideProps>;
  export const Settings: React.FC<LucideProps>;
  export const ChevronUp: React.FC<LucideProps>;
  export const ChevronDown: React.FC<LucideProps>;
  export const Trophy: React.FC<LucideProps>;
  export const Zap: React.FC<LucideProps>;
  export const Sparkle: React.FC<LucideProps>;
  export const ScrollText: React.FC<LucideProps>;
  export const Clock: React.FC<LucideProps>;
  export const Flame: React.FC<LucideProps>;
  export const Lock: React.FC<LucideProps>;
  export const Moon: React.FC<LucideProps>;
}


