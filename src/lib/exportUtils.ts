import { Transaction } from '../types';

export function exportTransactionsToCSV(transactions: Transaction[], periodLabel?: string) {
  if (transactions.length === 0) {
    alert('No hay transacciones para exportar en este período.');
    return;
  }

  const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Recurrente'];
  
  const rows = transactions.map(t => {
    const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    const dateStr = date.toLocaleDateString('es-CO');
    const typeLabel = t.type === 'income' ? 'Ingreso' : 'Gasto';
    return [
      dateStr,
      typeLabel,
      t.amount,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.isRecurring ? 'Sí' : 'No'
    ];
  });

  // Totales
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    `Total Gastos,,,,,${totalExpenses}`,
    `Total Ingresos,,,,,${totalIncome}`,
    `Balance,,,,,${totalIncome - totalExpenses}`,
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = periodLabel 
    ? `SmartMoney_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    : `Transacciones_SmartMoney_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
