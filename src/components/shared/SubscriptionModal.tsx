import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  'Live member-only hotel rates',
  'Exact complimentary benefits for each stay',
  'Priority upgrades and flexible rate options',
  'Ventus Travel booking support',
];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, hasActiveMembership } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="subscription-modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="membership-modal-title">
        <button type="button" className="subscription-modal-close" onClick={onClose} aria-label="Close membership information">×</button>
        <img src="/assets/img/ventus-logo.png" alt="Ventus" className="membership-checkout-logo" />
        <h2 id="membership-modal-title">Ventus Travel membership</h2>
        <p>Join for £299 per year and unlock the live prices and hotel benefits available to Ventus members.</p>
        <ul className="membership-checkout-benefits">{BENEFITS.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
        {hasActiveMembership ? (
          <button type="button" className="btn btn-primary btn-lg butn-dark w-100" onClick={onClose}>Continue exploring</button>
        ) : (
          <Link className="btn btn-primary btn-lg butn-dark w-100" to={isAuthenticated ? '/subscription' : '/signup'} onClick={onClose}>
            {isAuthenticated ? 'Complete membership' : 'Create account and join'}
          </Link>
        )}
      </section>
    </div>
  );
};

export default SubscriptionModal;
