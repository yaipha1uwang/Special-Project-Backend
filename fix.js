import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir('./src', (filePath) => {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (content.includes('@/app/api/utils/sql')) {
        let relative = path.relative(path.dirname(filePath), path.join('./src/api/utils/sql.js')).replace(/\\/g, '/');
        if (!relative.startsWith('.')) relative = './' + relative;
        content = content.replace(/['"]@\/app\/api\/utils\/sql['"]/g, `'${relative}'`);
        changed = true;
    }
    if (content.includes('@/auth')) {
        let relative = path.relative(path.dirname(filePath), path.join('./src/auth.js')).replace(/\\/g, '/');
        if (!relative.startsWith('.')) relative = './' + relative;
        content = content.replace(/['"]@\/auth['"]/g, `'${relative}'`);
        changed = true;
    }
    if (content.includes('@/app/api/emails/otp')) {
        let relative = path.relative(path.dirname(filePath), path.join('./src/api/emails/otp.jsx')).replace(/\\/g, '/');
        if (!relative.startsWith('.')) relative = './' + relative;
        content = content.replace(/['"]@\/app\/api\/emails\/otp['"]/g, `'${relative}'`);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
    }
});
