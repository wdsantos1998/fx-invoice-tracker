import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { InvoiceData } from '@/utils/fxUtils';
import { format, parseISO } from 'date-fns';

interface ChartsProps {
  data: InvoiceData[];
}

const COLORS = ['hsl(219, 95%, 28%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(210, 100%, 56%)', 'hsl(0, 84%, 60%)'];

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const outstandingByCurrency = useMemo(() => {
    const outstanding = data.filter(invoice => invoice.status !== 'Paid');
    const currencyTotals = outstanding.reduce((acc, invoice) => {
      const amount = invoice.usd_amount_at_invoice || 0;
      acc[invoice.Currency] = (acc[invoice.Currency] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(currencyTotals).map(([currency, amount]) => ({
      currency,
      amount,
      percentage: ((amount / Object.values(currencyTotals).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
    }));
  }, [data]);

  const agingAnalysis = useMemo(() => {
    const outstanding = data.filter(invoice => invoice.status !== 'Paid');
    const agingBuckets = {
      'Current': 0,
      '1-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '90+ days': 0
    };

    outstanding.forEach(invoice => {
      const days = invoice.days_outstanding || 0;
      const amount = invoice.usd_amount_at_invoice || 0;
      
      if (days <= 0) agingBuckets['Current'] += amount;
      else if (days <= 30) agingBuckets['1-30 days'] += amount;
      else if (days <= 60) agingBuckets['31-60 days'] += amount;
      else if (days <= 90) agingBuckets['61-90 days'] += amount;
      else agingBuckets['90+ days'] += amount;
    });

    return Object.entries(agingBuckets).map(([period, amount]) => ({
      period,
      amount
    }));
  }, [data]);

  const fxTrends = useMemo(() => {
    const paidInvoices = data.filter(invoice => invoice.Payment_Date && invoice.fx_gain_loss !== undefined);
    
    const monthlyFX = paidInvoices.reduce((acc, invoice) => {
      const month = format(parseISO(invoice.Payment_Date!), 'yyyy-MM');
      acc[month] = (acc[month] || 0) + (invoice.fx_gain_loss || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyFX)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, fxGainLoss]) => ({
        month: format(parseISO(month + '-01'), 'MMM yyyy'),
        fxGainLoss
      }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Outstanding by Currency - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outstanding by Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={outstandingByCurrency}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ currency, percentage }) => `${currency} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {outstandingByCurrency.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Aging Analysis - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aging Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agingAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="period" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* FX Gains/Losses Over Time - Line Chart */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">FX Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fxTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="fxGainLoss" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};