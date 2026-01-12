import { cn } from '@/lib/utils';

interface LayoutPreviewProps {
  layout: 'layout1' | 'layout2' | 'layout3' | 'layout4';
  isSelected: boolean;
  onClick: () => void;
}

const LayoutPreview = ({ layout, isSelected, onClick }: LayoutPreviewProps) => {
  const layouts = {
    layout1: {
      name: 'Klasik',
      description: 'Antrian di kiri, media di kanan',
      preview: (
        <div className="flex h-full gap-1">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 bg-emerald-500/50 rounded text-[6px] flex items-center justify-center">TELLER</div>
            <div className="flex-1 bg-blue-500/50 rounded text-[6px] flex items-center justify-center">CS</div>
          </div>
          <div className="w-1/2 bg-purple-500/30 rounded text-[6px] flex items-center justify-center">MEDIA</div>
        </div>
      ),
    },
    layout2: {
      name: 'Fokus Antrian',
      description: 'Antrian besar di tengah, media di bawah',
      preview: (
        <div className="flex flex-col h-full gap-1">
          <div className="flex-1 flex gap-1">
            <div className="flex-1 bg-emerald-500/50 rounded text-[6px] flex items-center justify-center">TELLER</div>
            <div className="flex-1 bg-blue-500/50 rounded text-[6px] flex items-center justify-center">CS</div>
          </div>
          <div className="h-1/3 bg-purple-500/30 rounded text-[6px] flex items-center justify-center">MEDIA</div>
        </div>
      ),
    },
    layout3: {
      name: 'Media Utama',
      description: 'Media besar di kiri, antrian di kanan',
      preview: (
        <div className="flex h-full gap-1">
          <div className="w-1/2 bg-purple-500/30 rounded text-[6px] flex items-center justify-center">MEDIA</div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 bg-emerald-500/50 rounded text-[6px] flex items-center justify-center">TELLER</div>
            <div className="flex-1 bg-blue-500/50 rounded text-[6px] flex items-center justify-center">CS</div>
          </div>
        </div>
      ),
    },
    layout4: {
      name: 'Fullscreen Antrian',
      description: 'Hanya tampilkan antrian (tanpa media)',
      preview: (
        <div className="flex h-full gap-1">
          <div className="flex-1 bg-emerald-500/50 rounded text-[6px] flex items-center justify-center">TELLER</div>
          <div className="flex-1 bg-blue-500/50 rounded text-[6px] flex items-center justify-center">CS</div>
        </div>
      ),
    },
  };

  const currentLayout = layouts[layout];

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 transition-all text-left',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-muted hover:border-primary/50'
      )}
    >
      <div className="h-16 bg-slate-800 rounded-lg p-1 mb-2">
        {currentLayout.preview}
      </div>
      <p className="font-medium text-sm">{currentLayout.name}</p>
      <p className="text-xs text-muted-foreground">{currentLayout.description}</p>
    </button>
  );
};

export default LayoutPreview;
