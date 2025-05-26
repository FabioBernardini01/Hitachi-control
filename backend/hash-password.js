const bcrypt = require('bcrypt');

const password = 'password'; // Cambia con la password che vuoi hashare
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log('Hash generato:', hash);
}).catch(err => {
  console.error('Errore:', err);
});

