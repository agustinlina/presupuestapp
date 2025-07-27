const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

const LOGO_URL = 'https://reconstructoraunion.com/wp-content/uploads/2021/11/LogoRU_blanco.png';

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    return await res.buffer();
  } catch (e) {
    return null;
  }
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
    nombreCliente = '', cuitCliente = '', condiciones = '', productos = []
  } = data;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=presupuesto.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 36 });

  // Encabezado empresa y cliente
  doc.fontSize(12).fillColor('#fff').font('Helvetica-Bold');
  doc.text('Reconstructora Unión S.A', 36, 40);
  doc.fontSize(10).font('Helvetica').text('CUIT: 30716717565', 36, 60);
  doc.text('Olavarría, Pcia. de Buenos Aires', 36, 76);
  doc.text('olavarria@reconstructoraunion.com', 36, 92);

  // Logo
  const logoBuffer = await fetchImageBuffer(LOGO_URL);
  if (logoBuffer) doc.image(logoBuffer, 230, 36, { width: 120, height: 60 });

  // Datos cliente, arriba derecha
  doc.fontSize(12).fillColor('#fff').font('Helvetica-Bold');
  doc.text('Cliente:', 410, 40);
  doc.font('Helvetica').fontSize(10).fillColor('#ddd');
  doc.text(nombreCliente, 410, 58);
  doc.text(`CUIT: ${cuitCliente}`, 410, 72);
  doc.text(`Condiciones: ${condiciones}`, 410, 88);
  doc.text('Fecha:', 410, 104);
  doc.text(new Date().toLocaleDateString('es-AR'), 410, 116);

  // Leyenda
  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#fff');
  doc.text('Presupuesto por Ud. requerido', { align: 'center' });
  doc.moveDown();

  // Tabla productos
  doc.font('Helvetica-Bold').fontSize(11);
  const tableTop = 200;
  const col = [36, 110, 340, 410, 510];
  doc.text('Cant.', col[0], tableTop, { width: col[1]-col[0], align:'center' });
  doc.text('Descripción', col[1], tableTop, { width: col[2]-col[1], align:'center' });
  doc.text('Precio/U', col[2], tableTop, { width: col[3]-col[2], align:'center' });
  doc.text('Total', col[3], tableTop, { width: col[4]-col[3], align:'center' });

  let y = tableTop + 18;
  let totalGeneral = 0;
  doc.font('Helvetica').fontSize(10);
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

  // Total
  doc.moveTo(col[0], y+2).lineTo(col[4], y+2).strokeColor('#fff').stroke();
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total:', col[2], y+10, { width: col[3]-col[2], align:'center' });
  doc.text(`$${totalGeneral.toFixed(2)}`, col[3], y+10, { width: col[4]-col[3], align:'center' });

  doc.end();
  doc.pipe(res);
};
