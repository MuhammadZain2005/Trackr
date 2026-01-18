// backend/routes/latex.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * POST /api/compile-latex
 * Compiles LaTeX code to PDF using pdflatex/pdfTeX
 */
router.post('/compile-latex', async (req, res) => {
  try {
    const { latexCode } = req.body;

    if (!latexCode || typeof latexCode !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid latexCode' });
    }

    // Create temporary directory
    const tempDir = path.join(os.tmpdir(), `latex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create temp directory:', err);
      return res.status(500).json({ error: 'Could not create temporary directory' });
    }

    const texFile = path.join(tempDir, 'resume.tex');
    const pdfFile = path.join(tempDir, 'resume.pdf');

    // Write LaTeX code to file
    try {
      fs.writeFileSync(texFile, latexCode, 'utf8');
    } catch (err) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return res.status(500).json({ error: 'Could not write LaTeX file' });
    }

    // Run pdflatex
    const command = `cd "${tempDir}" && pdflatex -interaction=nonstopmode -halt-on-error "${texFile}" > /dev/null 2>&1`;

    exec(command, { timeout: 60000, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Always try to send PDF if it exists, even if there was an error
      const pdfExists = fs.existsSync(pdfFile);

      // Clean up after response is sent
      setTimeout(() => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, 1000);

      if (!pdfExists) {
        if (error) {
          console.error('pdflatex error:', error.message);
        }
        return res.status(400).json({ 
          error: 'LaTeX compilation failed',
          details: 'pdflatex could not generate PDF. Check your LaTeX syntax.'
        });
      }

      // Read and send PDF
      try {
        const pdfBuffer = fs.readFileSync(pdfFile);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
        return res.send(pdfBuffer);
      } catch (err) {
        console.error('Error reading PDF:', err);
        return res.status(500).json({ error: 'Could not read generated PDF' });
      }
    });

  } catch (err) {
    console.error('Compile error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: err.message 
    });
  }
});

module.exports = router;