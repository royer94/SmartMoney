import { Transaction } from '../types';

export function exportTransactionsToCSV(transactions: Transaction[]) {
  if (transactions.length === 0) return;

  // CSV Headers
  const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Recurrente'];
  
  // Data Rows
  const rows = transactions.map(t => {
    const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    const dateStr = date.toLocaleDateString('es-CO');
    const typeLabel = t.type === 'income' ? 'Ingreso' : 'Gasto';
    
    return [
      dateStr,
      typeLabel,
      t.amount,
      t.category,
      t.description.replace(/,/g, ' '), // Prevent CSV injection
      t.isRecurring ? 'Sí' : 'No'
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download link
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const fileName = `Transacciones_SmartMoney_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
