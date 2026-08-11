import publicationData from './content/publications/publications.json';

export interface Publication {
  id: string;
  scope?: 'lab' | 'pi';
  display?: boolean;
  title: string;
  titleCn?: string;
  abstractCn?: string;
  abstractEn?: string;
  /** Legacy single-language abstract; retained for existing records. */
  abstract?: string;
  image?: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  impactFactor?: number;
  doi?: string;
  pdfUrl?: string;
  isCNS?: boolean;
  isHighImpact?: boolean;
  labMembers?: string[];
  category?: string;
}

export const allPublications = publicationData as unknown as Publication[];

export const visiblePublications = allPublications
  .filter((publication) => publication.display !== false && Boolean(publication.title && publication.journal && publication.year))
  .sort((a, b) => b.year - a.year);
