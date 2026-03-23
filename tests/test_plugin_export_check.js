const fs = require('fs');
const path = require('path');

const pluginPath = path.resolve('./plugins/PluginBase.ts');

// Read the content of PluginBase.ts
try {
    const content = fs.readFileSync(pluginPath, 'utf8');
    console.log(`Content read successfully from ${pluginPath}`);

    // Check for the presence of the 'export' keyword, which is required for external use.
    const isExported = content.includes('export ');

    console.log(`PluginBase.ts content snippet:\
${content.substring(0, 100)}...`);
    console.log(`Is Plugin class exported? ${isExported}`);

    if (!isExported) {
        console.error("VERIFICATION FAILED: The 'Plugin' class is unexported, preventing external usage as noted in the blackboard.");
        process.exit(1);
    } else {
        console.log("VERIFICATION PASSED: The class appears to be exported.");
        process.exit(0);
    }
} catch (e) {
    console.error(`Error reading plugin file: ${e.message}`);
    process.exit(1);
}