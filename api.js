const PDFDocument = require('pdfkit');
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const { texto } = JSON.parse(body);

      // Crear PDF en un buffer
      const doc = new PDFDocument();
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="archivo.pdf"');
        res.statusCode = 200;
        res.end(pdfData);
      });
      doc.text(texto || '(Sin texto pegado)');
      doc.end();
    });
  } else {
    res.statusCode = 405;
    res.end('Método no permitido');
  }
};
