interface ExportableTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  type: string;
  cardId?: string;
  merchantName?: string;
  category?: string;
  notes?: string;
}

export function exportToCSV(transactions: ExportableTransaction[], fileName: string): void {
  // Define CSV headers
  const headers = [
    'Transaction ID',
    'Date',
    'Description',
    'Amount',
    'Type',
    'Status',
    'Card ID',
    'Merchant',
    'Category',
    'Notes',
  ];

  // Format data rows
  const rows = transactions.map((transaction) => [
    transaction.id,
    new Date(transaction.date).toLocaleString(),
    transaction.description,
    transaction.amount.toFixed(2),
    transaction.type,
    transaction.status,
    transaction.cardId || '',
    transaction.merchantName || '',
    transaction.category || '',
    (transaction.notes || '').replace(/"/g, '""'), // Escape quotes in notes
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
