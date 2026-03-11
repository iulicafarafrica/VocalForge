// SunoPromptGenerator.jsx - Card styles for consistent theme
export const S = {
  card: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)',
    borderRadius: 14,
    padding: '20px 24px',
    border: '1px solid #4f46e533',
    boxShadow: '0 4px 20px rgba(79, 70, 229, 0.1)',
    marginBottom: 20
  },
  cardSimple: {
    background: '#0f172a',
    borderRadius: 12,
    padding: '18px 22px',
    border: '1px solid #1e293b',
    marginBottom: 20
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#a5b4fc',
    marginBottom: 12,
    display: 'block',
    letterSpacing: 0.5
  },
  chip: (isActive, accentColor = '#f59e0b') => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: isActive ? `1px solid ${accentColor}` : '1px solid #334155',
    background: isActive ? `${accentColor}22` : '#1e293b',
    color: isActive ? accentColor : '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }),
  button: {
    padding: '14px 24px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: 'white',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 20px #f59e0b44'
  }
};
