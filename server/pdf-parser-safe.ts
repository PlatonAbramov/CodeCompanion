/**
 * Safe wrapper for pdf-parse that avoids test file loading issues
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the library function directly to bypass debug mode
const pdfParseMod = require('pdf-parse/lib/pdf-parse.js');

export default pdfParseMod;