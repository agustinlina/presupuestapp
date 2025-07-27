const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Formato miles punto, decimales coma
function formatMonto(n) {
  return n.toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Función para limpiar y armar nombre de archivo
function generarNombreArchivo(nombreEmpresa, fechaEmision) {
  let base = nombreEmpresa.replace(/[^\w\d]/g, '_').replace(/_+/g, '_');
  return `${base}_${fechaEmision}.pdf`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Método no permitido');
    return;
  }
  let body = '';
  await new Promise(r => req.on('data', d => body += d).on('end', r));
  let data;
  try { data = JSON.parse(body); }
  catch { res.statusCode = 400; res.end('Datos inválidos'); return; }

  const {
    nombreCliente = '',
    cuitCliente = '',
    condiciones = '',
    observaciones = '',
    productos = [],
    ivaIncluido = false,
    fechaValidez = ''
  } = data;

  // Fecha emisión (hoy)
  const fechaEmision = new Date().toLocaleDateString('es-AR');
  // Nombre del archivo
  const nombreArchivo = generarNombreArchivo(nombreCliente || "Presupuesto", fechaEmision);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  const doc = new PDFDocument({ size: 'A4', margin: 36 });

  // --- Marca de agua fondo.png, detrás de la tabla ---
  try {
    const fondoPath = path.join(process.cwd(), 'fondo.png');
    if (fs.existsSync(fondoPath)) {
      doc.save();
      doc.opacity(0.11);
      doc.image(fondoPath, 87, 240, { width: 420 });
      doc.restore();
    }
  } catch (e) {}

  // --- Datos empresa (arriba izquierda) ---
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#222')
    .text('Reconstructora Unión S.A', 36, 36);
  doc.fontSize(10).font('Helvetica').fillColor('#333')
    .text('CUIT: 30-71671756-5', 36, 54)
    .text('Olavarría, Pcia. de Buenos Aires', 36, 68)
    .text('olavarria@reconstructoraunion.com', 36, 82);

  // --- Logo.png centrado arriba (tamaño reducido un 30%) ---
  try {
    const logoPath = path.join(process.cwd(), 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoWidth = 105;
      doc.image(logoPath, (595 - logoWidth) / 2, 25, { width: logoWidth });
    }
  } catch (e) {}

  // --- Datos cliente (arriba derecha) ---
  const boxWidth = 190;
  const clientX = 595 - 36 - boxWidth;
  let yCliente = 36;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#222')
    .text(nombreCliente, clientX, yCliente, { width: boxWidth, align: 'right' });
  yCliente += 18;
  doc.font('Helvetica').fontSize(10).fillColor('#222')
    .text(`CUIT: ${cuitCliente}`, clientX, yCliente, { width: boxWidth, align: 'right' });
  yCliente += 14;
  doc.text(`Fecha de emisión: ${fechaEmision}`, clientX, yCliente, { width: boxWidth, align: 'right' });
  yCliente += 14;
  if (fechaValidez && fechaValidez.trim().length > 0) {
    doc.text(`Validez del presupuesto: ${fechaValidez}`, clientX, yCliente, { width: boxWidth, align: 'right' });
  }

  // --- Leyenda alineada a izquierda, espacio abajo, una sola línea ---
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#000')
    .text('Presupuesto por Ud. requerido', 36, 200, { align: 'left', width: 500 });

  // --- Tabla de productos de margen a margen ---
  const tableLeft = 36;
  const tableRight = 559; // 595 - 36
  const tableWidth = tableRight - tableLeft;
  const col = [
    tableLeft,
    tableLeft + Math.floor(tableWidth * 0.10),             // Cantidad
    tableLeft + Math.floor(tableWidth * 0.10) + Math.floor(tableWidth * 0.46), // Descripción
    tableLeft + Math.floor(tableWidth * 0.10) + Math.floor(tableWidth * 0.46) + Math.floor(tableWidth * 0.22), // Precio
    tableRight // Total
  ];

  const tableTop = 235;

  // Títulos de columnas alineados a la izquierda (precio unitario)
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
  doc.text('Cant.', col[0], tableTop, { width: col[1]-col[0], align:'left' });
  doc.text('Descripción', col[1], tableTop, { width: col[2]-col[1], align:'left' });
  doc.text('Precio unitario', col[2], tableTop, { width: col[3]-col[2], align:'left' });
  doc.text('Total', col[3], tableTop, { width: col[4]-col[3], align:'left' });

  let y = tableTop + 18;
  let totalGeneral = 0;
  doc.font('Helvetica').fontSize(10).fillColor('#111');
  productos.forEach(prod => {
    const {cantidad, descripcion, precio} = prod;
    const total = cantidad * precio;
    totalGeneral += total;
    doc.text(cantidad, col[0], y, { width: col[1]-col[0], align:'center' });
    doc.text(descripcion, col[1], y, { width: col[2]-col[1], align:'left' });
    doc.text(`$${formatMonto(precio)}`, col[2], y, { width: col[3]-col[2], align:'left' });
    doc.text(`$${formatMonto(total)}`, col[3], y, { width: col[4]-col[3], align:'left' });
    y += 22;
  });

  // --- Total final de la tabla ---
  doc.moveTo(col[0], y+2).lineTo(col[4], y+2).strokeColor('#000').stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  const leyendaTotal = ivaIncluido ? 'Total (IVA Incluido):' : 'Total:';
  doc.text(leyendaTotal, col[2], y+10, { width: col[3]-col[2], align:'right' });
  doc.text(`$${formatMonto(totalGeneral)}`, col[3], y+10, { width: col[4]-col[3], align:'right' });

  // --- Condiciones de pago debajo de la tabla (negrita + texto debajo) ---
  y += 36;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#222')
    .text('Condiciones de pago:', tableLeft, y, { width: tableWidth, align: 'left' });
  y += 16;
  doc.font('Helvetica').fontSize(11).fillColor('#222')
    .text(condiciones, tableLeft, y, { width: tableWidth, align: 'left' });

  // --- Observaciones debajo de condiciones de pago ---
  if (observaciones && observaciones.trim().length > 0) {
    y += 28;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#222')
      .text('Observaciones:', tableLeft, y, { width: tableWidth, align: 'left' });
    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#222')
      .text(observaciones, tableLeft, y, { width: tableWidth, align: 'left' });
  }

  doc.end();
  doc.pipe(res);
};
