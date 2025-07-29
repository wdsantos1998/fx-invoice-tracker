import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Globe } from 'lucide-react';
import { InvoiceData } from '@/utils/fxUtils';

interface KPICardsProps {
  data: InvoiceData[];
}

export const KPICards: React.FC<KPICardsProps> = ({ data }) => {
  const outstandingInvoices = data.filter(invoice => invoice.status !== 'Paid');
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, invoice) => sum + (invoice.usd_amount_at_invoice || 0), 0
  );

  const totalFXGainLoss = data.reduce((sum, invoice) => sum + (invoice.fx_gain_loss || 0), 0);
  
  const uniqueCurrencies = new Set(data.map(invoice => invoice.Currency)).size;
  
  const overdueCount = data.filter(invoice => invoice.status === 'Overdue').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Outstanding
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {outstandingInvoices.length} invoice(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            FX Gains/Losses
          </CardTitle>
          {totalFXGainLoss >= 0 ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            totalFXGainLoss >= 0 ? 'text-success' : 'text-destructive'
          }`}>
            {totalFXGainLoss >= 0 ? '+' : ''}{formatCurrency(totalFXGainLoss)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total realized & unrealized
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Currencies
          </CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {uniqueCurrencies}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Active currencies
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {overdueCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Invoices past due
          </p>
        </CardContent>
      </Card>
    </div>
  );
};