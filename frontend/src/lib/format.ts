export const fmt = {
  money: (n: number | null | undefined, cur = 'EUR') =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(n || 0),

  date: (d: string | null | undefined) =>
    d
      ? new Intl.DateTimeFormat('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date(d))
      : '—',

  rel: (d: string | null | undefined) => {
    if (!d) return '—';
    const days = Math.floor(
      (Date.now() - new Date(d).getTime()) / 86400000
    );
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days}d`;
    return fmt.date(d);
  },

  pct: (n: number) => `${Math.round(n * 100)}%`,
};
