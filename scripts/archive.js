const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'siepomagacmc',
});

const db = admin.firestore();
const DOC_PATH = 'artifacts/my-sports-app-v1/public/data/sportsAppData/mainDatabase';

async function main() {
  const snap = await db.doc(DOC_PATH).get();
  if (!snap.exists) {
    console.error('Document not found:', DOC_PATH);
    process.exit(1);
  }

  const data = snap.data();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const outDir = path.join('archive');
  const outFile = path.join(outDir, `${date}.json`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Saved ${outFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
