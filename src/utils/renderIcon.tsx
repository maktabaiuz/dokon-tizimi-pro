import * as Icons from 'lucide-react';

export default function renderIcon(iconName: string, className: string = 'w-4 h-4') {
  const LucideIcon = (Icons as any)[iconName] || Icons.Box;
  return <LucideIcon className={className} />;
}
