import { format, parseISO } from 'date-fns';

export interface FXRate {
  date: string;
  rates: Record<string, number>;
}

export interface InvoiceData {
  Client: string;
  Invoice_Amount: number;
  Currency: string;
  Invoice_Date: string;
  Due_Date: string;
  Payment_Date?: string;
  Payment_Amount?: number;
  // Calculated fields
  usd_amount_at_invoice?: number;
  usd_amount_at_payment?: number;
  fx_gain_loss?: number;
  status?: 'Outstanding' | 'Paid' | 'Overdue';
  days_outstanding?: number;
}

// Cache for FX rates to avoid repeated API calls
const fxRateCache = new Map<string, Record<string, number>>();

export async function fetchFXRates(date: string, currencies: string[]): Promise<Record<string, number>> {
  const cacheKey = `${date}-${currencies.sort().join(',')}`;
  
  if (fxRateCache.has(cacheKey)) {
    return fxRateCache.get(cacheKey)!;
  }

  try {
    const formattedDate = format(parseISO(date), 'yyyy-MM-dd');
    const response = await fetch(
      `https://api.exchangerate.host/${formattedDate}?base=USD&symbols=${currencies.join(',')}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch FX rates: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.rates) {
      throw new Error('Invalid FX rate response');
    }
    
    // Convert to USD base rates (since API returns USD as base)
    const usdRates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(data.rates)) {
      usdRates[currency] = 1 / (rate as number);
    }
    usdRates['USD'] = 1; // USD to USD is always 1
    
    fxRateCache.set(cacheKey, usdRates);
    return usdRates;
  } catch (error) {
    console.error('Error fetching FX rates:', error);
    // Return fallback rates if API fails
    const fallbackRates: Record<string, number> = { USD: 1 };
    currencies.forEach(currency => {
      if (currency !== 'USD') {
        fallbackRates[currency] = 1; // Fallback to 1:1 rate
      }
    });
    return fallbackRates;
  }
}

export function calculateFXGainLoss(
  invoiceAmount: number,
  currency: string,
  invoiceRates: Record<string, number>,
  paymentRates: Record<string, number>
): number {
  if (currency === 'USD') return 0;
  
  const invoiceRate = invoiceRates[currency] || 1;
  const paymentRate = paymentRates[currency] || 1;
  
  const usdAtInvoice = invoiceAmount * invoiceRate;
  const usdAtPayment = invoiceAmount * paymentRate;
  
  return usdAtPayment - usdAtInvoice;
}

export function getInvoiceStatus(invoice: InvoiceData): 'Outstanding' | 'Paid' | 'Overdue' {
  if (invoice.Payment_Date) {
    return 'Paid';
  }
  
  const dueDate = new Date(invoice.Due_Date);
  const today = new Date();
  
  if (dueDate < today) {
    return 'Overdue';
  }
  
  return 'Outstanding';
}

export function calculateDaysOutstanding(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export async function processInvoiceData(rawData: any[]): Promise<InvoiceData[]> {
  // Get unique currencies and dates for FX rate fetching
  const currencies = [...new Set(rawData.map(row => row.Currency).filter(Boolean))];
  const dates = [...new Set([
    ...rawData.map(row => row.Invoice_Date).filter(Boolean),
    ...rawData.map(row => row.Payment_Date).filter(Boolean)
  ])];

  // Fetch FX rates for all required dates
  const fxRatePromises = dates.map(date => 
    fetchFXRates(date, currencies).then(rates => ({ date, rates }))
  );
  
  const fxRates = await Promise.all(fxRatePromises);
  const fxRateMap = new Map(fxRates.map(({ date, rates }) => [date, rates]));

  // Process each invoice
  return rawData.map(row => {
    const invoice: InvoiceData = {
      Client: row.Client || '',
      Invoice_Amount: parseFloat(row.Invoice_Amount) || 0,
      Currency: row.Currency || 'USD',
      Invoice_Date: row.Invoice_Date || '',
      Due_Date: row.Due_Date || '',
      Payment_Date: row.Payment_Date || undefined,
      Payment_Amount: row.Payment_Amount ? parseFloat(row.Payment_Amount) : undefined
    };

    // Get FX rates for calculations
    const invoiceRates = fxRateMap.get(invoice.Invoice_Date) || { [invoice.Currency]: 1, USD: 1 };
    const paymentRates = invoice.Payment_Date 
      ? fxRateMap.get(invoice.Payment_Date) || { [invoice.Currency]: 1, USD: 1 }
      : invoiceRates;

    // Calculate USD amounts
    invoice.usd_amount_at_invoice = invoice.Invoice_Amount * (invoiceRates[invoice.Currency] || 1);
    
    if (invoice.Payment_Date && invoice.Payment_Amount) {
      invoice.usd_amount_at_payment = invoice.Payment_Amount * (paymentRates[invoice.Currency] || 1);
      invoice.fx_gain_loss = calculateFXGainLoss(
        invoice.Invoice_Amount,
        invoice.Currency,
        invoiceRates,
        paymentRates
      );
    }

    // Calculate status and days outstanding
    invoice.status = getInvoiceStatus(invoice);
    invoice.days_outstanding = calculateDaysOutstanding(invoice.Due_Date);

    return invoice;
  });
}

export function exportToCSV(data: InvoiceData[], filename: string = 'fx_invoice_report.csv'): void {
  const headers = [
    'Client',
    'Invoice Amount',
    'Currency',
    'USD Amount (Invoice)',
    'USD Amount (Payment)',
    'FX Gain/Loss',
    'Invoice Date',
    'Due Date',
    'Payment Date',
    'Status',
    'Days Outstanding'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.Client}"`,
      row.Invoice_Amount,
      row.Currency,
      row.usd_amount_at_invoice?.toFixed(2) || '',
      row.usd_amount_at_payment?.toFixed(2) || '',
      row.fx_gain_loss?.toFixed(2) || '',
      row.Invoice_Date,
      row.Due_Date,
      row.Payment_Date || '',
      row.status || '',
      row.days_outstanding || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}