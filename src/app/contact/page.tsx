'use client';

// Contact page with blurry fixed mobile navbar
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import CinematicTexture from '@/components/cinematic/CinematicTexture';

export default function ContactPage() {
  const { settings, addNotification } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    addNotification(
      'Inquiry Received',
      `Message from ${formData.name} regarding "${formData.subject}". Our support team will reply within 30 minutes.`,
      'info'
    );
    setIsSent(true);
    toast.success('Thank you! Your message has been transmitted to our 24/7 dispatch desk.');
  };

  return (
    <div className="min-h-screen bg-page text-primary py-12 lg:py-20 relative overflow-hidden">
      <CinematicTexture variant="light" />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-16 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>24/7 Dispatch &amp; Support Desk</span>
          </div>
          <h1 className="type-page-hero">
            Contact <span className="text-amber-500 dark:text-amber-400">Al Harmain Travel</span>
          </h1>
          <p className="type-lead">
            Reach out to our operations team for custom pilgrimage itineraries, corporate contracts, or immediate roadside assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Contact Details & Office Locations */}
          <div className="lg:col-span-5 space-y-8">
            <div className="p-8 rounded-3xl bg-card border border-base space-y-6">
              <h3 className="text-xl font-bold text-primary">Central Operations Hub</h3>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">24/7 Hotline &amp; Dispatch</div>
                    <a href={`tel:${settings.support_phone}`} className="text-primary font-semibold hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                      {settings.support_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">WhatsApp Instant Bookings</div>
                    <a href={`https://wa.me/${settings.support_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      {settings.support_whatsapp}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">Corporate &amp; Official Email</div>
                    <a href={`mailto:${settings.support_email}`} className="text-primary font-semibold hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                      {settings.support_email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">Operational Hours</div>
                    <div className="text-primary font-semibold">24 Hours a Day &bull; 7 Days a Week &bull; 365 Days a Year</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Branches */}
            <div className="p-8 rounded-3xl bg-card border border-base space-y-6">
              <h3 className="text-xl font-bold text-primary">Our Regional Stations</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">Makkah Al-Mukarramah Office</div>
                    <div className="text-primary font-semibold">
                      Ibrahim Al Khalil St, Opposite Abraj Al Bait, Central District
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">Madinah Al-Munawwarah Office</div>
                    <div className="text-primary font-semibold">
                      Northern Central Area, King Fahd Road, Near Masjid Al Nabawi
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">Jeddah Airport Terminal Station</div>
                    <div className="text-primary font-semibold">
                      King Abdulaziz International Airport, Terminal 1 Commercial Hub
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-3xl bg-card border border-base shadow-2xl">
              <h3 className="type-section-title !text-2xl mb-2">Send an Inquiry</h3>
              <p className="text-muted text-xs sm:text-sm mb-6">
                Fill out the form below. Our customer care desk responds swiftly to all inquiries and quotation requests.
              </p>

              {isSent ? (
                <div className="p-8 text-center space-y-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-600/50 rounded-2xl">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-primary">Inquiry Sent Successfully</h4>
                  <p className="text-secondary text-xs max-w-md mx-auto">
                    We have received your message. Our operations team will reach out via WhatsApp or email shortly.
                  </p>
                  <button
                    onClick={() => {
                      setIsSent(false);
                      setFormData({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="type-label">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Dr. Abdullah Rahman"
                        className="w-full px-4 py-3 rounded-xl bg-input border border-base text-primary placeholder-muted focus:outline-none focus:border-emerald-500 dark:placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="type-label">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="abdullah@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-input border border-base text-primary placeholder-muted focus:outline-none focus:border-emerald-500 dark:placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="type-label">Phone Number (with Country Code) *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+966 54 888 1234"
                        className="w-full px-4 py-3 rounded-xl bg-input border border-base text-primary placeholder-muted focus:outline-none focus:border-emerald-500 dark:placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="type-label">Inquiry Subject</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-input border border-base text-primary focus:outline-none focus:border-emerald-500"
                      >
                        <option>General Inquiry</option>
                        <option>Umrah VIP Chauffeur Package</option>
                        <option>Airport Flight Transfer</option>
                        <option>Intercity Makkah-Madinah Bus</option>
                        <option>Corporate Contract</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="type-label">Your Message / Itinerary Details *</label>
                    <textarea
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please specify pickup dates, number of passengers, flight details, or any special requests..."
                      className="w-full px-4 py-3 rounded-xl bg-input border border-base text-primary placeholder-muted focus:outline-none focus:border-emerald-500 dark:placeholder-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#d4af37] via-[#e5c567] to-[#d4af37] hover:from-[#c5a030] hover:to-[#dfc15a] text-[#06101e] py-4 px-6 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-[#d4af37]/20 inline-flex items-center justify-center gap-2.5 cursor-pointer group active:scale-95"
                  >
                    <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span>Transmit Message to Operations</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
