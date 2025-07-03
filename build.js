const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function buildDist() {
    console.log('Building ElementCore distribution files...');
    
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist');
    }

    try {
        // Read source files
        const elementCore = fs.readFileSync('src/elementcore.js', 'utf8');
        const listComponent = fs.readFileSync('src/ListComponent.js', 'utf8');
        const tableComponent = fs.readFileSync('src/TableComponent.js', 'utf8');

        // Build ElementCore core only (no combined file)
        fs.writeFileSync('dist/elementcore.js', elementCore);
        console.log('✓ Created dist/elementcore.js (core only)');

        // Minify ElementCore core
        const minified = await minify(elementCore, {
            mangle: true,
            compress: {
                drop_console: false,
                drop_debugger: true
            },
            format: {
                comments: /^!|@preserve|@license|@cc_on/i
            }
        });

        if (minified.error) {
            throw minified.error;
        }

        // Add version comment
        const versionComment = `/*! ElementCore v1.0.0 | MIT License | https://github.com/mubbasher16/elementcore */\n`;
        const minifiedWithComment = versionComment + minified.code;

        // Write minified file
        fs.writeFileSync('dist/elementcore.min.js', minifiedWithComment);
        console.log('✓ Created dist/elementcore.min.js');

        // Copy components to dist (separate from core)
        fs.writeFileSync('dist/ListComponent.js', listComponent);
        fs.writeFileSync('dist/TableComponent.js', tableComponent);
        
        console.log('✓ Created separate component files');

        // Get file sizes
        const coreSize = fs.statSync('dist/elementcore.js').size;
        const minSize = fs.statSync('dist/elementcore.min.js').size;
        const listSize = fs.statSync('dist/ListComponent.js').size;
        const tableSize = fs.statSync('dist/TableComponent.js').size;
        
        console.log(`\nBuild complete!`);
        console.log(`- ElementCore: ${(coreSize / 1024).toFixed(2)} KB`);
        console.log(`- ElementCore minified: ${(minSize / 1024).toFixed(2)} KB`);
        console.log(`- ListComponent: ${(listSize / 1024).toFixed(2)} KB`);
        console.log(`- TableComponent: ${(tableSize / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

buildDist(); 