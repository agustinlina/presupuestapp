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
    fechaEmision = '',
    ocultarTotal = false
  } = data;

  // Usar la fecha del formulario, o la actual si está vacía
  let fechaEmitir = fechaEmision;
  if (!fechaEmitir || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaEmitir)) {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    fechaEmitir = `${dd}/${mm}/${yyyy}`;
  }

  // Nombre del archivo
  const nombreArchivo = generarNombreArchivo(nombreCliente || "Presupuesto", fechaEmitir);

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
      doc.image(logoPath, (595 - logoWidth) / 2, 25, { width
