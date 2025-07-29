import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
  loading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, loading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        // Validate required columns
        const requiredColumns = ['Client', 'Invoice_Amount', 'Currency', 'Invoice_Date', 'Due_Date'];
        const headers = Object.keys(results.data[0] || {});
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        onDataLoaded(results.data);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Create a proper file input to trigger the handler
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
        const fakeEvent = new Event('change', { bubbles: true });
        Object.defineProperty(fakeEvent, 'target', {
          writable: false,
          value: fileInputRef.current
        });
        handleFileSelect(fakeEvent as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 bg-white">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-white"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
            onTouchEnd={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }}
          >
            <div className="flex flex-col items-center space-y-4">
              {fileName ? (
                <>
                  <FileText className="h-12 w-12 text-success" />
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">File loaded successfully</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Upload Invoice CSV</p>
                    <p className="text-sm text-muted-foreground">
                      Tap to select a CSV file
                    </p>
                  </div>
                </>
              )}

              <div className="text-xs text-muted-foreground">
                Required columns: Client, Invoice_Amount, Currency, Invoice_Date, Due_Date
              </div>

              {!loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  {fileName ? 'Change File' : 'Select File'}
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading}
            capture="environment"
          />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
