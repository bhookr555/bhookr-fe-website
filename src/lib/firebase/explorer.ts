/**
 * Firestore Database Explorer
 * 
 * This utility helps you explore your existing Firestore database
 * and understand its structure before integration.
 * 
 * Usage in browser console:
 * 1. Start your dev server: npm run dev
 * 2. Open browser console (F12)
 * 3. Import and run these functions
 */

import { db } from '@/lib/firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  limit,
  doc,
  getDoc 
} from 'firebase/firestore';

/**
 * List all accessible collections and their document counts
 */
export async function exploreCollections() {
  console.log('🔍 Exploring Firestore Collections...\n');
  
  // Common collection names to check
  const commonCollections = [
    'users',
    'orders',
    'subscriptions',
    'products',
    'menu',
    'menu_items',
    'customers',
    'transactions',
    'payments',
    'deliveries',
    'cart',
    'reviews',
    'settings',
    'categories'
  ];
  
  const found: string[] = [];
  
  for (const collectionName of commonCollections) {
    try {
      const collRef = collection(db, collectionName);
      const snapshot = await getDocs(collRef);
      
      if (!snapshot.empty) {
        console.log(`✅ ${collectionName}: ${snapshot.size} documents`);
        found.push(collectionName);
      }
    } catch {
      // Collection doesn't exist or no permission
    }
  }
  
  if (found.length === 0) {
    console.log('⚠️  No collections found. Either:');
    console.log('   1. Database is empty');
    console.log('   2. Security rules block access');
    console.log('   3. Collection names are different');
    console.log('\n💡 Try: exploreCustomCollection("your_collection_name")');
  } else {
    console.log(`\n📊 Found ${found.length} collections`);
    console.log('\n💡 Next steps:');
    console.log('   • viewCollection("collection_name") - See documents');
    console.log('   • analyzeCollection("collection_name") - Analyze structure');
  }
  
  return found;
}

/**
 * View sample documents from a collection
 */
export async function viewCollection(collectionName: string, maxDocs = 5) {
  console.log(`\n📄 Viewing "${collectionName}" collection (max ${maxDocs} docs)...\n`);
  
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, limit(maxDocs));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty or doesn\'t exist');
      return;
    }
    
    console.log(`Total documents shown: ${snapshot.size}`);
    console.log('─'.repeat(50));
    
    snapshot.docs.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}: ${doc.id}`);
      console.log(doc.data());
    });
    
    console.log('\n─'.repeat(50));
    console.log(`✅ Displayed ${snapshot.size} documents from "${collectionName}"`);
    
  } catch (error) {
    console.error(`❌ Error accessing "${collectionName}":`, error);
    console.log('\n💡 Possible reasons:');
    console.log('   • Security rules block access');
    console.log('   • Collection name is incorrect');
    console.log('   • Firebase not configured');
  }
}

/**
 * Analyze the structure of documents in a collection
 */
export async function analyzeCollection(collectionName: string, sampleSize = 10) {
  console.log(`\n🔬 Analyzing "${collectionName}" structure...\n`);
  
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, limit(sampleSize));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty or doesn\'t exist');
      return;
    }
    
    // Collect all field names and types
    const fieldInfo: Record<string, Set<string>> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(field => {
        if (!fieldInfo[field]) {
          fieldInfo[field] = new Set();
        }
        fieldInfo[field].add(typeof data[field]);
      });
    });
    
    console.log(`📊 Analyzed ${snapshot.size} documents\n`);
    console.log('Field Name                    | Type(s)');
    console.log('─'.repeat(50));
    
    Object.entries(fieldInfo).forEach(([field, types]) => {
      const typeStr = Array.from(types).join(', ');
      console.log(`${field.padEnd(28)} | ${typeStr}`);
    });
    
    console.log('\n✅ Analysis complete!');
    
    if (snapshot.docs.length > 0 && snapshot.docs[0]) {
      console.log('\n💡 Sample document structure:');
      console.log(snapshot.docs[0].data());
      
      return {
        fields: Object.keys(fieldInfo),
        sampleData: snapshot.docs[0].data()
      };
    }
    
    return {
      fields: Object.keys(fieldInfo),
      sampleData: null
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing "${collectionName}":`, error);
  }
}

/**
 * Get a specific document
 */
export async function getDocument(collectionName: string, documentId: string) {
  console.log(`\n📄 Fetching document: ${collectionName}/${documentId}\n`);
  
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('⚠️  Document not found');
      return null;
    }
    
    console.log('✅ Document found:');
    console.log(docSnap.data());
    
    return docSnap.data();
    
  } catch (error) {
    console.error('❌ Error fetching document:', error);
  }
}

/**
 * Search for documents with a specific field value
 */
export async function searchByField(
  collectionName: string, 
  fieldName: string, 
  value: any
) {
  console.log(`\n🔍 Searching ${collectionName} where ${fieldName} = ${value}\n`);
  
  try {
    const { query: firestoreQuery, where } = await import('firebase/firestore');
    
    const collRef = collection(db, collectionName);
    const q = firestoreQuery(collRef, where(fieldName, '==', value));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('⚠️  No documents found');
      return [];
    }
    
    console.log(`✅ Found ${snapshot.size} documents:`);
    
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    results.forEach((doc, index) => {
      console.log(`\n${index + 1}. Document ID: ${doc.id}`);
      console.log(doc);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Search error:', error);
    console.log('\n💡 You may need to create an index for this query');
  }
}

/**
 * Check if a specific collection exists and is accessible
 */
export async function checkCollection(collectionName: string) {
  console.log(`\n🔍 Checking "${collectionName}"...\n`);
  
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef, limit(1));
    const snapshot = await getDocs(q);
    
    console.log(`✅ Collection exists and is accessible`);
    console.log(`   Documents: ${snapshot.empty ? 'Empty' : 'Has data'}`);
    
    if (!snapshot.empty && snapshot.docs[0]) {
      console.log(`\n   Sample document ID: ${snapshot.docs[0].id}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Cannot access collection`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

/**
 * Export collection data (for backup or analysis)
 */
export async function exportCollection(collectionName: string) {
  console.log(`\n📥 Exporting "${collectionName}"...\n`);
  
  try {
    const collRef = collection(db, collectionName);
    const snapshot = await getDocs(collRef);
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty');
      return null;
    }
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Exported ${data.length} documents`);
    console.log('\n💡 Data is in the return value. You can:');
    console.log('   • Copy it to a file');
    console.log('   • Use JSON.stringify(data) to format it');
    console.log('   • Save it with: copy(JSON.stringify(data, null, 2))');
    
    return data;
    
  } catch (error) {
    console.error('❌ Export error:', error);
    return null;
  }
}

// Browser console helper
if (typeof window !== 'undefined') {
  (window as any).firestoreExplorer = {
    exploreCollections,
    viewCollection,
    analyzeCollection,
    getDocument,
    searchByField,
    checkCollection,
    exportCollection,
  };
  
  console.log('\n🔥 Firestore Explorer loaded!');
  console.log('\nAvailable functions:');
  console.log('  • exploreCollections() - Find all collections');
  console.log('  • viewCollection(name) - View documents');
  console.log('  • analyzeCollection(name) - Analyze structure');
  console.log('  • getDocument(collection, id) - Get specific doc');
  console.log('  • searchByField(collection, field, value) - Search');
  console.log('  • checkCollection(name) - Check if exists');
  console.log('  • exportCollection(name) - Export data');
  console.log('\n💡 Start with: exploreCollections()');
}

export default {
  exploreCollections,
  viewCollection,
  analyzeCollection,
  getDocument,
  searchByField,
  checkCollection,
  exportCollection,
};

