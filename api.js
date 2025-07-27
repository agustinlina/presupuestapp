const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    nombreCliente = '', cuitCliente = '', condiciones = '', productos = []
  } = data;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=presupuesto.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 36 });

  // --- Marca de agua (fondo.svg) grande y centrada ---
  const fondoPath = path.join(process.cwd(), 'fondo.svg');
  if (fs.existsSync(fondoPath)) {
    const svgFondo = fs.readFileSync(fondoPath, 'utf8');
    // Calcular el centro (ancho de página A4 = 595, alto = 842, menos margen)
    doc.save();
    doc.opacity(0.08);
    // Ajusta el tamaño de la marca de agua según tu SVG (acá 430x430 centrado)
    doc.svg(svgFondo, 82, 150, { width: 430, height: 430 });
    doc.opacity(1);
    doc.restore();
  }

  // --- Datos empresa (arriba izquierda) ---
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#222')
    .text('Reconstructora Unión S.A', 36, 36);
  doc.fontSize(10).font('Helvetica').fillColor('#333')
    .text('CUIT: 30716717565', 36, 54)
    .text('Olavarría, Pcia. de Buenos Aires', 36, 68)
    .text('olavarria@reconstructoraunion.com', 36, 82);

  // --- Datos cliente (arriba derecha) ---
  const rightX = 360;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111')
    .text('Presupuestado para:', rightX, 36);
  doc.font('Helvetica').fontSize(10).fillColor('#222')
    .text(nombreCliente, rightX, 54)
    .text(`CUIT: ${cuitCliente}`, rightX, 68)
    .text(`Condiciones: ${condiciones}`, rightX, 82)
    .text('Fecha:', rightX, 96)
    .text(new Date().toLocaleDateString('es-AR'), rightX, 108);

  // --- Imagen logo.svg entre ambos bloques ---
  const logoPath = path.join(process.cwd(), 'logo.svg');
  if (fs.existsSync(logoPath)) {
    const svgLogo = fs.readFileSync(logoPath, 'utf8');
    // Centrado horizontal arriba, debajo de los datos, ajusta tamaño si lo necesitás
    doc.svg(svgLogo, 210, 36, { width: 150, height: 90 }); // Ajusta Y (36) si necesitas más abajo
  }

  // --- Leyenda alineada a izquierda y con más espacio abajo ---
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#000')
    .text('Presupuesto por Ud. requerido', 36, 150, { align: 'left', width: 500, continued: false });
  // Espacio extra debajo de la leyenda
  let leyendaY = 180; // Deja espacio hasta la tabla

  // --- Tabla de productos ---
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
  const col = [36, 110, 340, 410, 510];
  const tableTop = leyendaY;
  doc.text('Cant.', col[0], tableTop, { width: col[1]-col[0], align:'center' });
  doc.text('Descripción', col[1], tableTop, { width: col[2]-col[1], align:'center' });
  doc.text('Precio/U', col[2], tableTop, { width: col[3]-col[2], align:'center' });
  doc.text('Total', col[3], tableTop, { width: col[4]-col[3], align:'center' });

  let y = tableTop + 18;
  let totalGeneral = 0;
  doc.font('Helvetica').fontSize(10).fillColor('#111');
  productos.forEach(prod => {
    const {cantidad, descripcion, precio} = prod;
    const total = cantidad * precio;
    totalGeneral += total;
    doc.text(cantidad, col[0], y, { width: col[1]-col[0], align:'center' });
    doc.text(descripcion, col[1], y, { width: col[2]-col[1], align:'left' });
    doc.text(`$${precio.toFixed(2)}`, col[2], y, { width: col[3]-col[2], align:'center' });
    doc.text(`$${total.toFixed(2)}`, col[3], y, { width: col[4]-col[3], align:'center' });
    y += 22;
  });

  // --- Total final ---
  doc.moveTo(col[0], y+2).lineTo(col[4], y+2).strokeColor('#000').stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  doc.text('Total:', col[2], y+10, { width: col[3]-col[2], align:'center' });
  doc.text(`$${totalGeneral.toFixed(2)}`, col[3], y+10, { width: col[4]-col[3], align:'center' });

  doc.end();
  doc.pipe(res);
};

