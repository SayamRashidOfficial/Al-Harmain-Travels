import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  Scale,
  CreditCard,
  Car,
  Compass,
  FileText,
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import { SITE_CONFIG } from '@/config/siteConfig';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Al Harmain Travels - TGA Licensed Chauffeur Services',
  description:
    'Official Terms & Conditions for Al Harmain Travels. Operating under KSA Transport General Authority License #TGA-KSA-4029. Fixed SAR rates with 15% VAT, 90-min airport waiting time, and Haram tunnel access protocols.',
  openGraph: {
    title: 'Terms & Conditions | Al Harmain Travels',
    description:
      'Official service agreements, TGA licensing compliance, fixed SAR pricing with 15% VAT, and sacred transport protocols.',
  },
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#07120e] text-slate-100 py-12 lg:py-20 relative overflow-hidden font-sans">
      <CinematicTexture variant="footer" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Header Badge & Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="">  </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans">
            Terms &amp; <span className="text-[#d4af37]">Conditions</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            These terms govern all chauffeur, private transfer, and sacred pilgrimage transport services operated by{' '}
            <strong className="text-white">{SITE_CONFIG.brandName}</strong> under the regulatory oversight of the{' '}
            {SITE_CONFIG.regulatory.authorityFull}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
              {SITE_CONFIG.regulatory.licenseLabel}
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Last Updated: November 2026</span>
          </div>
        </div>

        {/* Highlight Card: Key Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Fixed SAR Fares &amp; 15% VAT</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Transparent, guaranteed pricing in Saudi Riyals inclusive of 15% ZATCA VAT. Zero surge charges or hidden airport fees.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">90-Min Airport Waiting Time</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Complimentary 90-minute buffer after aircraft touchdown at JED &amp; MED with automated live flight radar tracking.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Authorized Tunnel Access</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Licensed hotel drop-offs in Markaziyah and Haram tunnel basements (Ajyad, Jabal Omar, Clock Tower).
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
                Regulatory Authority &amp; Operating Credentials
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {SITE_CONFIG.brandName} is a licensed commercial chauffeur and private transport operator chartered under the{' '}
              <strong className="text-white">{SITE_CONFIG.regulatory.authorityFull}</strong> under{' '}
              <strong className="text-amber-400">{SITE_CONFIG.regulatory.licenseNumber}</strong>. All chauffeurs hold valid Saudi commercial driving permits, undergo background vetting, and operate fully insured, late-model VIP vehicles compliant with national passenger safety standards.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Pricing, Invoicing &amp; Value Added Tax (VAT)
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Fixed All-Inclusive Fares:</strong> All rates confirmed at the time of booking are fixed in Saudi Riyals (SAR) and include all highway tolls, parking access, fuel, and the mandatory 15% Value Added Tax (VAT) governed by the Zakat, Tax and Customs Authority (ZATCA).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>No Surge Pricing:</strong> We operate on fixed sacred itinerary pricing. You will never be subjected to demand-based surge multipliers during peak Umrah, Ramadan, or Hajj seasons.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>E-Invoicing:</strong> Official ZATCA-compliant electronic tax invoices featuring verifiable QR codes are automatically generated for every completed journey.
                </span>
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
                Airport Arrivals, Flight Tracking &amp; Waiting Policies
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                For airport pickups at King Abdulaziz International Airport (JED) in Jeddah and Prince Mohammad bin Abdulaziz International Airport (MED) in Madinah:
              </p>
              <ul className="space-y-2.5 pl-4 list-disc marker:text-amber-400">
                <li>
                  <strong>Live Flight Radar Tracking:</strong> Chauffeur dispatch is synchronized with live aviation radar. If your flight is delayed or arrives early, your pickup time is automatically recalculated without penalty.
                </li>
                <li>
                  <strong>90-Minute Complimentary Window:</strong> You receive up to 90 minutes of free waiting time starting strictly from the actual touchdown time of your aircraft to allow ample time for immigration, baggage claim, and customs clearance.
                </li>
                <li>
                  <strong>VIP Meet &amp; Greet:</strong> Your designated chauffeur will be stationed at the arrivals hall exit gate holding a personalized nameboard.
                </li>
                <li>
                  <strong>Hotel Pickups:</strong> Hotel departures include 20 minutes of complimentary waiting time from the scheduled pickup reservation time.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Central Area (Markaziyah) &amp; Haram Tunnel Drop-Off Protocols
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {SITE_CONFIG.operational.haramDropoffShort}.
            </p>
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/30 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Salah Checkpoint Adjustments:</strong> {SITE_CONFIG.operational.salahCheckpointNote} During Friday prayer and peak congregational prayers, access to direct basements may be temporarily diverted to the nearest permitted hotel drop-off ring by official traffic police officers.
              </span>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                5
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Passenger Conduct, Sanctity &amp; Fleet Care
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              To honor the dignity of the Two Holy Mosques and maintain the highest standard of guest comfort:
            </p>
            <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
              <li>Smoking, vaping, and consumption of open food items inside vehicles is strictly prohibited.</li>
              <li>Passengers must adhere to the passenger capacity and luggage limits specified for each vehicle class (Sedan, GMC Yukon XL, Toyota Staria, VIP HiAce, or Luxury Van).</li>
              <li>Seatbelts must be worn by all passengers at all times in compliance with Saudi traffic safety laws.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                6
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Governing Law &amp; Dispute Resolution
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              These Terms &amp; Conditions are governed by and construed in accordance with the royal decrees, transport regulations, and commercial laws of the Kingdom of Saudi Arabia. Any dispute arising out of or in connection with our services shall fall under the exclusive jurisdiction of the competent courts of Makkah Al-Mukarramah or Jeddah.
            </p>
          </section>
        </div>

        {/* Bottom CTA Box */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <h3 className="text-xl font-bold text-white">Have questions about our terms or custom corporate contracts?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Our 24/7 dispatch desk in Makkah is available around the clock to assist with booking modifications and pilgrimage itineraries.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#d4af37] to-[#e5c567] text-[#06101e] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <span>Contact Dispatch</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={SITE_CONFIG.contact.whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

