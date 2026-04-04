const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/mahmoudBens/Nomenclature-des-medicaments-en-algerie/master/medicament.json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const meds = JSON.parse(data);
      // Extract unique brand names (Nom de marque)
      const uniqueNames = new Set();
      meds.forEach(med => {
        if (med.nomMarque) {
          uniqueNames.add(med.nomMarque.trim());
        } else if (med.Marque) {
          uniqueNames.add(med.Marque.trim());
        } else if (med.nom_marque) {
           uniqueNames.add(med.nom_marque.trim());
        }
      });
      
      // If the structure is different, let's just log the first item to see
      if (uniqueNames.size === 0 && meds.length > 0) {
         console.log("Sample item:", meds[0]);
      }
      
      const namesArray = Array.from(uniqueNames).sort();
      console.log(`Found ${namesArray.length} unique medications.`);
      
      if (namesArray.length > 0) {
        const fileContent = `export const COMMON_MEDICINES = ${JSON.stringify(namesArray, null, 2)};\n`;
        fs.writeFileSync('./src/data/medicines.ts', fileContent);
        console.log('Successfully updated src/data/medicines.ts');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e);
    }
  });
}).on('error', (e) => {
  console.error('Error fetching data:', e);
});
