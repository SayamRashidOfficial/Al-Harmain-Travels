import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  RotateCcw,
  Plane,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import CinematicTexture from '@/components/cinematic/CinematicTexture';
import { SITE_CONFIG } from '@/config/siteConfig';

export const metadata: Metadata = {
  title: 'Cancellation Policy | Al Harmain Travels - 24-Hour Free Cancellation',
  description:
    'Transparent cancellation and refund policy for Al Harmain Travels. 24-hour free cancellation with 100% refund, flight delay protection with 90-min free airport wait, and flexible rescheduling.',
  openGraph: {
    title: 'Cancellation & Refund Policy | Al Harmain Travels',
    description:
      '24-Hour free cancellation, 100% full refund guarantee, flight delay protections, and transparent Saudi passenger policies.',
  },
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#07120e] text-slate-100 py-12 lg:py-20 relative overflow-hidden font-sans">
      <CinematicTexture variant="footer" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Header Badge & Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="">   </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans">
            Cancellation &amp; <span className="text-[#d4af37]">Refund Policy</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Travel plans can change unexpectedly, especially during international pilgrimage journeys. At{' '}
            <strong className="text-white">{SITE_CONFIG.brandName}</strong>, we provide a passenger-first cancellation guarantee with zero stress.
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

        {/* 3 Core Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">24-Hour Free Cancellation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cancel up to 24 hours before your scheduled pickup time for a <strong>100% full refund</strong> with no hidden processing fees.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Plane className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Flight Delay Protection</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Flight delays are never penalized. We monitor live radar; your pickup time auto-adjusts plus 90 minutes of free terminal wait time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Prompt Bank Refunds</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Refunds are automatically issued to your original payment card (Mada, Visa, Mastercard) within 5–7 business days.
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
                Standard Cancellation Windows &amp; Refund Schedule
              </h2>
            </div>
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/80 text-amber-400 uppercase tracking-wider text-xs">
                    <th className="py-3 px-4">Cancellation Notice</th>
                    <th className="py-3 px-4">Refund Entitlement</th>
                    <th className="py-3 px-4">Applicable Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="bg-slate-850/30">
                    <td className="py-3 px-4 font-semibold text-white">More than 24 hours before pickup</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">100% Full Refund</td>
                    <td className="py-3 px-4 text-slate-400">SAR 0 (Free)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Between 12 to 24 hours before pickup</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">50% Refund or 100% Travel Credit</td>
                    <td className="py-3 px-4 text-slate-400">50% Chauffeur Retention Fee</td>
                  </tr>
                  <tr className="bg-slate-850/30">
                    <td className="py-3 px-4 font-semibold text-white">Less than 12 hours before pickup</td>
                    <td className="py-3 px-4 text-rose-400 font-bold">No Refund</td>
                    <td className="py-3 px-4 text-slate-400">100% Chauffeur Dispatch Cost</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Passenger No-Show at designated gate</td>
                    <td className="py-3 px-4 text-rose-400 font-bold">No Refund</td>
                    <td className="py-3 px-4 text-slate-400">Full Fare Retained</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Flight Delays, Diversions &amp; Airline Cancellations
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              We understand airline irregularities are outside your control. When you provide your flight number at booking:
            </p>
            <ul className="space-y-2.5 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
              <li>
                <strong>Automated Flight Rescheduling:</strong> Our dispatch software synchronizes with aviation radar for King Abdulaziz International Airport (JED) and Prince Mohammad bin Abdulaziz Airport (MED). If your flight is delayed by 1 hour or 10 hours, your chauffeur will adjust accordingly at no charge.
              </li>
              <li>
                <strong>90-Minute Complimentary Buffer:</strong> Free waiting time commences only after your aircraft touches down, giving you ample time for passport control and baggage claim.
              </li>
              <li>
                <strong>Flight Cancellation by Airline:</strong> If your airline cancels your inbound flight and you notify us before the driver is dispatched, you are entitled to a 100% refund or free date change upon proof of flight cancellation.
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
                Itinerary Modifications &amp; Rescheduling
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Need to alter your departure time, hotel pickup location, or vehicle class?
            </p>
            <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
              <li>You may modify your pickup time or hotel address free of charge up to <strong>4 hours prior</strong> to the scheduled reservation, subject to vehicle class availability.</li>
              <li>Upgrading to a larger vehicle class (e.g., Sedan to GMC Yukon XL or Luxury Van) will only require payment of the fare difference.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                How to Request a Cancellation or Refund
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              We make cancellations effortless. You do not need to fill out tedious forms:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <MessageCircle className="w-4 h-4" />
                  <span>Option A: Instant WhatsApp Desk</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Message our 24/7 dispatch desk on WhatsApp with your booking reference ID. Our agents will process the cancellation immediately.
                </p>
                <a
                  href={SITE_CONFIG.contact.whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:underline"
                >
                  <span>Chat on WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <CreditCard className="w-4 h-4" />
                  <span>Option B: Email Support</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Email your cancellation request to our billing desk at{' '}
                  <span className="text-white font-medium">{SITE_CONFIG.contact.email}</span>. We will confirm your refund receipt within 2 hours.
                </p>
                <a
                  href={`mailto:${SITE_CONFIG.contact.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:underline"
                >
                  <span>Email Dispatch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA Box */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <h3 className="text-xl font-bold text-white">Book with confidence across the Two Holy Mosques</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Experience premium VIP chauffeur transfers between Makkah, Madinah, and Jeddah with transparent terms and 24/7 dedicated support.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/customer"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#d4af37] to-[#e5c567] text-[#06101e] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <span>Book Your Transfer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <span>Contact Support Desk</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

