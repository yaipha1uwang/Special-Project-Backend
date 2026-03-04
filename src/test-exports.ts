import route from './api/profile/password/route.js';
console.log('Exports:', Object.keys(route));
console.log('Has PUT:', typeof route.PUT === 'function');
