import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download } from 'lucide-react';
import { InvoiceData, exportToCSV } from '@/utils/fxUtils';
import { format } from 'date-fns';

interface InvoiceTableProps {
  data: InvoiceData[];
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  const currencies = useMemo(() => 
    [...new Set(data.map(invoice => invoice.Currency))], [data]
  );

  const filteredData = useMemo(() => {
    return data.filter(invoice => {
      const matchesSearch = invoice.Client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || invoice.Currency === currencyFilter;
      return matchesSearch && matchesStatus && matchesCurrency;
    });
  }, [data, searchTerm, statusFilter, currencyFilter]);

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="secondary" className="bg-success text-success-foreground">Paid</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Outstanding':
        return <Badge variant="outline" className="border-warning text-warning">Outstanding</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleExport = () => {
    exportToCSV(filteredData, `fx_invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <CardTitle>Invoice Details</CardTitle>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Outstanding">Outstanding</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              {currencies.map(currency => (
                <SelectItem key={currency} value={currency}>{currency}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>USD Value</TableHead>
                <TableHead>FX Gain/Loss</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((invoice, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{invoice.Client}</TableCell>
                  <TableCell>
                    {formatCurrency(invoice.Invoice_Amount, invoice.Currency)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(invoice.usd_amount_at_invoice)}
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      (invoice.fx_gain_loss || 0) >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {invoice.fx_gain_loss !== undefined 
                        ? `${invoice.fx_gain_loss >= 0 ? '+' : ''}${formatCurrency(invoice.fx_gain_loss)}`
                        : '-'
                      }
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(invoice.Invoice_Date)}</TableCell>
                  <TableCell>{formatDate(invoice.Due_Date)}</TableCell>
                  <TableCell>{formatDate(invoice.Payment_Date)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No invoices match your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
};