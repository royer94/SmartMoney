import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Goal } from '../types';
import { formatCurrency } from './utils';

export const generateReportPDF = (
  transactions: Transaction[], 
  period: string, 
  userEmail: string, 
  action: 'save' | 'print' = 'save',
  goals: Goal[] = []
) => {
  try {
    // Instanciamos jsPDF de forma segura
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [59, 130, 246];
    const secondaryColor: [number, number, number] = [71, 85, 105];

    // Encabezado principal
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SmartMoney AI', 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Reporte de Finanzas: ${period}`, 20, 38);
    doc.text(`Usuario: ${userEmail}`, 20, 44);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 20, 50);

    // Cálculos financieros
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Bloques de KPI en la UI del PDF
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 60, 50, 25, 3, 3, 'FD');
    doc.roundedRect(80, 60, 50, 25, 3, 3, 'FD');
    doc.roundedRect(140, 60, 50, 25, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('TOTAL INGRESOS', 25, 67);
    doc.text('TOTAL GASTOS', 85, 67);
    doc.text('BALANCE NETO', 145, 67);

    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(income), 25, 77);
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(expenses), 85, 77);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(formatCurrency(balance), 145, 77);

    let currentY = 100;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Detalle de Movimientos', 20, currentY);
    currentY += 5;

    // Mapeo seguro de fechas de cualquier origen (Firestore, String o Date)
    const tableData = transactions.map(t => {
      let parsedDate = new Date();
      
      if (t.timestamp) {
        if (typeof t.timestamp.toDate === 'function') {
          parsedDate = t.timestamp.toDate();
        } else if (t.timestamp && typeof t.timestamp === 'object' && 'seconds' in t.timestamp) {
          parsedDate = new Date((t.timestamp as any).seconds * 1000);
        } else {
          parsedDate = new Date(t.timestamp as any);
        }
      }
      
      const finalDateStr = isNaN(parsedDate.getTime()) 
        ? new Date().toLocaleDateString('es-CO') 
        : parsedDate.toLocaleDateString('es-CO');

      return [
        finalDateStr,
        t.description || 'Sin descripción',
        t.category || 'General',
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        formatCurrency(t.amount)
      ];
    });

    // Renderizado de la tabla con jspdf-autotable
    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: tableData,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 20, left: 20, right: 20 },
      styles: { fontSize: 9 }
    });

    // Control dinámico de coordenadas tras la tabla
    currentY = (doc as any).lastAutoTable.finalY + 15;

    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Síntesis del Manejo de Dinero', 20, currentY);
    doc.line(20, currentY + 2, 80, currentY + 2);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    currentY += 10;
    
    let managementText = '';
    if (savingsRate > 20) {
      managementText = '¡Excelente manejo! Estás ahorrando más del 20% de tus ingresos. Tu salud financiera es robusta.';
    } else if (savingsRate > 0) {
      managementText = `Manejo estable. Estás ahorrando un ${Math.round(savingsRate)}% de tus ingresos. Considera reducir gastos hormiga para subir al 20%.`;
    } else if (balance < 0) {
      managementText = 'Alerta: Tus gastos superan tus ingresos. Es crucial revisar tus categorías de gasto y eliminar los no esenciales.';
    } else {
      managementText = 'Límite: Estás gastando exactamente lo que ganas. No tienes margen para imprevistos o ahorro.';
    }
    
    const splitManagement = doc.splitTextToSize(managementText, 170);
    doc.text(splitManagement, 20, currentY);
    currentY += (splitManagement.length * 6) + 12;

    // Sección opcional de Presupuestos/Metas
    if (goals && goals.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Evaluación de Presupuestos vs Realidad', 20, currentY);
      doc.line(20, currentY + 2, 100, currentY + 2);
      currentY += 10;

      goals.forEach(goal => {
        if (currentY > 270) { doc.addPage(); currentY = 20; }
        const percentage = (goal.currentAmount || 0) / goal.targetAmount;
        const status = percentage >= 1 ? 'EXCEDIDO' : percentage >= 0.8 ? 'Cerca del límite' : 'Bajo control';
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        const goalText = `${goal.name}: Gastado ${formatCurrency(goal.currentAmount || 0)} de ${formatCurrency(goal.targetAmount)} (${Math.round(percentage * 100)}%) - ${status}`;
        doc.text(goalText, 20, currentY);
        currentY += 7;
      });
      currentY += 10;
    }

    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Evaluación del Balance', 20, currentY);
    doc.line(20, currentY + 2, 75, currentY + 2);
    currentY += 10;

    const balanceEvaluation = balance >= 0 
      ? `Tu balance es positivo por ${formatCurrency(balance)}. Este excedente puede ser destinado al fondo de emergencia o inversiones.`
      : `Tu balance es negativo por ${formatCurrency(Math.abs(balance))}. Se recomienda un ajuste inmediato en los gastos del próximo periodo.`;

    const splitBalance = doc.splitTextToSize(balanceEvaluation, 170);
    doc.text(splitBalance, 20, currentY);

    // Numeración segura de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`SmartMoney AI | Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
    }

    const fileName = `reporte_${period.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().getTime()}.pdf`;

    if (action === 'print') {
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else {
      doc.save(fileName);
    }

  } catch (error: any) {
    console.error('[PDF] Error crítico generando reporte:', error);
    alert('No se pudo generar el reporte debido a un conflicto de datos. Por favor revisa los formatos de tus transacciones.');
  }
};
