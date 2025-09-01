import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile,
  isProcessing
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
    setDragActive(false);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/typescript': ['.tsx'],
      'application/javascript': ['.js']
    },
    maxFiles: 1,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  if (selectedFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isProcessing && (
              <CheckCircle className="w-5 h-5 text-primary" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFile}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer transition-all duration-300",
        "border-2 border-dashed rounded-xl p-8",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragActive || dragActive 
          ? "border-primary bg-primary/10 scale-[1.02]" 
          : "border-muted/30",
        "upload-area"
      )}
    >
      <input {...getInputProps()} />
      
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Solte o arquivo aqui' : 'Carregar arquivo'}
          </h3>
          <p className="text-muted-foreground text-sm mb-3">
            Arraste e solte ou clique para selecionar
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-muted/20 rounded">PDF</span>
            <span className="px-2 py-1 bg-muted/20 rounded">TXT</span>
            <span className="px-2 py-1 bg-muted/20 rounded">TSX</span>
            <span className="px-2 py-1 bg-muted/20 rounded">JS</span>
          </div>
        </div>
      </div>
    </div>
  );
};