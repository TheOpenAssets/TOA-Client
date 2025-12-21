import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (documents: { aadhaar: File | null; pan: File | null }) => void;
}

export const DocumentUploadModal = ({
  open,
  onOpenChange,
  onComplete,
}: DocumentUploadModalProps) => {
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [pan, setPan] = useState<File | null>(null);

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAadhaar(file);
    }
  };

  const handlePanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPan(file);
    }
  };

  const handleSubmit = () => {
    if (aadhaar || pan) {
      onComplete({ aadhaar, pan });
      onOpenChange(false);
    }
  };

  const isSubmitDisabled = !aadhaar && !pan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Identity Documents</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Please upload your Aadhaar and PAN card for verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Aadhaar Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Aadhaar Card
            </label>
            <div className="relative">
              <input
                type="file"
                id="aadhaar-upload"
                accept="image/*,.pdf"
                onChange={handleAadhaarUpload}
                className="hidden"
              />
              <label
                htmlFor="aadhaar-upload"
                className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
              >
                {aadhaar ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {aadhaar.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(aadhaar.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Click to upload Aadhaar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or PDF (max. 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* PAN Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              PAN Card
            </label>
            <div className="relative">
              <input
                type="file"
                id="pan-upload"
                accept="image/*,.pdf"
                onChange={handlePanUpload}
                className="hidden"
              />
              <label
                htmlFor="pan-upload"
                className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
              >
                {pan ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {pan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(pan.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Click to upload PAN
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or PDF (max. 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Info Box for Non-Indian Users */}
          <div className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Currently Supporting India
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We currently support verification for Indian residents. Support for additional countries will be added based on demand. Please contact support if you're outside India.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="w-full"
            size="lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            Submit Documents
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
