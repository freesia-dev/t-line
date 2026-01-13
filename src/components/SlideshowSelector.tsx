import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMediaFiles, MediaFile } from '@/hooks/useMediaFiles';
import { Upload, Trash2, Image, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideshowSelectorProps {
  selectedImages: string[];
  onSelect: (images: string[]) => void;
}

const SlideshowSelector = ({ selectedImages, onSelect }: SlideshowSelectorProps) => {
  const { files, loading, uploading, uploadFile, deleteFile } = useMediaFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter only images
  const imageFiles = files.filter(f => f.file_type === 'image');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      onSelect(selectedImages.filter(img => img !== url));
    } else {
      onSelect([...selectedImages, url]);
    }
  };

  const removeFromSlideshow = (url: string) => {
    onSelect(selectedImages.filter(img => img !== url));
  };

  return (
    <div className="space-y-4">
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Gambar Terpilih ({selectedImages.length})</p>
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((url, idx) => (
              <div 
                key={idx} 
                className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-primary group"
              >
                <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">{idx + 1}</span>
                </div>
                <button
                  onClick={() => removeFromSlideshow(url)}
                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
          size="sm"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? 'Mengupload...' : 'Upload Gambar'}
        </Button>
      </div>

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : imageFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada gambar yang diupload
        </p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {imageFiles.map((file) => {
            const isSelected = selectedImages.includes(file.file_url);
            const orderIndex = selectedImages.indexOf(file.file_url) + 1;
            
            return (
              <Card
                key={file.id}
                className={cn(
                  'relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => toggleImage(file.file_url)}
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {orderIndex}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Klik gambar untuk menambah/menghapus dari slideshow. Urutan sesuai waktu dipilih.
      </p>
    </div>
  );
};

export default SlideshowSelector;