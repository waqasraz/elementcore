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

        // Create combined file
        const combined = `${elementCore}\n\n${listComponent}\n\n${tableComponent}`;

        // Write unminified combined file
        fs.writeFileSync('dist/elementcore.js', combined);
        console.log('✓ Created dist/elementcore.js');

        // Minify the combined file
        const minified = await minify(combined, {
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
        const versionComment = `/*! ElementCore v1.0.0 | MIT License | https://github.com/waqasra2022skipq/elementcore */\n`;
        const minifiedWithComment = versionComment + minified.code;

        // Write minified file
        fs.writeFileSync('dist/elementcore.min.js', minifiedWithComment);
        console.log('✓ Created dist/elementcore.min.js');

        // Copy individual components to dist
        fs.writeFileSync('dist/elementcore-core.js', elementCore);
        fs.writeFileSync('dist/ListComponent.js', listComponent);
        fs.writeFileSync('dist/TableComponent.js', tableComponent);
        
        console.log('✓ Created individual component files');

        // Get file sizes
        const coreSize = fs.statSync('dist/elementcore.js').size;
        const minSize = fs.statSync('dist/elementcore.min.js').size;
        
        console.log(`\nBuild complete!`);
        console.log(`- Full version: ${(coreSize / 1024).toFixed(2)} KB`);
        console.log(`- Minified: ${(minSize / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

buildDist(); 