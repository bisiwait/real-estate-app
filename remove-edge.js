const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.tsx') || name.endsWith('.ts')) {
        files.push(name);
      }
    }
  }
  return files;
}

const allFiles = getFiles('src/app');
let count = 0;

for (const f of allFiles) {
  try {
    let content = fs.readFileSync(f, 'utf8');
    const regex = /export const runtime = ['\"]edge['\"];?\s*/g;
    if (regex.test(content)) {
      content = content.replace(regex, '');
      fs.writeFileSync(f, content, 'utf8');
      count++;
    }
  } catch (e) {
    console.error('Error on ' + f + ': ' + e.message);
  }
}

console.log('Removed runtime=edge from ' + count + ' files');
