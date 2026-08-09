import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'var(--primary)', badge }) {
  return (
    <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="card-title">
            {title}
          </div>
          <div className="card-value" style={{ marginTop: '0.25rem' }}>
            {value}
          </div>
          {subtext && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
              {subtext}
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color
            }}
          >
            <Icon size={24} />
          </div>
        )}
      </div>

      {badge && (
        <div style={{ marginTop: '0.85rem' }}>
          <span className={`badge badge-${badge.type}`}>{badge.text}</span>
        </div>
      )}
    </div>
  );
}
