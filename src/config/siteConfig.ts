/**
 * Centralized Site Configuration & Regulatory Single Source of Truth
 *
 * Consolidates all brand names, official regulatory licenses (TGA),
 * support phone numbers, WhatsApp links, and standardized operational copy.
 */

export const SITE_CONFIG = {
  brandName: 'Al Harmain Travels',
  brandTagline: 'VIP Umrah & City Taxi Services',
  brandSubtitle: 'VIP Chauffeur · Makkah · Madinah',

  // Regulatory & Licensing
  regulatory: {
    badge: 'TGA Licensed',
    authorityShort: 'TGA',
    authorityName: 'Transport General Authority (TGA)',
    authorityFull: 'Kingdom of Saudi Arabia Transport General Authority',
    licenseNumber: 'License #TGA-KSA-4029',
    licenseId: 'TGA-KSA-4029',
    licenseLabel: 'KSA Transport General Authority Licensed Operator #TGA-KSA-4029',
  },

  // Centralized Contact & Dispatch Channels
  contact: {
    phoneDisplay: '+966 53 190 7430',
    phoneRaw: '+966531907430',
    phoneTel: 'tel:+966531907430',
    whatsAppRaw: '966531907430',
    whatsAppDisplay: '+966 53 190 7430',
    whatsAppLink: 'https://wa.me/966531907430',
    getWhatsAppLink: (message?: string) =>
      message
        ? `https://wa.me/966531907430?text=${encodeURIComponent(message)}`
        : 'https://wa.me/966531907430',
    email: 'bookings@alharmaintravels.com',
    address: 'Ibrahim Al Khalil St, Central Area (Markaziyah), Makkah',
  },

  // High-Trust Operational Access Copy
  operational: {
    haramDropoffTitle: 'Central Area (Markaziyah) Hotel & Haram Tunnel Drop-Offs',
    haramDropoffShort:
      'Authorized Central Area (Markaziyah) Hotel & Haram Tunnel Drop-Offs (Ajyad, Jabal Omar & Clock Tower Basements)',
    haramDropoffFull:
      'Authorized Central Area (Markaziyah) Hotel & Haram Tunnel Drop-Offs (Ajyad, Jabal Omar & Clock Tower Basements). Note: Drop-offs adjust around Salah traffic checkpoints.',
    salahCheckpointNote:
      'Note: Drop-offs adjust around Salah traffic checkpoints per municipal crowd and safety protocols.',
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;

export default SITE_CONFIG;

