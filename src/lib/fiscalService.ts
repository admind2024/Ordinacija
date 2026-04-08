/**
 * MOA Fiscal Service
 * Poziva ConcertPOS fiscalize edge function za EFI fiskalizaciju
 */

const CONCERTPOS_URL = 'https://psqxprqpazfpkqyuijcd.supabase.co';
const CONCERTPOS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcXhwcnFwYXpmcGtxeXVpamNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDE0OTIsImV4cCI6MjA4NTAxNzQ5Mn0.5SB2KqOQzlk1V6wIzjMd1kwE3MngrTAVU19mKvVcbVc';

// Teconio testni podaci
const TECONIO_CONFIG = {
  sellerTIN: '03627357',
  sellerName: 'TECONIA MONTENEGRO DOO',
  businessUnitCode: 'zq333zc597',
  businessUnitAddress: 'Podgorica',
  businessUnitTown: 'Podgorica',
  tcrCode: 'rc621rr268',
  softwareCode: 'lm441kt072',
  operatorCode: 'ah031cl261',
  pfxBase64: '', // ucitava se iz localStorage ili Teconio tenanta
  pfxPassword: 'ktzrfdmudx',
  isProduction: false,
};

// localStorage key za certifikat
const LS_PFX_KEY = 'moa_fiscal_pfx_base64';
const LS_FISCAL_CONFIG = 'moa_fiscal_config';

export interface FiscalItem {
  name: string;
  code?: string;
  unit: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate: number; // 0, 7, 21
  rebatePercent?: number;
}

export interface FiscalPayment {
  method: 'BANKNOTE' | 'CARD' | 'COMPANY';
  amount: number;
}

export interface FiscalResult {
  success: boolean;
  iic?: string;
  fic?: string;
  qrCodeUrl?: string;
  invoiceNumber?: string;
  totals?: {
    totalWithoutVAT: number;
    totalVAT: number;
    totalPrice: number;
  };
  error?: string;
}

export interface FiscalConfig {
  sellerTIN: string;
  sellerName: string;
  businessUnitCode: string;
  businessUnitAddress: string;
  businessUnitTown: string;
  tcrCode: string;
  softwareCode: string;
  operatorCode: string;
  pfxPassword: string;
  isProduction: boolean;
}

/**
 * Sacuvaj P12 certifikat u localStorage
 */
export function saveCertificate(base64: string): void {
  localStorage.setItem(LS_PFX_KEY, base64);
}

/**
 * Ucitaj P12 certifikat iz localStorage
 */
export function loadCertificate(): string {
  return localStorage.getItem(LS_PFX_KEY) || '';
}

/**
 * Da li je certifikat ucitan
 */
export function hasCertificate(): boolean {
  return !!loadCertificate();
}

/**
 * Sacuvaj fiscal config
 */
export function saveFiscalConfig(config: Partial<FiscalConfig>): void {
  const existing = loadFiscalConfig();
  localStorage.setItem(LS_FISCAL_CONFIG, JSON.stringify({ ...existing, ...config }));
}

/**
 * Ucitaj fiscal config (sa Teconio defaultima)
 */
export function loadFiscalConfig(): FiscalConfig {
  try {
    const raw = localStorage.getItem(LS_FISCAL_CONFIG);
    if (raw) {
      return { ...TECONIO_CONFIG, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return TECONIO_CONFIG;
}

/**
 * Konvertuj File u base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Greska pri citanju fajla'));
    reader.readAsDataURL(file);
  });
}

/**
 * Dohvati sljedeci broj racuna
 */
async function getNextInvoiceNumber(tcrCode: string): Promise<number> {
  try {
    const res = await fetch(`${CONCERTPOS_URL}/rest/v1/rpc/get_next_invoice_number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONCERTPOS_KEY,
        Authorization: `Bearer ${CONCERTPOS_KEY}`,
      },
      body: JSON.stringify({ p_tcr_code: tcrCode }),
    });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }

  // Fallback: dohvati max iz baze
  try {
    const res = await fetch(
      `${CONCERTPOS_URL}/rest/v1/fiscal_invoices?tcr_code=eq.${tcrCode}&select=invoice_ord_num&order=invoice_ord_num.desc&limit=1`,
      {
        headers: {
          apikey: CONCERTPOS_KEY,
          Authorization: `Bearer ${CONCERTPOS_KEY}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return (data[0]?.invoice_ord_num || 0) + 1;
    }
  } catch { /* ignore */ }

  return 1;
}

/**
 * Dohvati Teconio test certifikat iz ConcertPOS baze (ako nema lokalno)
 */
export async function loadTeconioCertificate(): Promise<boolean> {
  if (hasCertificate()) return true;
  try {
    const res = await fetch(
      `${CONCERTPOS_URL}/rest/v1/tenants?select=pfx_base64&tin=eq.03627357&limit=1`,
      {
        headers: {
          apikey: CONCERTPOS_KEY,
          Authorization: `Bearer ${CONCERTPOS_KEY}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data[0]?.pfx_base64) {
        saveCertificate(data[0].pfx_base64);
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

/**
 * Fiskalizuj racun
 */
export async function fiscalizeInvoice(
  items: FiscalItem[],
  payments: FiscalPayment[],
): Promise<FiscalResult> {
  const config = loadFiscalConfig();
  const pfxBase64 = loadCertificate();

  if (!pfxBase64) {
    return { success: false, error: 'Certifikat nije ucitan. Uploadujte P12 fajl u Fiscal podesavanjima.' };
  }

  try {
    // Dohvati sljedeci broj
    const invoiceOrdNum = await getNextInvoiceNumber(config.tcrCode);

    const body = {
      sellerTIN: config.sellerTIN,
      sellerName: config.sellerName,
      businessUnitCode: config.businessUnitCode,
      businessUnitAddress: config.businessUnitAddress,
      businessUnitTown: config.businessUnitTown,
      tcrCode: config.tcrCode,
      softwareCode: config.softwareCode,
      operatorCode: config.operatorCode,
      invoiceOrdNum,
      invoiceType: 'CASH',
      items: items.map((item) => ({
        name: item.name,
        code: item.code || '',
        unit: item.unit,
        quantity: item.quantity,
        unitPriceWithVAT: item.unitPriceWithVAT,
        vatRate: item.vatRate,
        rebatePercent: item.rebatePercent || 0,
      })),
      payments,
      isProduction: config.isProduction,
      pfxBase64,
      pfxPassword: config.pfxPassword,
    };

    const res = await fetch(`${CONCERTPOS_URL}/functions/v1/fiscalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONCERTPOS_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, error: `Neispravan odgovor: ${text.slice(0, 200)}` };
    }

    if (result.success) {
      return {
        success: true,
        iic: result.iic,
        fic: result.fic,
        qrCodeUrl: result.qrCodeUrl,
        invoiceNumber: result.invoiceNumber,
        totals: result.totals,
      };
    }

    return {
      success: false,
      error: result.error?.message || result.rawResponse || 'Fiskalizacija nije uspjela',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Greska pri fiskalizaciji' };
  }
}
