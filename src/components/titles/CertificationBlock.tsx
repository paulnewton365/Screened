type Props = {
  certifications: {
    us?: { rating: string; source?: string };
    uk?: { rating: string; source?: string };
  } | null;
};

/**
 * Certification block - shows BBFC and MPAA ratings prominently below
 * the title. These are factual metadata about the title and get the
 * same restrained editorial treatment as everything else - no red
 * warning stickers, no traffic-light colours.
 */
export function CertificationBlock({ certifications }: Props) {
  if (!certifications || (!certifications.us && !certifications.uk)) {
    return (
      <p className="editorial-meta">No certification on file</p>
    );
  }

  const parts: string[] = [];
  if (certifications.uk) parts.push(`BBFC ${certifications.uk.rating}`);
  if (certifications.us) parts.push(`MPAA ${certifications.us.rating}`);

  return (
    <p className="editorial-meta">
      {parts.join(' · ')}
    </p>
  );
}
