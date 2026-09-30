'use client';

import { useState, useCallback, useEffect } from 'react';
import { SessionUser } from '@/lib/types';

interface UseAccountManagementProps {
  currentUser: SessionUser | null;
  activeTab: string;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useAccountManagement({
  currentUser,
  activeTab,
  onShowToast,
}: UseAccountManagementProps) {
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [newSubadminUsername, setNewSubadminUsername] = useState('');
  const [newSubadminPassword, setNewSubadminPassword] = useState('');
  const [subadminError, setSubadminError] = useState<string | null>(null);
  const [subadminLoading, setSubadminLoading] = useState(false);

  // Change Password Modal State
  const [passwordModalAccount, setPasswordModalAccount] = useState<{ id: string; username: string; role: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.accounts) setAccountsList(data.accounts);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  }, []);

  // Fetch accounts when admin enters account tab
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin' && activeTab === 'account') {
      fetchAccounts();
    }
  }, [currentUser, activeTab, fetchAccounts]);

  // Create Subadmin
  const handleCreateSubadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubadminError(null);
    setSubadminLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newSubadminUsername,
          password: newSubadminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubadminError(data.error || 'Failed to create subadmin');
        return;
      }
      onShowToast(`Subadmin "${newSubadminUsername}" created successfully`);
      setNewSubadminUsername('');
      setNewSubadminPassword('');
      fetchAccounts();
    } catch (err: any) {
      setSubadminError(err.message || 'Network error');
    } finally {
      setSubadminLoading(false);
    }
  };

  // Delete Subadmin
  const handleDeleteSubadmin = async (id: string, username: string) => {
    const confirmDel = window.confirm(`Delete subadmin account "${username}"? This subadmin will lose access immediately.`);
    if (!confirmDel) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        onShowToast(data.error || 'Failed to delete subadmin', 'error');
        return;
      }
      onShowToast(`Subadmin "${username}" deleted`);
      fetchAccounts();
    } catch {
      onShowToast('Network error deleting subadmin', 'error');
    }
  };

  // Open/Close Change Password Modal
  const openPasswordModal = (account: { id: string; username: string; role: string }) => {
    setPasswordModalAccount(account);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setPasswordModalError(null);
    setShowPasswordText(false);
  };

  const closePasswordModal = () => {
    setPasswordModalAccount(null);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setPasswordModalError(null);
  };

  // Submit Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalAccount) return;

    if (!newPasswordVal) {
      setPasswordModalError('Please enter a new password');
      return;
    }
    if (newPasswordVal.length < 4) {
      setPasswordModalError('Password must be at least 4 characters long');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordModalError('Passwords do not match');
      return;
    }

    setPasswordModalLoading(true);
    setPasswordModalError(null);

    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passwordModalAccount.id,
          username: passwordModalAccount.username,
          password: newPasswordVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordModalError(data.error || 'Failed to update password');
        return;
      }

      onShowToast(`Password updated successfully for ${passwordModalAccount.username}`);
      closePasswordModal();
    } catch (err: any) {
      setPasswordModalError(err.message || 'Network error updating password');
    } finally {
      setPasswordModalLoading(false);
    }
  };

  return {
    accountsList,
    newSubadminUsername,
    setNewSubadminUsername,
    newSubadminPassword,
    setNewSubadminPassword,
    subadminError,
    subadminLoading,
    passwordModalAccount,
    newPasswordVal,
    setNewPasswordVal,
    confirmPasswordVal,
    setConfirmPasswordVal,
    passwordModalError,
    passwordModalLoading,
    showPasswordText,
    setShowPasswordText,
    fetchAccounts,
    handleCreateSubadmin,
    handleDeleteSubadmin,
    openPasswordModal,
    closePasswordModal,
    handleChangePassword,
  };
}
