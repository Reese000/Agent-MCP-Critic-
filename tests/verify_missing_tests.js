// verify_missing_tests.js
const srcFiles = JSON.parse(process.argv[2]);
const testData = JSON.parse(process.argv[3]);

const testFiles = testData.files.map(f => f.name);
const missingTests = srcFiles
  .filter(file => file.endsWith('.ts'))
  .filter(srcFile => {
    const baseName = srcFile.replace('.ts', '');
    return !testFiles.some(testFile => 
      testFile.toLowerCase().includes(baseName.toLowerCase()));
  });

console.log(JSON.stringify(missingTests));