/**
 * Automated Verification Suite for Deterministic OCR & Invoice Extraction
 */

import { DeterministicInvoiceExtractor, calculateStringSimilarity, parseDateString, parseFinancialNumber } from './src/services/ocr/deterministicExtractor.js';
import { convertUnitQuantity, normalizeUnit } from './src/services/ocr/unitConversionService.js';
import { calculateOtsuThreshold } from './src/utils/imagePreprocessing.js';

console.log('=== TEST SUITE: NUMÉRISATION & OCR DÉTERMINISTE (SANS IA) ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${detail || ''}`);
    failCount++;
  }
}

// 1. UNIT CONVERSION TESTS
console.log('\n--- 1. Tests de conversion des unités déterministe ---');

const kgToG = convertUnitQuantity(2.5, 'kg', 'g');
assert(kgToG.convertedQuantity === 2500, 'Conversion 2.5 kg -> g = 2500 g', `Got ${kgToG.convertedQuantity}`);

const gToKg = convertUnitQuantity(750, 'g', 'kg');
assert(gToKg.convertedQuantity === 0.75, 'Conversion 750 g -> kg = 0.75 kg', `Got ${gToKg.convertedQuantity}`);

const lToCl = convertUnitQuantity(1.5, 'L', 'cl');
assert(lToCl.convertedQuantity === 150, 'Conversion 1.5 L -> cl = 150 cl', `Got ${lToCl.convertedQuantity}`);

const cartonToBottles = convertUnitQuantity(3, 'carton', 'bouteille', 12);
assert(cartonToBottles.convertedQuantity === 36, 'Conversion 3 cartons de 12 bouteilles -> 36 bouteilles', `Got ${cartonToBottles.convertedQuantity}`);

const sacToKg = convertUnitQuantity(2, 'sac', 'kg', 25);
assert(sacToKg.convertedQuantity === 50, 'Conversion 2 sacs de 25 kg -> 50 kg', `Got ${sacToKg.convertedQuantity}`);

// 2. FUZZY STRING SIMILARITY TESTS
console.log('\n--- 2. Tests de similarité et fuzzy matching (sans IA) ---');

const simExact = calculateStringSimilarity('Torréfaction Terres de Café', 'Torrefaction Terres de Cafe');
assert(simExact >= 0.9, 'Similarité haute avec accents omis', `Score: ${simExact}`);

const simOcrTypo = calculateStringSimilarity('Lait Demi-Écrémé Délice', 'Lait Demi-Ecreme Delice 1L');
assert(simOcrTypo >= 0.65, 'Similarité bonne avec typo/suffixe OCR', `Score: ${simOcrTypo}`);

// 3. FINANCIAL & DATE PARSING TESTS
console.log('\n--- 3. Tests de parsing financier et dates ---');

assert(parseFinancialNumber('1 250,500 DT') === 1250.5, 'Parsing 1 250,500 DT = 1250.5', `Got ${parseFinancialNumber('1 250,500 DT')}`);
assert(parseFinancialNumber('245.80 €') === 245.8, 'Parsing 245.80 € = 245.8', `Got ${parseFinancialNumber('245.80 €')}`);

assert(parseDateString('15/10/2025') === '2025-10-15', 'Date 15/10/2025 -> 2025-10-15', `Got ${parseDateString('15/10/2025')}`);
assert(parseDateString('12 Octobre 2025') === '2025-10-12', 'Date littérale "12 Octobre 2025" -> 2025-10-12', `Got ${parseDateString('12 Octobre 2025')}`);

// 4. FULL INVOICE DETERMINISTIC EXTRACTION TEST
console.log('\n--- 4. Test d\'extraction complète de facture standard ---');

const sampleInvoiceText = `
TORRÉFACTION DU SUD SARL
Avenue Habib Bourguiba, Tunis
MF: 1234567/A/M/000
FACTURE N° FAC-2026-089
Date: 15/02/2026
Échéance: 15/03/2026

Désignation                Qté   Unité   P.U. HT   TVA    Total HT
Café Grain Terres Bio       10     kg     35.000   19%    350.000
Lait Entier Stérilisé       20      L      1.450   19%     29.000
Sirop Vanille 70cl           4   bouteille 12.500  19%     50.000

Total HT: 429.000 DT
TVA 19%: 81.510 DT
Total TTC: 510.510 DT
Net à payer: 510.510 DT
`;

const existingSuppliers = [
  { id: 'sup_1', name: 'Torréfaction du Sud SARL', taxNumber: '1234567/A/M/000' }
];

const existingIngredients = [
  { id: 'ing_1', name: 'Café Grain Terres Bio', unit: 'kg', costPerUnit: 34 },
  { id: 'ing_2', name: 'Lait Entier', unit: 'L', costPerUnit: 1.4 },
  { id: 'ing_3', name: 'Sirop de Vanille', unit: 'bouteille', costPerUnit: 12 }
];

const result = DeterministicInvoiceExtractor.extract(sampleInvoiceText, existingSuppliers, existingIngredients);

assert(result.supplierName.value === 'Torréfaction du Sud SARL', 'Fournisseur extrait avec succès', `Got ${result.supplierName.value}`);
assert(result.supplierName.confidence === 'high', 'Confiance fournisseur Élevée', `Got ${result.supplierName.confidence}`);
assert(result.invoiceNumber.value === 'FAC-2026-089', 'N° de facture extrait', `Got ${result.invoiceNumber.value}`);
assert(result.invoiceDate.value === '2026-02-15', 'Date facture extraite', `Got ${result.invoiceDate.value}`);
assert(result.dueDate.value === '2026-03-15', 'Date échéance extraite', `Got ${result.dueDate.value}`);
assert(result.subtotal.value === 429, 'Sous-total HT vérifié', `Got ${result.subtotal.value}`);
assert(result.totalAmount.value === 510.51, 'Total TTC vérifié', `Got ${result.totalAmount.value}`);
assert(result.items.length >= 3, `Lignes articles détectées (${result.items.length} lignes)`, `Count: ${result.items.length}`);

// Check ingredient mapping
const cafeLine = result.items.find(i => i.itemName.toLowerCase().includes('café') || i.itemName.toLowerCase().includes('cafe'));
assert(cafeLine !== undefined, 'Ligne café trouvée');
if (cafeLine) {
  assert(cafeLine.matchedIngredientId === 'ing_1', 'Rattachement automatique à la fiche ingrédient Café', `Matched ID: ${cafeLine.matchedIngredientId}`);
}

// 5. IMAGE PREPROCESSING ALGORITHM TEST
console.log('\n--- 5. Test de l\'algorithme de binarisation Otsu ---');
const dummyImageData = new Uint8ClampedArray(400); // 100 pixels
// Half dark (30), half bright (220)
for (let i = 0; i < 200; i += 4) {
  dummyImageData[i] = 30; dummyImageData[i+1] = 30; dummyImageData[i+2] = 30; dummyImageData[i+3] = 255;
}
for (let i = 200; i < 400; i += 4) {
  dummyImageData[i] = 220; dummyImageData[i+1] = 220; dummyImageData[i+2] = 220; dummyImageData[i+3] = 255;
}
const threshold = calculateOtsuThreshold(dummyImageData);
assert(threshold >= 30 && threshold <= 220, `Seuil d'Otsu calculé correctement (${threshold})`);

console.log(`\n========================================`);
console.log(`RÉSULTAT: ${passCount} réussis, ${failCount} échoués.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('TOUS LES TESTS DU MOTEUR DÉTERMINISTE SONT VALIDÉS !');
  process.exit(0);
}
