"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Search, FileText, Download } from 'lucide-react';
import { PaymentLoader } from '@/components/shared/payment-loader';

// Import Firebase explorer functions
import {
  exploreCollections,
  viewCollection,
  analyzeCollection,
  getDocument,
  searchByField,
  exportCollection,
} from '@/lib/firebase/explorer';

export default function FirebaseExplorerPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [collections, setCollections] = useState<string[]>([]);
  
  const [collectionName, setCollectionName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [searchField, setSearchField] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const runCommand = async (command: () => Promise<any>, description: string) => {
    setLoading(true);
    setOutput(`⏳ ${description}...\n\n`);
    
    try {
      const result = await command();
      setOutput(prev => prev + `✅ Success!\n\n${JSON.stringify(result, null, 2)}`);
      return result;
    } catch (error) {
      setOutput(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExploreCollections = async () => {
    const result = await runCommand(
      exploreCollections,
      'Exploring all collections'
    );
    if (result) setCollections(result);
  };

  const handleViewCollection = async () => {
    if (!collectionName) {
      setOutput('⚠️ Please enter a collection name');
      return;
    }
    await runCommand(
      () => viewCollection(collectionName, 5),
      `Viewing collection: ${collectionName}`
    );
  };

  const handleAnalyzeCollection = async () => {
    if (!collectionName) {
      setOutput('⚠️ Please enter a collection name');
      return;
    }
    await runCommand(
      () => analyzeCollection(collectionName),
      `Analyzing collection: ${collectionName}`
    );
  };

  const handleGetDocument = async () => {
    if (!collectionName || !documentId) {
      setOutput('⚠️ Please enter both collection name and document ID');
      return;
    }
    await runCommand(
      () => getDocument(collectionName, documentId),
      `Getting document: ${collectionName}/${documentId}`
    );
  };

  const handleSearch = async () => {
    if (!collectionName || !searchField || !searchValue) {
      setOutput('⚠️ Please fill all search fields');
      return;
    }
    await runCommand(
      () => searchByField(collectionName, searchField, searchValue),
      `Searching ${collectionName} where ${searchField} = ${searchValue}`
    );
  };

  const handleExport = async () => {
    if (!collectionName) {
      setOutput('⚠️ Please enter a collection name');
      return;
    }
    const result = await runCommand(
      () => exportCollection(collectionName),
      `Exporting collection: ${collectionName}`
    );
    
    if (result) {
      // Download as JSON file
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collectionName}-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔥 Firebase Database Explorer</h1>
          <p className="text-muted-foreground">
            Explore and analyze your existing Firestore database
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Explore Collections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Explore Collections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleExploreCollections} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <PaymentLoader size="sm" className="mr-2" /> : null}
                  Find All Collections
                </Button>
                
                {collections.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Found Collections:</p>
                    <div className="space-y-1">
                      {collections.map(coll => (
                        <button
                          key={coll}
                          onClick={() => setCollectionName(coll)}
                          className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          📁 {coll}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  View Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="collection">Collection Name</Label>
                  <Input
                    id="collection"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="orders"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleViewCollection} disabled={loading} variant="outline">
                    View Docs
                  </Button>
                  <Button onClick={handleAnalyzeCollection} disabled={loading} variant="outline">
                    Analyze
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Get Document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Get Specific Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="docId">Document ID</Label>
                  <Input
                    id="docId"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="doc_12345"
                  />
                </div>
                <Button onClick={handleGetDocument} disabled={loading} className="w-full">
                  Get Document
                </Button>
              </CardContent>
            </Card>

            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search by Field
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="searchField">Field Name</Label>
                  <Input
                    id="searchField"
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value)}
                    placeholder="status"
                  />
                </div>
                <div>
                  <Label htmlFor="searchValue">Field Value</Label>
                  <Input
                    id="searchValue"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="pending"
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading} className="w-full">
                  Search
                </Button>
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleExport} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? <PaymentLoader size="sm" className="mr-2" /> : null}
                  Export as JSON
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Output */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg min-h-[600px] max-h-[600px] overflow-auto font-mono text-sm">
                  {output || '👆 Click a button to explore your database'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Alert className="mt-6">
          <AlertDescription>
            <p className="font-semibold mb-2">📝 How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click &quot;Find All Collections&quot; to discover your collections</li>
              <li>Click on a collection name to select it</li>
              <li>Use &quot;View Docs&quot; to see documents or &quot;Analyze&quot; to see structure</li>
              <li>Use search to find specific documents</li>
              <li>Export to download collection data as JSON</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

