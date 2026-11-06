/**
 * Client-side pure PDF generator for Al Harmain Travels invoices.
 * Generates valid PDF-1.4 documents without any external heavy libraries.
 */
import { SITE_CONFIG } from '@/config/siteConfig';

export interface InvoicePdfData {
  companyName: string;
  invoiceNumber: string;
  dateStr: string;
  passengerName: string;
  passengerPhone: string;
  bookingRef: string;
  chauffeurName: string;
  vehicleName: string;
  plateNumber: string;
  serviceName: string;
  pickupAddress: string;
  destAddress: string;
  fareAmount: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  additionalCharges?: { label: string; amount: string }[];
}

function escapePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E]/g, ' ') // Clean ASCII for PDF Type1 Helvetica
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function generateInvoicePdfBytes(data: InvoicePdfData): Uint8Array {
  const streamCommands: string[] = [];

  // A4 = 595 x 842 points. Origin (0,0) is bottom-left.

  // Top header background bar (dark luxury emerald)
  streamCommands.push('0.04 0.30 0.22 rg');
  streamCommands.push('0 758 595 84 re f');

  // Gold accent bar
  streamCommands.push('0.85 0.65 0.15 rg');
  streamCommands.push('0 754 595 4 re f');

  // Company Name & Subtitle
  streamCommands.push('1 1 1 rg');
  streamCommands.push('BT /F2 20 Tf 40 802 Td (' + escapePdfText(data.companyName || 'Al Harmain Travels') + ') Tj ET');
  streamCommands.push('BT /F1 10 Tf 40 784 Td (VIP Umrah, Hajj & Executive Transportation) Tj ET');
  streamCommands.push('BT /F1 8.5 Tf 40 769 Td (Kingdom of Saudi Arabia | Official Journey Receipt) Tj ET');

  // Top Right: Invoice Number & Date
  streamCommands.push('BT /F2 14 Tf 410 802 Td (OFFICIAL INVOICE) Tj ET');
  streamCommands.push('BT /F1 9 Tf 410 784 Td (Invoice: ' + escapePdfText(data.invoiceNumber) + ') Tj ET');
  streamCommands.push('BT /F1 9 Tf 410 769 Td (Date: ' + escapePdfText(data.dateStr) + ') Tj ET');

  // Status Badge box
  const isPaid = data.paymentStatus === 'paid' || data.paymentStatus === 'driver_accepted';
  if (isPaid) {
    streamCommands.push('0.92 0.98 0.94 rg 40 706 125 24 re f');
    streamCommands.push('0.10 0.60 0.30 RG 1 w 40 706 125 24 re S');
    streamCommands.push('0.08 0.45 0.22 rg');
    streamCommands.push('BT /F2 9.5 Tf 48 714 Td (PAID & VERIFIED) Tj ET');
  } else {
    streamCommands.push('1 0.96 0.88 rg 40 706 125 24 re f');
    streamCommands.push('0.85 0.65 0.15 RG 1 w 40 706 125 24 re S');
    streamCommands.push('0.70 0.45 0.05 rg');
    streamCommands.push('BT /F2 9.5 Tf 48 714 Td (PENDING PAYMENT) Tj ET');
  }

  // Booking Reference callout
  streamCommands.push('0.2 0.2 0.2 rg');
  streamCommands.push('BT /F1 9.5 Tf 370 714 Td (Booking Reference: ) Tj /F2 10 Tf (' + escapePdfText(data.bookingRef) + ') Tj ET');

  // Divider line
  streamCommands.push('0.85 0.85 0.85 RG 0.5 w 40 690 m 555 690 l S');

  // Box 1: Passenger Info (Left)
  streamCommands.push('0.97 0.97 0.97 rg 40 595 245 82 re f');
  streamCommands.push('0.88 0.88 0.88 RG 0.5 w 40 595 245 82 re S');
  streamCommands.push('0.5 0.5 0.5 rg');
  streamCommands.push('BT /F2 8 Tf 52 662 Td (BILLED TO / PASSENGER) Tj ET');
  streamCommands.push('0.1 0.1 0.1 rg');
  streamCommands.push('BT /F2 11 Tf 52 645 Td (' + escapePdfText(data.passengerName) + ') Tj ET');
  streamCommands.push('0.35 0.35 0.35 rg');
  streamCommands.push('BT /F1 9 Tf 52 630 Td (Phone: ' + escapePdfText(data.passengerPhone) + ') Tj ET');
  streamCommands.push('BT /F1 9 Tf 52 615 Td (Reservation Ref: ' + escapePdfText(data.bookingRef) + ') Tj ET');

  // Box 2: Chauffeur & Vehicle Info (Right)
  streamCommands.push('0.97 0.97 0.97 rg 310 595 245 82 re f');
  streamCommands.push('0.88 0.88 0.88 RG 0.5 w 310 595 245 82 re S');
  streamCommands.push('0.5 0.5 0.5 rg');
  streamCommands.push('BT /F2 8 Tf 322 662 Td (SERVICE CHAUFFEUR & VEHICLE) Tj ET');
  streamCommands.push('0.1 0.1 0.1 rg');
  streamCommands.push('BT /F2 11 Tf 322 645 Td (' + escapePdfText(data.chauffeurName) + ') Tj ET');
  streamCommands.push('0.35 0.35 0.35 rg');
  streamCommands.push('BT /F1 9 Tf 322 630 Td (Vehicle: ' + escapePdfText(data.vehicleName) + ') Tj ET');
  streamCommands.push('BT /F1 9 Tf 322 615 Td (Plate Number: ' + escapePdfText(data.plateNumber) + ') Tj ET');

  // Service Table Header
  streamCommands.push('0.04 0.30 0.22 rg 40 550 515 24 re f');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('BT /F2 9 Tf 52 557 Td (SERVICE ITINERARY / DESCRIPTION) Tj ET');
  streamCommands.push('BT /F2 9 Tf 450 557 Td (FIXED FARE) Tj ET');

  // Service Table Content Box
  streamCommands.push('0.88 0.88 0.88 RG 0.5 w 40 455 515 95 re S');

  // Service Row Details
  streamCommands.push('0.1 0.1 0.1 rg');
  streamCommands.push('BT /F2 11 Tf 52 528 Td (' + escapePdfText(data.serviceName) + ') Tj ET');
  streamCommands.push('0.35 0.35 0.35 rg');
  streamCommands.push('BT /F1 9 Tf 52 511 Td (Pickup: ' + escapePdfText(data.pickupAddress.slice(0, 75)) + ') Tj ET');
  streamCommands.push('BT /F1 9 Tf 52 496 Td (Destination: ' + escapePdfText(data.destAddress.slice(0, 75)) + ') Tj ET');
  streamCommands.push('0.08 0.45 0.22 rg');
  streamCommands.push('BT /F2 8.5 Tf 52 478 Td (Pricing Structure: Fixed All-Inclusive Rate) Tj ET');

  // Amount in Row
  streamCommands.push('0.04 0.30 0.22 rg');
  streamCommands.push('BT /F2 12 Tf 450 511 Td (' + escapePdfText(data.fareAmount + ' ' + data.currency) + ') Tj ET');

  // Total Summary Box (Bottom Right)
  streamCommands.push('0.96 0.98 0.96 rg 310 335 245 100 re f');
  streamCommands.push('0.04 0.30 0.22 RG 1 w 310 335 245 100 re S');

  streamCommands.push('0.3 0.3 0.3 rg');
  streamCommands.push('BT /F1 9.5 Tf 325 412 Td (Base Journey Fare:) Tj ET');
  streamCommands.push('BT /F1 9.5 Tf 465 412 Td (' + escapePdfText(data.fareAmount + ' ' + data.currency) + ') Tj ET');

  streamCommands.push('0.8 0.8 0.8 RG 0.5 w 325 398 m 540 398 l S');

  streamCommands.push('0.04 0.30 0.22 rg');
  streamCommands.push('BT /F2 11 Tf 325 375 Td (TOTAL FIXED FARE:) Tj ET');
  streamCommands.push('BT /F2 13 Tf 455 375 Td (' + escapePdfText(data.fareAmount + ' ' + data.currency) + ') Tj ET');

  streamCommands.push('0.4 0.4 0.4 rg');
  streamCommands.push('BT /F1 8.5 Tf 325 350 Td (Payment: ' + escapePdfText(data.paymentMethod) + ') Tj ET');

  // Guarantee Note Box (Bottom Left)
  streamCommands.push('0.98 0.98 0.98 rg 40 335 250 100 re f');
  streamCommands.push('0.85 0.85 0.85 RG 0.5 w 40 335 250 100 re S');
  streamCommands.push('0.85 0.65 0.15 rg 40 335 4 100 re f'); // Gold left accent

  streamCommands.push('0.15 0.15 0.15 rg');
  streamCommands.push('BT /F2 9.5 Tf 52 412 Td (Fixed All-Inclusive Journey Rate) Tj ET');
  streamCommands.push('0.4 0.4 0.4 rg');
  streamCommands.push('BT /F1 8.5 Tf 52 393 Td (This official receipt confirms the agreed fixed total) Tj ET');
  streamCommands.push('BT /F1 8.5 Tf 52 379 Td (for this executive private transfer. No unexpected) Tj ET');
  streamCommands.push('BT /F1 8.5 Tf 52 365 Td (hidden fees or surcharges apply to this booking.) Tj ET');
  streamCommands.push('BT /F1 8.5 Tf 52 348 Td (Trip Status: ' + escapePdfText(data.paymentStatus.toUpperCase()) + ') Tj ET');

  // Bottom Footer
  streamCommands.push('0.85 0.85 0.85 RG 0.5 w 40 85 m 555 85 l S');
  streamCommands.push('0.4 0.4 0.4 rg');
  streamCommands.push('BT /F2 8.5 Tf 40 70 Td (' + escapePdfText(data.companyName || 'Al Harmain Travels') + ' - Executive VIP Chauffeur Fleet) Tj ET');
  streamCommands.push(`BT /F1 8 Tf 40 57 Td (Kingdom of Saudi Arabia | ${SITE_CONFIG.regulatory.licenseNumber} | Support: ${SITE_CONFIG.contact.phoneDisplay} | ${SITE_CONFIG.contact.email}) Tj ET`);
  streamCommands.push('BT /F1 8 Tf 450 70 Td (Official Digital PDF Invoice) Tj ET');

  const contentStream = streamCommands.join('\n');
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(contentStream);
  const streamLength = streamBytes.length;

  const objects: string[] = [];
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj';
  objects[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj';
  objects[3] = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj';
  objects[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj';
  objects[5] = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj';
  objects[6] = '6 0 obj\n<< /Length ' + streamLength + ' >>\nstream\n' + contentStream + '\nendstream\nendobj';

  let pdfOutput = '%PDF-1.4\n';
  const xrefPositions: number[] = [0];

  for (let i = 1; i <= 6; i++) {
    xrefPositions[i] = encoder.encode(pdfOutput).length;
    pdfOutput += objects[i] + '\n';
  }

  const startxref = encoder.encode(pdfOutput).length;
  pdfOutput += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) {
    const pos = String(xrefPositions[i]).padStart(10, '0');
    pdfOutput += pos + ' 00000 n \n';
  }

  pdfOutput += 'trailer\n<< /Size 7 /Root 1 0 R >>\n';
  pdfOutput += 'startxref\n' + startxref + '\n';
  pdfOutput += '%%EOF\n';

  return encoder.encode(pdfOutput);
}

export function createInvoicePdfBlobUrl(data: InvoicePdfData): {
  blobUrl: string;
  download: (filename?: string) => void;
  revoke: () => void;
} {
  const bytes = generateInvoicePdfBytes(data);
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  const download = (filename?: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `Invoice-${data.bookingRef || 'booking'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const revoke = () => {
    URL.revokeObjectURL(blobUrl);
  };

  return { blobUrl, download, revoke };
}
