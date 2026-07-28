import dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('ERROR: Missing required Firebase environment variables in .env.local!');
  console.error({
    projectId: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
    privateKey: privateKey ? 'SET' : 'MISSING',
  });
  process.exit(1);
}

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    })
  : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'bindudasari31@gmail.com';
const NAME = 'Bindu Dasari';
const ROLE = 'admin';
const PASSWORD = process.env.USER_INIT_PASSWORD || 'BinduBhookr@2026';

async function main() {
  console.log(`Setting up user account for ${EMAIL}...`);
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(EMAIL);
      console.log(`User already exists in Firebase Auth with UID: ${userRecord.uid}`);
      // Update password
      await auth.updateUser(userRecord.uid, {
        password: PASSWORD,
        displayName: NAME,
      });
      console.log(`Updated password for ${EMAIL}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: EMAIL,
          password: PASSWORD,
          displayName: NAME,
        });
        console.log(`Created new Firebase Auth user with UID: ${userRecord.uid}`);
      } else {
        throw err;
      }
    }

    // Set / update Firestore user document
    await db.collection('users').doc(userRecord.uid).set(
      {
        email: EMAIL,
        name: NAME,
        role: ROLE,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`Successfully configured Firestore document users/${userRecord.uid} with role: ${ROLE}`);
    console.log('----------------------------------------------------');
    console.log(`Login Email: ${EMAIL}`);
    console.log(`Login Password: ${PASSWORD}`);
    console.log(`Assigned Role: ${ROLE}`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Failed to create/update user:', error);
    process.exit(1);
  }
}

main();
