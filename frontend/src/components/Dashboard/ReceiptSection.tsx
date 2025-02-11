import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ReceiptMetadata {
  timestamp: string;
  merchantName: string;
  totalAmount: number;
  currency: string;
  items?: ReceiptItem[];
}

interface ReceiptProps {
  content: string;
  metadata: ReceiptMetadata;
}

export const ReceiptSection: React.FC<ReceiptProps> = ({ content, metadata }) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Receipt Details
      </Typography>
      
      <Box sx={{ 
        backgroundColor: '#f5f5f5', 
        p: 2, 
        borderRadius: 1,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        mb: 2
      }}>
        <Typography variant="body2" component="div">
          {content}
        </Typography>
      </Box>
      
      {metadata.items && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Items:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {metadata.items.map((item, index) => (
              <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2">{item.description}</Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2">x{item.quantity}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" align="right">
                    ${item.totalPrice.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
