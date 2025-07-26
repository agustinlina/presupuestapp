const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Método no permitido');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let texto = '';
    try {
      texto = JSON.parse(body).texto;
    } catch (err) {
      res.statusCode = 400;
      res.end('Error en el texto');
      return;
    }

    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=archivo.pdf');
      res.statusCode = 200;
      res.end(pdfData);
    });
    doc.text(texto || '(Sin texto pegado)');
    doc.end();
  });
};
