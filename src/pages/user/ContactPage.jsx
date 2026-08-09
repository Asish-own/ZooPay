import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MessageSquare, Send, ShieldCheck, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [telegramLink, setTelegramLink] = useState('https://t.me/zoopay_official');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      const res = await fetch('/api/user/contact', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.telegramChannelLink) {
        setTelegramLink(data.telegramChannelLink);
      }
    } catch (err) {
      console.error('Failed to fetch contact details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Contact & Support</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Have questions or need assistance with buy plans, UTR verification, or withdrawals?
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: '640px', padding: '2rem', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 24px rgba(0, 136, 204, 0.4)'
          }}
        >
          <Send size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Join Official Telegram Channel</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.75rem 0 1.75rem', lineHeight: '1.6' }}>
          Get instant official updates, live announcements, round-robin payment assistance, and direct support from our team on Telegram.
        </p>

        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
            padding: '0.85rem 1.75rem',
            fontSize: '1.05rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0, 136, 204, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <Send size={20} /> Join Telegram Channel
        </a>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: '600' }}>
            <ShieldCheck size={18} color="var(--success)" /> Official Support Assurance
          </div>
          <div>• Never share your account password or full security PIN with anyone.</div>
          <div>• Payment verification is conducted strictly through your submitted UTR references in the app.</div>
        </div>
      </div>
    </div>
  );
}
