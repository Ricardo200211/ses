"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export default function HomePage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      const fetchDocuments = async () => {
        setLoadingDocuments(true);
        setError(null);
        try {
          const res = await fetch('/api/documents', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            if (res.status === 401) {
              logout();
              router.push('/login');
              return;
            }
            const errorData = await res.json();
            throw new Error(errorData.error || 'Error fetching documents.');
          }

          const data: Document[] = await res.json();
          setDocuments(data);
        } catch (err: unknown) {
          console.error('Error fetching documents:', err);
          if (err instanceof Error) {
            setError(err.message || 'An error occurred while loading documents.');
          } else {
            setError('An unknown error occurred while loading documents.');
          }
        } finally {
          setLoadingDocuments(false);
        }
      };

      fetchDocuments();
    }
  }, [isAuthenticated, loading, router, logout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md">
          Loading authentication status...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-4xl font-extrabold text-blue-700">My Documents</h1>
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-600 text-white rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout
        </button>
      </header>

      <main className="container mx-auto">
        <div className="flex justify-end mb-6">
          <Link href="documents/new" className="px-6 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
            + Create New Document
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {loadingDocuments ? (
          <p className="text-xl text-gray-700 text-center p-6 bg-white rounded-lg shadow-md">
            Loading documents...
          </p>
        ) : documents.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-xl text-gray-700 mb-4">You dont have any documents yet.</p>
            <Link href="documents/new" className="text-blue-600 hover:underline text-lg">
              Create your first document!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <h3 className="text-2xl font-bold text-blue-600 mb-2">{doc.title || 'Untitled Document'}</h3>
                <p className="text-gray-700 text-base line-clamp-3 mb-3">{doc.content || 'This document has no content.'}</p>
                <p className="text-gray-500 text-sm">Created on: {new Date(doc.createdAt).toLocaleDateString()}</p>
                <div className="mt-4 flex space-x-3">
                  <Link href={`/documents/${doc.id}`} className="text-blue-600 hover:underline font-semibold">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}