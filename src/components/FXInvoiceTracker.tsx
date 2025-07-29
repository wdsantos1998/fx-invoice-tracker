import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { KPICards } from './KPICards';
import { InvoiceTable } from './InvoiceTable';
import { Charts } from './Charts';
import { InvoiceData, processInvoiceData } from '@/utils/fxUtils';
import { useToast } from '@/hooks/use-toast';

export const FXInvoiceTracker: React.FC = () => {
  const [rawData, setRawData] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'charts'>('overview');
  const { toast } = useToast();

  const handleDataLoad = useCallback(async (data: any[]) => {
    setLoading(true);
    try {
      const processed = await processInvoiceData(data);
      setRawData(data);
      setProcessedData(processed);
      setActiveTab('overview');

      toast({
        title: "Data loaded successfully",
        description: `Processed ${processed.length} invoices with FX calculations`,
      });
    } catch (error) {
      console.error('Error processing data:', error);
      toast({
        title: "Error processing data",
        description: "Failed to process invoice data. Please check your CSV format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const downloadSampleCSV = () => {
    const sampleData = `Client,Invoice_Amount,Currency,Invoice_Date,Due_Date,Payment_Date,Payment_Amount
Acme Corp,10000,EUR,2024-01-15,2024-02-15,2024-02-10,10000
Global Inc,25000,GBP,2024-01-20,2024-02-20,,
Tech Solutions,15000,JPY,2024-01-25,2024-02-25,2024-02-20,15000
Finance Ltd,50000,USD,2024-02-01,2024-03-01,2024-02-28,50000
International Co,30000,CAD,2024-02-05,2024-03-05,,`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_invoices.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div>
                          <h1 className="text-3xl font-bold text-foreground bg-white">FX Invoice Tracker</h1>
                          <p className="text-muted-foreground mt-1">
                              Multi-currency invoice management with real-time FX calculations
                          </p>
                          <a
                              href="https://www.linkedin.com/in/wesley-dos-santos-0316341b0/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex gap-x-2 pt-2 items-center no-underline text-muted-foreground mt-1 hover:opacity-80"
                          >
                              <img src="/linkedin-icon.svg" alt="Logo" className="h-5 w-5" />
                              <span>Prototyped by Wesley dos Santos</span>
                          </a>

                      </div>

            {processedData.length === 0 && (
              <Button variant="outline" onClick={downloadSampleCSV} size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {processedData.length === 0 ? (
          /* Initial Upload State */
          <div className="max-w-2xl mx-auto">
            <FileUpload onDataLoaded={handleDataLoad} loading={loading} />

            {loading && (
              <Card className="mt-6">
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" />
                  <span className="text-lg">Processing invoice data and fetching FX rates...</span>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Main Dashboard */
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeTab === 'overview' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('overview')}
                    size="sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Overview
                  </Button>
                  <Button
                    variant={activeTab === 'table' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('table')}
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Invoice Details
                  </Button>
                  <Button
                    variant={activeTab === 'charts' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('charts')}
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>

                  <Separator orientation="vertical" className="mx-2 h-8" />

                  <Button
                    variant="outline"
                    onClick={() => {
                      setProcessedData([]);
                      setRawData([]);
                      setActiveTab('overview');
                    }}
                    size="sm"
                  >
                    Upload New File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards - Always visible */}
            <KPICards data={processedData} />

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Charts data={processedData} />
                <InvoiceTable data={processedData.slice(0, 10)} />
              </div>
            )}

            {activeTab === 'table' && (
              <InvoiceTable data={processedData} />
            )}

            {activeTab === 'charts' && (
              <Charts data={processedData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
