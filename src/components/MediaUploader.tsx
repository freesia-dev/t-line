import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMediaFiles, MediaFile } from '@/hooks/useMediaFiles';
import { Upload, Trash2, Image, Video, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  selectedUrl: string;
  onSelect: (url: string, type: 'image' | 'video') => void;
}

const MediaUploader = ({ selectedUrl, onSelect }: MediaUploaderProps) => {
  const { files, loading, uploading, uploadFile, deleteFile } = useMediaFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? 'Mengupload...' : 'Upload Media'}
        </Button>
      </div>

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada file yang diupload
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {files.map((file) => (
            <MediaFileCard
              key={file.id}
              file={file}
              isSelected={selectedUrl === file.file_url}
              onSelect={() => onSelect(file.file_url, file.file_type as 'image' | 'video')}
              onDelete={() => deleteFile(file.id, file.file_url)}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface MediaFileCardProps {
  file: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  formatFileSize: (bytes: number | null) => string;
}

const MediaFileCard = ({ file, isSelected, onSelect, onDelete, formatFileSize }: MediaFileCardProps) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <div className="aspect-video bg-muted flex items-center justify-center">
        {file.file_type === 'video' ? (
          <video
            src={file.file_url}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <img
            src={file.file_url}
            alt={file.file_name}
            className="w-full h-full object-cover"
          />
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <Check className="text-primary" size={32} />
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {file.file_type === 'video' ? <Video size={12} /> : <Image size={12} />}
          <span className="truncate flex-1">{file.file_name}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.file_size)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MediaUploader;
