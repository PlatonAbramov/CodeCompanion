/**
 * Safe wrapper for pdf-parse that avoids test file loading issues
 */

// Require the library directly to avoid import-time test file execution
const pdfParse = require('pdf-parse');

export default pdfParse;