import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileCheck2,
  Server,
  UserCheck,
  Mail,
  ArrowRight,
  Sparkles,
  Phone,
} from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import { SITE_CONFIG } from '@/config/siteConfig';

export const metadata: Metadata = {
  title: 'Privacy Policy | Al Harmain Travels - Saudi PDPL Compliant',
  description:
    'Al Harmain Travels Privacy Policy. Fully compliant with the Saudi Personal Data Protection Law (PDPL). Learn how we securely protect passenger data, booking itineraries, and payment transactions.',
  openGraph: {
    title: 'Privacy Policy | Al Harmain Travels',
    description:
      'Passenger data security, Saudi PDPL compliance, tokenized payment protection, and statutory ZATCA retention standards.',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#07120e] text-slate-100 py-12 lg:py-20 relative overflow-hidden font-sans">
      <CinematicTexture variant="footer" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Header Badge & Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="">   </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans">
            Privacy <span className="text-[#d4af37]">Policy</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            At <strong className="text-white">{SITE_CONFIG.brandName}</strong>, safeguarding your personal data is a sacred trust. This policy outlines our data handling practices in strict compliance with the Saudi Personal Data Protection Law (PDPL).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
              {SITE_CONFIG.regulatory.licenseLabel}
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Effective Date: November 2026</span>
          </div>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Saudi PDPL Standards</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Full adherence to Royal Decree No. (M/19) regulations enforced by SDAIA for lawful, transparent data processing.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Tokenized Payments</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Zero storage of raw card numbers or CVV. All transactions run through PCI-DSS Level 1 certified Saudi payment gateways.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">No 3rd-Party Marketing</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We never sell, rent, or lease passenger contact details to marketing agencies or third-party advertisers.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Personal Data We Collect
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              To fulfill our transport contracts and regulatory manifest requirements, we collect only necessary passenger information:
            </p>
            <ul className="space-y-2.5 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
              <li>
                <strong>Passenger Contact Details:</strong> Full name, telephone number (for WhatsApp dispatch notices), email address, and nationality.
              </li>
              <li>
                <strong>Travel Itinerary Data:</strong> Flight numbers, airline carriers, arrival/departure dates, pickup/destination addresses in Makkah, Madinah, or Jeddah, and passenger luggage counts.
              </li>
              <li>
                <strong>Billing Information:</strong> Billing names, transaction reference numbers, and VAT identification (for corporate accounts). Payment card data is processed solely by authorized Saudi payment gateways (Mada, Apple Pay, HyperPay/PayTabs).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Purpose &amp; Legal Basis of Processing
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              We process personal data strictly pursuant to the following lawful bases under Saudi PDPL:
            </p>
            <ul className="space-y-2.5 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
              <li>
                <strong>Contractual Execution:</strong> Dispatching assigned chauffeurs, monitoring live flight arrival status, and facilitating meet-and-greet services.
              </li>
              <li>
                <strong>Regulatory Compliance:</strong> Complying with Transport General Authority (TGA) operational mandates, municipal traffic management around the Two Holy Mosques, and ZATCA tax invoice record-keeping.
              </li>
              <li>
                <strong>Safety &amp; Emergency Support:</strong> Coordinating vehicle location tracking for passenger safety and 24/7 roadside assistance.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                3
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Data Security &amp; Encryption Protocols
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              All data transmitted through our web portal is protected using Transport Layer Security (TLS 1.3) with 256-bit AES encryption. Stored customer data is isolated in secure, audited data centers. Driver access is strictly partitioned so chauffeurs view only the essential information needed to complete the assigned transfer.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Data Retention Schedules (ZATCA &amp; TGA)
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              In accordance with Saudi tax laws governed by ZATCA and commercial transport regulations under TGA, electronic tax invoice records and ride manifests are securely preserved for a statutory retention period of five (5) years. Non-essential communication logs and tracking coordinates are automatically purged within 90 days of trip completion.
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                5
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Your Rights Under the Saudi PDPL
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              As a passenger, the Saudi Personal Data Protection Law grants you comprehensive rights regarding your personal information:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <strong className="text-white block mb-1">Right to Access:</strong>
                Request a copy of the personal data held about you by our dispatch desk.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <strong className="text-white block mb-1">Right to Rectification:</strong>
                Request correction of inaccurate, incomplete, or outdated details.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <strong className="text-white block mb-1">Right to Destruction:</strong>
                Request deletion of personal data when no longer needed, subject to statutory tax laws.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <strong className="text-white block mb-1">Right to Withdraw Consent:</strong>
                Revoke consent for non-essential communications at any time.
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                6
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Data Protection Officer &amp; Inquiries
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              To exercise your statutory data privacy rights or submit questions regarding this policy, please contact our appointed Data Protection Officer:
            </p>
            <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1 text-xs text-slate-300">
              <div>
                <strong className="text-white">Email:</strong>{' '}
                <a href={`mailto:${SITE_CONFIG.contact.email}`} className="text-amber-400 hover:underline">
                  {SITE_CONFIG.contact.email}
                </a>
              </div>
              <div>
                <strong className="text-white">Postal Address:</strong> {SITE_CONFIG.contact.address}
              </div>
              <div>
                <strong className="text-white">Operating Chauffeur License:</strong> {SITE_CONFIG.regulatory.licenseLabel}
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA Box */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <h3 className="text-xl font-bold text-white">Your privacy is guaranteed on every sacred journey</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Book your Makkah, Madinah, or airport chauffeur transfer with total peace of mind and transparent data handling.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/customer"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#d4af37] to-[#e5c567] text-[#06101e] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <span>Book Your Chauffeur</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Contact Privacy Desk</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

