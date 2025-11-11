// Production readiness check
const fs = require('fs');
const path = require('path');

console.log('🚀 Production Readiness Check\n');

const checks = [];

// Check package.json has start script
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.scripts && pkg.scripts.start) {
    checks.push({ check: 'package.json has start script', status: '✅' });
  } else {
    checks.push({ check: 'package.json has start script', status: '❌' });
  }
} catch (e) {
  checks.push({ check: 'package.json exists and is valid', status: '❌' });
}

// Check server.js exists
if (fs.existsSync('server.js')) {
  checks.push({ check: 'server.js exists', status: '✅' });
} else {
  checks.push({ check: 'server.js exists', status: '❌' });
}

// Check for node_modules in gitignore
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('node_modules')) {
    checks.push({ check: 'node_modules in .gitignore', status: '✅' });
  } else {
    checks.push({ check: 'node_modules in .gitignore', status: '❌' });
  }
}

// Display results
checks.forEach(item => {
  console.log(`${item.status} ${item.check}`);
});

console.log('\n📊 Summary:');
const passed = checks.filter(c => c.status === '✅').length;
const total = checks.length;
console.log(`${passed}/${total} checks passed`);

if (passed === total) {
  console.log('🎉 Your app is ready for deployment!');
} else {
  console.log('⚠️  Please fix the issues above before deploying.');
}
