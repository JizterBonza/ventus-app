import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SearchBarNew from '../components/shared/SearchBarNew';
import BannerCTA from '../components/shared/BannerCTA';
import { updateUserEmail, updateUserPassword } from '../utils/authService';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email');
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    email: '',
    currentPassword: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [emailErrors, setEmailErrors] = useState<{ [key: string]: string }>({});
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Set initial email value
  useEffect(() => {
    if (user) {
      setEmailForm(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const validateEmailForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!emailForm.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) {
      errors.email = 'Invalid email format';
    }

    if (!emailForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    setEmailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess(false);
    setEmailErrors({});

    if (!validateEmailForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateUserEmail(emailForm.email, emailForm.currentPassword);
      
      if (response.success) {
        setEmailSuccess(true);
        setEmailForm(prev => ({ ...prev, currentPassword: '' }));
        // Update user in context by refreshing
        window.location.reload();
      } else {
        setEmailErrors({ submit: response.error || 'Failed to update email' });
      }
    } catch (error) {
      setEmailErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordErrors({});

    if (!validatePasswordForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateUserPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      if (response.success) {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordErrors({ submit: response.error || 'Failed to update password' });
      }
    } catch (error) {
      setPasswordErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center" style={{ padding: "50px" }}>
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="settings-page">
      <Header />
      <SearchBarNew />
      
      <section className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h1 className="mb-4">Settings</h1>
              
              {/* Tabs */}
              <div className="settings-tabs mb-4" style={{
                borderBottom: '2px solid #eee',
                display: 'flex',
                gap: '20px'
              }}>
                <button
                  onClick={() => {
                    setActiveTab('email');
                    setEmailSuccess(false);
                    setEmailErrors({});
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '15px 20px',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'email' ? '2px solid #aa8453' : '2px solid transparent',
                    color: activeTab === 'email' ? '#aa8453' : '#333',
                    fontWeight: activeTab === 'email' ? 'bold' : 'normal',
                    marginBottom: '-2px'
                  }}
                >
                  Update Email
                </button>
                <button
                  onClick={() => {
                    setActiveTab('password');
                    setPasswordSuccess(false);
                    setPasswordErrors({});
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '15px 20px',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'password' ? '2px solid #aa8453' : '2px solid transparent',
                    color: activeTab === 'password' ? '#aa8453' : '#333',
                    fontWeight: activeTab === 'password' ? 'bold' : 'normal',
                    marginBottom: '-2px'
                  }}
                >
                  Change Password
                </button>
              </div>

              {/* Email Update Form */}
              {activeTab === 'email' && (
                <div className="settings-form" style={{ maxWidth: '600px', marginTop: '30px' }}>
                  <form onSubmit={handleEmailSubmit}>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        New Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={emailForm.email}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: emailErrors.email ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {emailErrors.email && (
                        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                          {emailErrors.email}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="currentPasswordEmail" className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPasswordEmail"
                        className="form-control"
                        value={emailForm.currentPassword}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: emailErrors.currentPassword ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {emailErrors.currentPassword && (
                        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                          {emailErrors.currentPassword}
                        </div>
                      )}
                    </div>

                    {emailErrors.submit && (
                      <div className="alert alert-danger" style={{
                        padding: '10px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        border: '1px solid #f5c6cb',
                        borderRadius: '4px',
                        marginBottom: '15px'
                      }}>
                        {emailErrors.submit}
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="alert alert-success" style={{
                        padding: '10px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        marginBottom: '15px'
                      }}>
                        Email updated successfully!
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#aa8453',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 30px',
                        borderRadius: '4px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                    >
                      {isSubmitting ? 'Updating...' : 'Update Email'}
                    </button>
                  </form>
                </div>
              )}

              {/* Password Update Form */}
              {activeTab === 'password' && (
                <div className="settings-form" style={{ maxWidth: '600px', marginTop: '30px' }}>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="mb-3">
                      <label htmlFor="currentPassword" className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        className="form-control"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: passwordErrors.currentPassword ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {passwordErrors.currentPassword && (
                        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                          {passwordErrors.currentPassword}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="newPassword" className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        className="form-control"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: passwordErrors.newPassword ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {passwordErrors.newPassword && (
                        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                          {passwordErrors.newPassword}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="confirmPassword" className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="form-control"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: passwordErrors.confirmPassword ? '1px solid #dc3545' : '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {passwordErrors.confirmPassword && (
                        <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                          {passwordErrors.confirmPassword}
                        </div>
                      )}
                    </div>

                    {passwordErrors.submit && (
                      <div className="alert alert-danger" style={{
                        padding: '10px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        border: '1px solid #f5c6cb',
                        borderRadius: '4px',
                        marginBottom: '15px'
                      }}>
                        {passwordErrors.submit}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="alert alert-success" style={{
                        padding: '10px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        marginBottom: '15px'
                      }}>
                        Password updated successfully!
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#aa8453',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 30px',
                        borderRadius: '4px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                    >
                      {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <BannerCTA />
      <Footer />
    </div>
  );
};

export default Settings;

