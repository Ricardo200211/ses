"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Permission {
  id: string;
  documentId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface DocumentDetails {
  id: string;
  title: string;
  userId: string;
}

export default function ManagePermissionsPage() {
  const params = useParams();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, userId: authenticatedUserId } = useAuth();

  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newTargetUserIdentifier, setNewTargetUserIdentifier] = useState('');
  const [newRole, setNewRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');

  const fetchDocumentAndPermissions = useCallback(async () => {
    if (!documentId || !isAuthenticated || authLoading) return;

    setLoading(true);
    setError(null);
    try {
      const docRes = await fetch(`/api/documents/${documentId}`, { credentials: 'include' });
      const docResData = await docRes.json();

      if (!docRes.ok) {
        if (docRes.status === 403) {
          throw new Error(docResData.error || "You do not have permission to view this document.");
        }
        throw new Error(docResData.error || "Failed to load document.");
      }
      setDocument(docResData.document);

      if (authenticatedUserId !== docResData.document.userId) {
        setError("Access denied: You are not the owner of this document to manage permissions.");
        setLoading(false);
        return;
      }

      const permissionsRes = await fetch(`/api/documents/${documentId}/permissions`, { credentials: 'include' });
      const permissionsData = await permissionsRes.json();

      if (!permissionsRes.ok) {
        throw new Error(permissionsData.error || "Failed to load document permissions.");
      }
      setPermissions(permissionsData);

    } catch (err: unknown) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, [documentId, isAuthenticated, authLoading, authenticatedUserId]);

  useEffect(() => {
    fetchDocumentAndPermissions();
  }, [fetchDocumentAndPermissions]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!documentId) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserIdentifier: newTargetUserIdentifier, role: newRole }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Permission added/updated successfully!');
        setNewTargetUserIdentifier('');
        setNewRole('VIEWER');
        fetchDocumentAndPermissions();
      } else {
        throw new Error(data.error || 'Failed to add permission.');
      }
    } catch (err: unknown) {
      console.error("Error adding permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while adding permission.");
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    setMessage(null);
    setError(null);
    if (!documentId || !window.confirm("Are you sure you want to remove this permission?")) {
      setError("Document ID or confirmation missing.");
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.status === 204) {
        setMessage('Permission removed successfully!');
        fetchDocumentAndPermissions();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove permission.');
      }
    } catch (err: unknown) {
      console.error("Error removing permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while removing permission.");
    }
  };

  const handleUpdatePermissionRole = async (permissionId: string, newRoleValue: 'EDITOR' | 'VIEWER') => {
    setMessage(null);
    setError(null);
    if (!documentId) {
      setError("Document ID missing.");
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleValue }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Permission updated successfully!');
        fetchDocumentAndPermissions();
      } else {
        throw new Error(data.error || 'Failed to update permission.');
      }
    } catch (err: unknown) {
      console.error("Error updating permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while updating permission.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Loading permission management...</p>
      </div>
    );
  }

  if (!isAuthenticated || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-600">Document not found or unauthorized access.</p>
      </div>
    );
  }

  if (authenticatedUserId !== document.userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <p className="text-2xl text-red-600 font-bold mb-4">{error || "Access Denied."}</p>
        <Link href={`/documents/${documentId}`} className="text-blue-600 hover:underline text-lg">
          Back to Document
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Manage Permissions for &quot;{document.title}&quot;
        </h1>

        {error && <p className="bg-red-100 text-red-800 p-3 rounded-md mb-4">{error}</p>}
        {message && <p className="bg-green-100 text-green-800 p-3 rounded-md mb-4">{message}</p>}

        <Link href={`/documents/${documentId}`} className="text-blue-600 hover:underline mb-6 block">
          &larr; Back to Document
        </Link>

        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Add New Permission</h2>
          <form onSubmit={handleAddPermission} className="space-y-4">
            <div>
              <label htmlFor="targetUser" className="block text-gray-700 text-sm font-bold mb-2">
                User Email or Username:
              </label>
              <input
                type="text"
                id="targetUser"
                value={newTargetUserIdentifier}
                onChange={(e) => setNewTargetUserIdentifier(e.target.value)}
                placeholder="Ex: user@example.com or username"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="newRole" className="block text-gray-700 text-sm font-bold mb-2">
                Role:
              </label>
              <select
                id="newRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Add Permission
            </button>
          </form>
        </div>

        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Existing Permissions</h2>
          {permissions.length === 0 ? (
            <p className="text-gray-600">No explicit permissions defined for this document yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username / Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.user.username} ({p.user.email})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <select
                          value={p.role}
                          onChange={(e) => handleUpdatePermissionRole(p.id, e.target.value as 'EDITOR' | 'VIEWER')}
                          className="shadow border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          disabled={p.role === 'OWNER'}
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemovePermission(p.id)}
                          className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={p.role === 'OWNER'}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}