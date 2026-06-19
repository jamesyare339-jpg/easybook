import { API } from '../context/AuthContext';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

// Builds a print-friendly HTML invoice and opens it in a new window for printing/saving as PDF
function renderInvoiceHTML({ invoice_number, generated_at, party_label, party_name, branch_name, branch_phone, items, total, paid, debt, payment_method, lang }) {
  const isSo = lang === 'so';
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${it.product_name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(it.unit_price || it.unit_cost)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(it.total_price || it.total_cost)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${invoice_number}</title>
<style>
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1D9E75; padding-bottom: 20px; margin-bottom: 24px; }
  .logo { font-size: 24px; font-weight: 800; color: #1D9E75; }
  .logo-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .invoice-meta { text-align: right; font-size: 13px; color: #6b7280; }
  .invoice-num { font-size: 18px; font-weight: 700; color: #111; }
  .party { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
  .party-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .party-name { font-size: 16px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .totals-row.grand { border-top: 2px solid #1D9E75; font-weight: 800; font-size: 18px; color: #1D9E75; padding-top: 12px; }
  .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">📚 EasyBook</div>
      <div class="logo-sub">${branch_name || ''}${branch_phone ? ' · ' + branch_phone : ''}</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-num">${invoice_number}</div>
      <div>${new Date(generated_at).toLocaleDateString()} ${new Date(generated_at).toLocaleTimeString()}</div>
    </div>
  </div>

  <div class="party">
    <div class="party-label">${party_label}</div>
    <div class="party-name">${party_name}</div>
  </div>

  <table>
    <thead><tr>
      <th>${isSo ? 'Alaabta' : 'Product'}</th>
      <th style="text-align:center">${isSo ? 'Tirada' : 'Qty'}</th>
      <th style="text-align:right">${isSo ? 'Qiimaha' : 'Price'}</th>
      <th style="text-align:right">${isSo ? 'Wadarta' : 'Total'}</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row grand"><span>${isSo ? 'Wadarta Guud' : 'Grand Total'}</span><span>${fmt(total)}</span></div>
    <div class="totals-row"><span>${isSo ? 'La Bixiyay' : 'Paid'}</span><span>${fmt(paid)}</span></div>
    ${parseFloat(debt) > 0 ? `<div class="totals-row" style="color:#ef4444"><span>${isSo ? 'Deynta Hadhay' : 'Remaining Debt'}</span><span>${fmt(debt)}</span></div>` : ''}
    <div class="totals-row" style="color:#6b7280"><span>${isSo ? 'Habka Lacag Bixinta' : 'Payment Method'}</span><span>${(payment_method || '').toUpperCase()}</span></div>
  </div>

  <div class="footer">
    ${isSo ? 'Mahadsanid ganacsigaaga!' : 'Thank you for your business!'} · EasyBook v1.0
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>
  `;
}

export async function printSaleInvoice(saleId, lang) {
  const res = await API.get(`/invoices/sale/${saleId}`);
  const { invoice_number, generated_at, sale, items } = res.data.data;
  const html = renderInvoiceHTML({
    invoice_number, generated_at,
    party_label: lang === 'so' ? 'Macaamiilka' : 'Customer',
    party_name: sale.customer_name,
    branch_name: sale.branch_name,
    branch_phone: sale.branch_phone,
    items, total: sale.total_amount, paid: sale.paid_amount, debt: sale.debt_amount,
    payment_method: sale.payment_method, lang,
  });
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

export async function printPurchaseInvoice(purchaseId, lang) {
  const res = await API.get(`/invoices/purchase/${purchaseId}`);
  const { invoice_number, generated_at, purchase, items } = res.data.data;
  const html = renderInvoiceHTML({
    invoice_number, generated_at,
    party_label: lang === 'so' ? 'Supplier-ka' : 'Supplier',
    party_name: purchase.supplier_name,
    branch_name: purchase.branch_name,
    branch_phone: '',
    items, total: purchase.total_amount, paid: purchase.paid_amount, debt: purchase.debt_amount,
    payment_method: purchase.payment_method, lang,
  });
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
