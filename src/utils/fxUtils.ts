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

const fxRateCache = new Map<string, number>();

export async function fetchFXRate(currency: string, date: string): Promise<number> {
    if (!currency) throw new Error("Currency is undefined or empty");
    if (currency === 'USD') return 1;

    const cacheKey = `${date}-${currency}`;
    if (fxRateCache.has(cacheKey)) {
        return fxRateCache.get(cacheKey)!;
    }

    try {
        const formattedDate = format(parseISO(date), 'yyyy-MM-dd');
        const url = `https://api.frankfurter.app/${formattedDate}?from=${currency}&to=USD`;
        console.log('📡 Fetching:', url);

        const response = await fetch(url);
        const data = await response.json();

        console.log('🧾 FX Response:', JSON.stringify(data, null, 2));

        const rate = data.rates?.USD;

        if (!rate) throw new Error(`No USD rate found for ${currency} on ${date}`);

        fxRateCache.set(cacheKey, rate);
        return rate;
    } catch (error) {
        console.error(`❌ Error fetching FX for ${currency} on ${date}:`, error);
        return 1;
    }
}

export function getInvoiceStatus(invoice: InvoiceData): 'Outstanding' | 'Paid' | 'Overdue' {
    if (invoice.Payment_Date) return 'Paid';

    const dueDate = new Date(invoice.Due_Date);
    const today = new Date();
    return dueDate < today ? 'Overdue' : 'Outstanding';
}

export function calculateDaysOutstanding(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

export async function processInvoiceData(rawData: any[]): Promise<InvoiceData[]> {
    const processed: InvoiceData[] = [];

    for (const row of rawData) {
        const invoice: InvoiceData = {
            Client: row.Client || '',
            Invoice_Amount: parseFloat(row.Invoice_Amount) || 0,
            Currency: row.Currency?.toUpperCase() || 'USD',
            Invoice_Date: row.Invoice_Date || '',
            Due_Date: row.Due_Date || '',
            Payment_Date: row.Payment_Date || undefined,
            Payment_Amount: row.Payment_Amount ? parseFloat(row.Payment_Amount) : undefined
        };

        const invoiceRate = await fetchFXRate(invoice.Currency, invoice.Invoice_Date);
        invoice.usd_amount_at_invoice = invoice.Invoice_Amount * invoiceRate;

        if (invoice.Payment_Date && invoice.Payment_Amount) {
            const paymentRate = await fetchFXRate(invoice.Currency, invoice.Payment_Date);
            invoice.usd_amount_at_payment = invoice.Payment_Amount * paymentRate;
            invoice.fx_gain_loss = invoice.usd_amount_at_payment - invoice.usd_amount_at_invoice;
        }

        invoice.status = getInvoiceStatus(invoice);
        invoice.days_outstanding = calculateDaysOutstanding(invoice.Due_Date);

        processed.push(invoice);
    }

    return processed;
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
