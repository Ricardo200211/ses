"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export default function HomePage() {
  const { isAuthenticated, loading: authLoading, logout, userId: authenticatedUserId } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/documents', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            router.push('/login');
            return;
          }
          throw new Error(data.error || 'Failed to fetch documents.');
        }

        setDocuments(data);
      } catch (err: unknown) {
        console.error('Error fetching documents:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [isAuthenticated, authLoading, router, logout]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-700 p-6 bg-white rounded-lg shadow-md">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-4xl font-extrabold text-blue-700">Your Documents</h1>
        <div className="flex space-x-4">
          <Link
            href="/create-document"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Document
          </Link>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto">
        {documents.length === 0 ? (
          <p className="text-xl text-gray-600 text-center p-8 bg-white rounded-lg shadow-md">
            You dont have any documents yet. Create one to get started!
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <li key={doc.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">{doc.title}</h2>
                  {doc.userId === authenticatedUserId ? (
                    <p className="text-gray-500 text-sm mb-2">Owned by: <span className="font-medium">You</span></p>
                  ) : (
                    <p className="text-gray-500 text-sm mb-2">
                      Owned by: <span className="font-medium">{doc.user.username || doc.user.email}</span>
                    </p>
                  )}
                  <p className="text-gray-500 text-sm">Last updated: {new Date(doc.updatedAt).toLocaleDateString()}</p>
                </div>
                <Link href={`/documents/${doc.id}`} className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors self-start">
                  View Document
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}