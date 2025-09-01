const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.colors = {
      primary: '#4A90E2',
      secondary: '#6C757D',
      success: '#28A745',
      warning: '#FFC107',
      danger: '#DC3545',
      info: '#17A2B8',
      light: '#F8F9FA',
      dark: '#343A40'
    };
    
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique'
    };
  }

  // Create a professional header for all reports
  createHeader(doc, title, subtitle = null, logoPath = null) {
    const headerHeight = 60;
    const margin = 40;
    
    // Header background
    doc.rect(margin, doc.y, doc.page.width - margin * 2, headerHeight)
      .fill(this.colors.primary);
    
    // Logo (if exists)
    let x = margin + 20;
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, x, doc.y + 8, { width: 44, height: 44 });
        x += 60;
      } catch (error) {
        console.log('Logo loading failed, continuing without logo');
      }
    }
    
    // Title
    doc.fill('#FFFFFF')
      .font(this.fonts.bold)
      .fontSize(20)
      .text('IWIZ HRMS', x, doc.y + 15);
    
    doc.fill('#FFFFFF')
      .font(this.fonts.regular)
      .fontSize(16)
      .text(title, x, doc.y + 35);
    
    if (subtitle) {
      doc.fill('#FFFFFF')
        .font(this.fonts.regular)
        .fontSize(12)
        .text(subtitle, x, doc.y + 50);
    }
    
    doc.moveDown(3);
    doc.fill(this.colors.dark);
  }

  // Create a summary section with key metrics
  createSummarySection(doc, title, metrics) {
    doc.font(this.fonts.bold)
      .fontSize(14)
      .text(title, { underline: true });
    doc.moveDown(0.5);
    
    metrics.forEach(metric => {
      doc.font(this.fonts.regular)
        .fontSize(10)
        .text(`${metric.label}: ${metric.value}`, { continued: true });
      
      if (metric.color) {
        doc.fill(metric.color);
      }
      
      doc.moveDown(0.3);
    });
    
    doc.moveDown(1);
    doc.fill(this.colors.dark);
  }

  // Create a professional table
  createTable(doc, headers, data, options = {}) {
    const {
      startY = doc.y,
      margin = 40,
      rowHeight = 25,
      headerHeight = 30,
      fontSize = 10,
      alternateRowColor = this.colors.light
    } = options;
    
    const tableWidth = doc.page.width - margin * 2;
    const columnWidths = options.columnWidths || headers.map(() => tableWidth / headers.length);
    
    let currentY = startY;
    
    // Table header
    doc.rect(margin, currentY, tableWidth, headerHeight)
      .fill(this.colors.primary)
      .stroke(this.colors.dark);
    
    let x = margin;
    headers.forEach((header, index) => {
      doc.fill('#FFFFFF')
        .font(this.fonts.bold)
        .fontSize(fontSize)
        .text(header, x + 8, currentY + 8, { 
          width: columnWidths[index] - 16,
          align: 'left'
        });
      x += columnWidths[index];
    });
    
    currentY += headerHeight;
    
    // Table rows
    data.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (currentY + rowHeight > doc.page.height - margin - 50) {
        doc.addPage();
        currentY = margin + 20;
        
        // Recreate header on new page
        doc.rect(margin, currentY, tableWidth, headerHeight)
          .fill(this.colors.primary)
          .stroke(this.colors.dark);
        
        x = margin;
        headers.forEach((header, index) => {
          doc.fill('#FFFFFF')
            .font(this.fonts.bold)
            .fontSize(fontSize)
            .text(header, x + 8, currentY + 8, { 
              width: columnWidths[index] - 16,
              align: 'left'
            });
          x += columnWidths[index];
        });
        
        currentY += headerHeight;
      }
      
      // Row background
      const rowColor = rowIndex % 2 === 0 ? '#FFFFFF' : alternateRowColor;
      doc.rect(margin, currentY, tableWidth, rowHeight)
        .fill(rowColor)
        .stroke(this.colors.dark);
      
      // Row content
      x = margin;
      row.forEach((cell, index) => {
        doc.fill(this.colors.dark)
          .font(this.fonts.regular)
          .fontSize(fontSize)
          .text(cell || '-', x + 8, currentY + 8, { 
            width: columnWidths[index] - 16,
            align: 'left'
          });
        x += columnWidths[index];
      });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 10;
    return currentY;
  }

  // Create a footer with page numbers
  createFooter(doc, companyName = 'IWIZ HRMS') {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      const footerY = doc.page.height - 40;
      
      // Footer line
      doc.strokeColor(this.colors.secondary)
        .lineWidth(0.5)
        .moveTo(40, footerY)
        .lineTo(doc.page.width - 40, footerY)
        .stroke();
      
      // Footer text
      doc.fill(this.colors.secondary)
        .font(this.fonts.regular)
        .fontSize(8)
        .text(companyName, 40, footerY + 10, { align: 'left' });
      
      doc.fill(this.colors.secondary)
        .font(this.fonts.regular)
        .fontSize(8)
        .text(`Page ${i + 1} of ${pageCount}`, 0, footerY + 10, { align: 'center' });
      
      doc.fill(this.colors.secondary)
        .font(this.fonts.regular)
        .fontSize(8)
        .text(`Generated on ${new Date().toLocaleDateString()}`, 0, footerY + 10, { align: 'right' });
    }
  }

  // Enhanced CSV formatter with proper escaping
  formatCSVValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  // Create CSV header row
  createCSVHeader(headers) {
    return headers.map(header => this.formatCSVValue(header)).join(',');
  }

  // Create CSV data row
  createCSVRow(data) {
    return data.map(value => this.formatCSVValue(value)).join(',');
  }

  // Generate complete CSV content
  generateCSV(headers, data) {
    const headerRow = this.createCSVHeader(headers);
    const dataRows = data.map(row => this.createCSVRow(row));
    
    return [headerRow, ...dataRows].join('\n');
  }

  // Utility method to format dates consistently
  formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  // Utility method to format time
  formatTime(time) {
    if (!time) return 'N/A';
    if (typeof time === 'string') {
      time = new Date(time);
    }
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Utility method to format currency
  formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Utility method to format percentages
  formatPercentage(value, total) {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(1)}%`;
  }
}

module.exports = ReportGenerator;
