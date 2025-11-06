import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { Camera, Loader2, User, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  size = 'md',
  showUploadButton = true 
}: AvatarUploadProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      setAvatarUrl(newUrl);
      onAvatarUpdate?.(newUrl);

      toast({
        title: 'تم رفع الصورة',
        description: 'تم تحديث صورتك الشخصية بنجاح'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      if (avatarUrl) {
        const path = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([path]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user!.id);

      if (error) throw error;

      setAvatarUrl(null);
      onAvatarUpdate?.(null);

      toast({
        title: 'تم الحذف',
        description: 'تم حذف صورتك الشخصية'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return '';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40`}>
          <AvatarImage src={avatarUrl || user?.user_metadata?.avatar_url || undefined} alt="Avatar" loading="lazy" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Google Avatar" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <User className={iconSizes[size]} />
            )}
          </AvatarFallback>
        </Avatar>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}

        {!uploading && showUploadButton && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <Camera className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      {showUploadButton && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="hidden"
          />
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="w-3 h-3 mr-1" />
            رفع
          </Button>

          {avatarUrl && (
            <Button
              size="sm"
              variant="destructive"
              onClick={removeAvatar}
              disabled={uploading}
            >
              <X className="w-3 h-3 mr-1" />
              حذف
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
