import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export const useMediaFiles = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('media_files')
        .insert({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith('video') ? 'video' : 'image',
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success('File berhasil diupload');
      await fetchFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Gagal upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/storage/v1/object/public/media/');
      const filePath = urlParts[1];

      if (filePath) {
        // Delete from storage
        await supabase.storage.from('media').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('File berhasil dihapus');
      await fetchFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Gagal menghapus file: ' + error.message);
    }
  };

  return {
    files,
    loading,
    uploading,
    uploadFile,
    deleteFile,
    refetch: fetchFiles,
  };
};
