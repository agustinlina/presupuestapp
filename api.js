const PDFDocument = require('pdfkit');

module.exports = (req, res) => {
  // Soporta tanto GET (por formulario simple) como POST (si prefieres AJAX)
  const texto =
    (req.method === "GET" && req.query && req.query.text) ||
    (req.method === "POST" && req.body && req.body.text) ||
    "Sin texto";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=archivo.pdf");

  const doc = new PDFDocument();
  doc.text(texto);
  doc.pipe(res);
  doc.end();
};
