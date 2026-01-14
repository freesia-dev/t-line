import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Play, Trash2, Loader2 } from 'lucide-react';
import { CustomAudioPhrase } from '@/lib/queueStore';

interface AudioPhraseUploaderProps {
  phrases: CustomAudioPhrase[];
  onUpdate: (phrases: CustomAudioPhrase[]) => void;
}

const AudioPhraseUploader = ({ phrases, onUpdate }: AudioPhraseUploaderProps) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUpload = async (phrase: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Hanya file audio yang diperbolehkan');
      return;
    }

    setUploading(phrase);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `audio_phrases/${phrase}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Update phrases
      const newPhrases = phrases.map((p) =>
        p.phrase === phrase ? { ...p, audioUrl: urlData.publicUrl } : p
      );
      onUpdate(newPhrases);

      toast.success('Audio berhasil diupload');
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast.error('Gagal upload audio: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (phrase: string, audioUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/storage/v1/object/public/media/');
      const filePath = urlParts[1];

      if (filePath) {
        await supabase.storage.from('media').remove([filePath]);
      }

      // Update phrases
      const newPhrases = phrases.map((p) =>
        p.phrase === phrase ? { ...p, audioUrl: '' } : p
      );
      onUpdate(newPhrases);

      toast.success('Audio berhasil dihapus');
    } catch (error: any) {
      console.error('Error deleting audio:', error);
      toast.error('Gagal menghapus audio: ' + error.message);
    }
  };

  const handlePlay = (audioUrl: string, phrase: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlaying(phrase);

    audio.onended = () => setPlaying(null);
    audio.onerror = () => {
      setPlaying(null);
      toast.error('Gagal memutar audio');
    };
    audio.play();
  };

  return (
    <div className="space-y-3">
      {phrases.map((phraseItem) => (
        <Card key={phraseItem.phrase} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="font-medium">{phraseItem.label}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {phraseItem.audioUrl ? 'Audio tersedia' : 'Belum ada audio'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {phraseItem.audioUrl ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlay(phraseItem.audioUrl, phraseItem.phrase)}
                    disabled={playing === phraseItem.phrase}
                  >
                    <Play size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(phraseItem.phrase, phraseItem.audioUrl)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(phraseItem.phrase, file);
                    }}
                    disabled={uploading === phraseItem.phrase}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={uploading === phraseItem.phrase}
                  >
                    <span>
                      {uploading === phraseItem.phrase ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                    </span>
                  </Button>
                </label>
              )}
            </div>
          </div>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground">
        Format: "Nomor Antrian" + [A001 dari TTS] + "Silakan Menuju ke" + "Customer Service/Teller"
      </p>
    </div>
  );
};

export default AudioPhraseUploader;
