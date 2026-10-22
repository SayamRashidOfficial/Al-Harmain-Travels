'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export type SupportedLanguage = 'en' | 'ar';

export function isValidLanguage(val: unknown): val is SupportedLanguage {
  return val === 'en' || val === 'ar';
}

export interface LanguageContextType {
  language: SupportedLanguage;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  dict: Record<string, string>;
}

export const DICTIONARY: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Brand & Common
    appName: 'Al Harmain Travels',
    vipChauffeur: 'Al Harmain VIP Chauffeur',
    vipPilgrim: 'VIP Pilgrim',
    guestTraveler: 'Guest Traveler',
    save: 'Save Changes',
    saving: 'Saving...',
    cancel: 'Cancel',
    confirm: 'Confirm',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    sar: 'SAR',
    km: 'km',
    min: 'min',
    signOut: 'Sign Out',
    concierge: 'VIP 24/7 Concierge',
    activeRide: 'Active Ride',
    trackChauffeur: 'Track Chauffeur',
    loading: 'Loading...',
    required: 'Required',
    close: 'Close',
    success: 'Success',
    error: 'Error',
    viewAll: 'View All',
    clear: 'Clear',

    // Navigation
    'nav.bookRide': 'Book Ride',
    'nav.bookRideSub': 'Reserve VIP Fleet',
    'nav.myTrips': 'My Trips',
    'nav.myTripsSub': 'History & Active',
    'nav.liveRadar': 'Live Radar',
    'nav.liveRadarSub': 'Real-time GPS Radar',
    'nav.vipProfile': 'VIP Profile',
    'nav.vipProfileSub': 'Account & Places',
    'nav.live': 'LIVE',
    'nav.radar': 'Fleet Radar',
    'nav.radarSub': 'Live Vehicle Tracking',
    'nav.queue': 'Ride Queue',
    'nav.queueSub': 'Assignments & Review',
    'nav.drivers': 'Chauffeurs',
    'nav.driversSub': 'Fleet Captain Roster',
    'nav.customers': 'Customers',
    'nav.customersSub': 'Pilgrim Directory',
    'nav.newBooking': 'New Booking',
    'nav.newBookingSub': 'Manual Intake',
    'nav.overview': 'Overview',
    'nav.overviewSub': 'Executive Cockpit',
    'nav.users': 'Users & Access',
    'nav.usersSub': 'Staff, Drivers & Pilgrims',
    'nav.services': 'Services CMS',
    'nav.servicesSub': 'Marketing & Packages',
    'nav.rates': 'Rates & Tariff',
    'nav.ratesSub': 'Fixed Fare Master',
    'nav.reports': 'Reports & Ledger',
    'nav.reportsSub': 'Reconciliation & Tax',
    'nav.auditLogs': 'Audit Logs',
    'nav.auditLogsSub': 'Security & Activities',
    'nav.settings': 'System Settings',
    'nav.settingsSub': 'Company & Dynamic Fare',
    'nav.reviews': 'Reviews & Ratings',
    'nav.reviewsSub': 'Chauffeur & Ride Quality',

    // Customer VIP Profile
    'profile.title': 'VIP Customer Profile',
    'profile.subtitle': 'Manage your executive travel identity, emergency contacts, and journey preferences.',
    'profile.tabPersonal': 'Profile',
    'profile.tabEmergency': 'Emergency Contacts',
    'profile.tabSecurity': 'Security',
    'profile.tabStatus': 'Account Status',
    'profile.vipBadge': 'VIP Customer',
    'profile.memberSince': 'Member Since',
    'profile.completedTrips': 'Completed Trips',
    'profile.safetyContacts': 'Safety Contacts',
    'profile.savedPlaces': 'Saved Places',
    'profile.verifiedContact': 'Contact Verification',
    'profile.primaryEmail': 'Primary Email Address',
    'profile.verifiedLocked': 'Verified & Locked',
    'profile.phoneNumber': 'Phone Number',
    'profile.noneRecorded': 'None recorded',
    'profile.changePhone': 'Change Phone Number',
    'profile.preferredLanguage': 'Preferred Language',
    'profile.languageDesc': 'Captain & Dispatcher communication language:',
    'profile.langEnglish': 'English',
    'profile.langArabic': 'العربية',
    'profile.langSetSuccess': 'Language preference set to English',
    'profile.editDetails': 'Edit Personal Details',
    'profile.editDetailsDesc': 'Keep your pilgrim profile information accurate for airport clearance.',
    'profile.fullName': 'Full Legal Name *',
    'profile.fullNamePlaceholder': 'e.g. Dr. Abdullah Rahman',
    'profile.dateOfBirth': 'Date of Birth',
    'profile.gender': 'Gender',
    'profile.genderMale': 'Male',
    'profile.genderFemale': 'Female',
    'profile.genderOther': 'Other',
    'profile.savePersonal': 'Save Profile Changes',
    'profile.savingProfile': 'Saving Profile Changes...',
    'profile.changePhoto': 'Update Photo',
    'profile.removePhoto': 'Remove Photo',
    'profile.photoHint': 'JPG, PNG or WebP up to 5MB. Clear face photo recommended for chauffeur identification.',
    'profile.emergencyTitle': 'Emergency Safety Contacts',
    'profile.emergencySubtitle': 'Nominated contacts will be automatically notified if safety incidents or emergency SOS is triggered.',
    'profile.addContact': 'Add Emergency Contact',
    'profile.noEmergencyContacts': 'No emergency contacts registered yet. Add family members or Umrah group leaders.',
    'profile.primaryContact': 'Primary Contact',
    'profile.setPrimary': 'Set Primary',
    'profile.securityTitle': 'Account Security & Credentials',
    'profile.securitySubtitle': 'Manage authentication passwords and verify login sessions.',
    'profile.updatePassword': 'Update Password',
    'profile.newPassword': 'New Password',
    'profile.confirmPassword': 'Confirm New Password',
    'profile.passwordLengthHint': 'Minimum 8 characters with letters and numbers',
    'profile.statusTitle': 'VIP Membership & Verification Status',
    'profile.statusSubtitle': 'Your authenticated pilgrim clearance and tier benefits.',
    'profile.accountActive': 'Active Account',
    'profile.emailVerified': 'Email Address Verified',
    'profile.phoneVerified': 'Phone Number Verified',
    'profile.clearanceLevel': 'Clearance Level: VIP Express',
    'profile.dangerZone': 'Danger Zone',
    'profile.deleteAccount': 'Delete VIP Account',
    'profile.deleteWarning': 'Once deleted, your booking records and saved locations cannot be recovered.',

    // Customer Bookings
    'bookings.title': 'My Executive Journeys',
    'bookings.subtitle': 'Review past pilgrimages, monitor active transfers, and download tax receipts.',
    'bookings.searchPlaceholder': 'Search by reference, route, or driver...',
    'bookings.filterAll': 'All Journeys',
    'bookings.filterPending': 'Pending',
    'bookings.filterConfirmed': 'Confirmed',
    'bookings.filterActive': 'Active Rides',
    'bookings.filterCompleted': 'Completed',
    'bookings.filterCancelled': 'Cancelled',
    'bookings.noTrips': 'No journeys found matching your search criteria.',
    'bookings.bookRideNow': 'Book a VIP Ride',
    'bookings.ref': 'Booking Ref',
    'bookings.pickup': 'Pickup Location',
    'bookings.destination': 'Destination',
    'bookings.fare': 'Total Fare',
    'bookings.scheduledTime': 'Scheduled Date & Time',
    'bookings.chauffeur': 'Assigned Chauffeur',
    'bookings.vehicle': 'Vehicle Class',
    'bookings.status': 'Status',
    'bookings.cancelRide': 'Cancel Trip',
    'bookings.trackRide': 'Track Chauffeur',
    'bookings.viewReceipt': 'View Receipt',
    'bookings.uploadPayment': 'Upload Payment Proof',
    'bookings.rateTrip': 'Rate Chauffeur',
    'bookings.viewReview': 'View Review',
    'bookings.unassigned': 'Dispatching Chauffeur...',
    'bookings.taxInvoice': 'Tax Invoice',

    // Customer Track / Live Radar
    'track.title': 'Live Chauffeur Radar',
    'track.subtitle': 'Real-time telemetry, driver positioning, and journey milestones.',
    'track.noActive': 'No Active Journey in Progress',
    'track.noActiveDesc': 'You do not have any ongoing transfers right now. Choose a route to begin your journey.',
    'track.bookTransfer': 'Book VIP Transfer',
    'track.viewHistory': 'View Trip History',
    'track.chauffeurCard': 'Assigned Executive Chauffeur',
    'track.call': 'Call Chauffeur',
    'track.whatsapp': 'WhatsApp Chauffeur',
    'track.vehicleInfo': 'Executive Vehicle Details',
    'track.plate': 'Plate Number',
    'track.milestones': 'Journey Progress',
    'track.liveETA': 'Estimated Arrival',
    'track.distance': 'Remaining Distance',
    'track.downloadInvoice': 'Download PDF Invoice',
    'track.step1Title': 'Submitted',
    'track.step1Desc': 'Your ride request has been received and registered in dispatch central.',
    'track.step2Title': 'Payment Verified',
    'track.step2Desc': 'Payment status and transaction verified by central staff operations.',
    'track.step3Title': 'Driver Assigned',
    'track.step3Desc': 'A certified VIP captain and executive vehicle have been allocated.',
    'track.step4Title': 'Driver Accepted',
    'track.step4Desc': 'Your assigned captain has acknowledged and accepted your transport mission.',
    'track.step5Title': 'Heading to Pickup',
    'track.step5Desc': 'Your chauffeur is actively driving toward your specified pickup address.',
    'track.step6Title': 'Driver Arrived',
    'track.step6Desc': 'Your chauffeur has arrived at the pickup location and is awaiting you.',
    'track.step7Title': 'Trip Started',
    'track.step7Desc': 'Journey is actively underway toward your destination.',
    'track.step8Title': 'Trip Completed',
    'track.step8Desc': 'You have safely reached your destination. Thank you for traveling with us.',

    // Book Ride Panels
    'book.fixedTab': 'VIP Fixed Rates',
    'book.customTab': 'Custom Route Map',
    'book.selectRoute': 'Select Pilgrimage or Airport Route',
    'book.selectVehicle': 'Select Fleet Category',
    'book.selectTerminal': 'Airport Terminal',
    'book.pickupLocation': 'Pickup Address / Hotel',
    'book.dropoffLocation': 'Destination / Haram Gate',
    'book.passengers': 'Passengers',
    'book.luggage': 'Luggage Bags',
    'book.immediate': 'Immediate Pickup (Now)',
    'book.scheduled': 'Schedule for Later',
    'book.flightNumber': 'Flight Number / Notes (Optional)',
    'book.fareSummary': 'Guaranteed Fixed Fare',
    'book.vatNote': 'Includes VAT, airport permits, and highway tolls',
    'book.submitBooking': 'Reserve VIP Chauffeur',
    'book.submitting': 'Registering Reservation...',
    'book.matchingChauffeur': 'Matching nearby chauffeur...',

    // Notifications Drawer
    'notifications.title': 'Notifications',
    'notifications.empty': 'No notifications right now',
    'notifications.clearAll': 'Clear all',
    'notifications.unread': 'unread',
  },

  ar: {
    // Brand & Common
    appName: 'شركة الحرمين للنقل الفاخر',
    vipChauffeur: 'الحرمين لخدمات النقل الفاخر',
    vipPilgrim: 'ضيف الرحمن VIP',
    guestTraveler: 'مسافر كريم',
    save: 'حفظ التعديلات',
    saving: 'جاري الحفظ...',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    search: 'بحث',
    filter: 'تصفية',
    all: 'الكل',
    sar: 'ر.س',
    km: 'كم',
    min: 'دقيقة',
    signOut: 'تسجيل الخروج',
    concierge: 'خدمة العملاء VIP 24/7',
    activeRide: 'رحلة نشطة',
    trackChauffeur: 'تتبع السائق',
    loading: 'جاري التحميل...',
    required: 'مطلوب',
    close: 'إغلاق',
    success: 'تم بنجاح',
    error: 'خطأ',
    viewAll: 'عرض الكل',
    clear: 'مسح',

    // Navigation
    'nav.bookRide': 'حجز رحلة',
    'nav.bookRideSub': 'حجز أسطول كبار الشخصيات',
    'nav.myTrips': 'رحلاتي',
    'nav.myTripsSub': 'السجل والرحلات النشطة',
    'nav.liveRadar': 'الرادار المباشر',
    'nav.liveRadarSub': 'تتبع الرادار بالوقت الفعلي',
    'nav.vipProfile': 'الملف الشخصي VIP',
    'nav.vipProfileSub': 'الحساب والأماكن',
    'nav.live': 'مباشر',
    'nav.radar': 'رادار الأسطول',
    'nav.radarSub': 'تتبع المركبات المباشر',
    'nav.queue': 'طابور الرحلات',
    'nav.queueSub': 'إدارة وتعيين الطلبات',
    'nav.drivers': 'السائقون',
    'nav.driversSub': 'سجل كباتن الأسطول',
    'nav.customers': 'العملاء',
    'nav.customersSub': 'دليل المسافرين والضيوف',
    'nav.newBooking': 'حجز جديد',
    'nav.newBookingSub': 'تسجيل حجز هاتفي',
    'nav.overview': 'نظرة عامة',
    'nav.overviewSub': 'المقصورة التنفيذية',
    'nav.users': 'المستخدمون والصلاحيات',
    'nav.usersSub': 'الموظفون والسائقون والضيوف',
    'nav.services': 'إدارة الخدمات',
    'nav.servicesSub': 'الباقات والتسويق',
    'nav.rates': 'الأسعار والتعريفات',
    'nav.ratesSub': 'دليل الأسعار الثابتة',
    'nav.reports': 'التقارير وسجل الحسابات',
    'nav.reportsSub': 'المطابقة والضرائب',
    'nav.auditLogs': 'سجلات التدقيق',
    'nav.auditLogsSub': 'الأمان والأنشطة',
    'nav.settings': 'إعدادات النظام',
    'nav.settingsSub': 'بيانات الشركة والأسعار الديناميكية',
    'nav.reviews': 'التقييمات والمراجعات',
    'nav.reviewsSub': 'جودة الخدمة والكباتن',

    // Customer VIP Profile
    'profile.title': 'الملف الشخصي لعميل VIP',
    'profile.subtitle': 'إدارة هويتك التنفيذية، جهات الاتصال للطوارئ، وتفضيلات تنقلاتك الفاخرة.',
    'profile.tabPersonal': 'الملف الشخصي',
    'profile.tabEmergency': 'جهات اتصال الطوارئ',
    'profile.tabSecurity': 'الأمان والحساب',
    'profile.tabStatus': 'حالة الحساب',
    'profile.vipBadge': 'عميل VIP مميز',
    'profile.memberSince': 'عضو منذ',
    'profile.completedTrips': 'الرحلات المكتملة',
    'profile.safetyContacts': 'جهات الطوارئ',
    'profile.savedPlaces': 'الأماكن المحفوظة',
    'profile.verifiedContact': 'التحقق من بيانات الاتصال',
    'profile.primaryEmail': 'البريد الإلكتروني الأساسي',
    'profile.verifiedLocked': 'تم التحقق ومؤمّن',
    'profile.phoneNumber': 'رقم الهاتف',
    'profile.noneRecorded': 'لم يُسجل رقم',
    'profile.changePhone': 'تغيير رقم الهاتف',
    'profile.preferredLanguage': 'اللغة المفضلة',
    'profile.languageDesc': 'لغة التواصل مع السائق والمشرف:',
    'profile.langEnglish': 'English',
    'profile.langArabic': 'العربية',
    'profile.langSetSuccess': 'تم تغيير لغة الحساب إلى العربية بنجاح',
    'profile.editDetails': 'تعديل البيانات الشخصية',
    'profile.editDetailsDesc': 'حافظ على دقة معلوماتك الشخصية لتسهيل إجراءات المطار والتنقل.',
    'profile.fullName': 'الاسم القانوني الكامل *',
    'profile.fullNamePlaceholder': 'مثال: د. عبد الله الرحمن',
    'profile.dateOfBirth': 'تاريخ الميلاد',
    'profile.gender': 'الجنس',
    'profile.genderMale': 'ذكر',
    'profile.genderFemale': 'أنثى',
    'profile.genderOther': 'غير ذلك',
    'profile.savePersonal': 'حفظ التعديلات',
    'profile.savingProfile': 'جاري حفظ التعديلات...',
    'profile.changePhoto': 'تحديث الصورة',
    'profile.removePhoto': 'حذف الصورة',
    'profile.photoHint': 'صيغة JPG أو PNG أو WebP بحد أقصى 5 ميجابايت. يُفضل صورة شخصية واضحة للتعرف عليك عند الاستقبال.',
    'profile.emergencyTitle': 'جهات الاتصال للطوارئ والسلامة',
    'profile.emergencySubtitle': 'يتم إشعار جهات الاتصال المسجلة تلقائياً في حالات الطوارئ أو طلب المساعدة الفورية.',
    'profile.addContact': 'إضافة جهة اتصال للطوارئ',
    'profile.noEmergencyContacts': 'لم يتم تسجيل أي جهات اتصال للطوارئ بعد. أضف أفراد العائلة أو مسؤولي الحملة.',
    'profile.primaryContact': 'جهة اتصال أساسية',
    'profile.setPrimary': 'تعيين كأساسي',
    'profile.securityTitle': 'أمان الحساب وبيانات الاعتماد',
    'profile.securitySubtitle': 'تحديث كلمة المرور وإدارة جلسات الدخول بأمان.',
    'profile.updatePassword': 'تحديث كلمة المرور',
    'profile.newPassword': 'كلمة المرور الجديدة',
    'profile.confirmPassword': 'تأكيد كلمة المرور الجديدة',
    'profile.passwordLengthHint': '8 أحرف على الأقل تحتوي على حروف وأرقام',
    'profile.statusTitle': 'حالة العضوية والتحقق',
    'profile.statusSubtitle': 'بيانات اعتماد وتصاريح ضيف الرحمن وتسهيلات كبار الشخصيات.',
    'profile.accountActive': 'حساب نشط ومفعل',
    'profile.emailVerified': 'تم التحقق من البريد الإلكتروني',
    'profile.phoneVerified': 'تم توثيق رقم الجوال',
    'profile.clearanceLevel': 'مستوى الخدمة: نقل تنفيذي VIP',
    'profile.dangerZone': 'إجراءات حساسة',
    'profile.deleteAccount': 'حذف حساب VIP',
    'profile.deleteWarning': 'عند حذف الحساب، سيتم إزالة جميع سجلات رحلاتك والمواقع المحفوظة نهائياً.',

    // Customer Bookings
    'bookings.title': 'رحلاتي التنفيذية',
    'bookings.subtitle': 'استعرض رحلاتك السابقة، تابع الرحلات النشطة، وحمّل الإيصالات الضريبية.',
    'bookings.searchPlaceholder': 'ابحث برقم الحجز، المسار، أو اسم السائق...',
    'bookings.filterAll': 'جميع الرحلات',
    'bookings.filterPending': 'قيد المراجعة',
    'bookings.filterConfirmed': 'المؤكدة',
    'bookings.filterActive': 'الرحلات النشطة',
    'bookings.filterCompleted': 'المكتملة',
    'bookings.filterCancelled': 'الملغية',
    'bookings.noTrips': 'لا توجد رحلات تطابق خيارات البحث المحددة.',
    'bookings.bookRideNow': 'حجز رحلة VIP جديدة',
    'bookings.ref': 'رقم الحجز',
    'bookings.pickup': 'نقطة الانطلاق',
    'bookings.destination': 'الوجهة',
    'bookings.fare': 'إجمالي الأجرة',
    'bookings.scheduledTime': 'الموعد المحدد',
    'bookings.chauffeur': 'السائق المعتمد',
    'bookings.vehicle': 'فئة المركبة',
    'bookings.status': 'الحالة',
    'bookings.cancelTrip': 'إلغاء الرحلة',
    'bookings.trackRide': 'تتبع السائق',
    'bookings.viewReceipt': 'عرض الإيصال',
    'bookings.uploadPayment': 'رفع إيصال الدفع',
    'bookings.rateTrip': 'تقييم السائق',
    'bookings.viewReview': 'عرض التقييم',
    'bookings.unassigned': 'جاري تعيين وتجهيز السائق...',
    'bookings.taxInvoice': 'فاتورة ضريبية',

    // Customer Track / Live Radar
    'track.title': 'رادار تتبع السائق المباشر',
    'track.subtitle': 'التتبع المباشر لمركبتك، موقع السائق، ومراحل الرحلة لحظة بلحظة.',
    'track.noActive': 'لا توجد رحلة نشطة حالياً',
    'track.noActiveDesc': 'ليس لديك رحلة جارية في الوقت الحالي. اختر مسارك المفضل لبدء رحلتك الفاخرة.',
    'track.bookTransfer': 'حجز رحلة VIP جديدة',
    'track.viewHistory': 'عرض سجل الرحلات',
    'track.chauffeurCard': 'السائق التنفيذي المعتمد',
    'track.call': 'اتصال بالسائق',
    'track.whatsapp': 'واتساب السائق',
    'track.vehicleInfo': 'بيانات المركبة الفاخرة',
    'track.plate': 'رقم اللوحة',
    'track.milestones': 'مراحل ومسار الرحلة',
    'track.liveETA': 'الوقت التقديري للوصول',
    'track.distance': 'المسافة المتبقية',
    'track.downloadInvoice': 'تحميل الفاتورة الضريبية (PDF)',
    'track.step1Title': 'تم إرسال الطلب',
    'track.step1Desc': 'تم استلام طلب الرحلة وتسجيله في النظام المركزي لإدارة الأسطول.',
    'track.step2Title': 'تم تأكيد الدفع',
    'track.step2Desc': 'تم التحقق من عملية الدفع من قبل فريق العمليات والمتابعة المركزية.',
    'track.step3Title': 'تم تخصيص السائق',
    'track.step3Desc': 'تم تعيين كابتن معتمد وتجهيز المركبة الفاخرة لمهمتك.',
    'track.step4Title': 'قبول المهمة',
    'track.step4Desc': 'أكد الكابتن استلام المهمة واستعداده لنقلك بكل أمان وراحة.',
    'track.step5Title': 'في الطريق إليك',
    'track.step5Desc': 'السائق في طريقه الآن إلى نقطة الانطلاق المحددة.',
    'track.step6Title': 'وصل السائق',
    'track.step6Desc': 'وصل الكابتن إلى الموقع وهو بانتظار تشريفكم للانطلاق.',
    'track.step7Title': 'الرحلة بدأت',
    'track.step7Desc': 'الرحلة جارية الآن بأمان نحو وجهتكم المباركة.',
    'track.step8Title': 'اكتملت الرحلة',
    'track.step8Desc': 'وصلتم بحفظ الله ورعايته إلى وجهتكم. شكراً لاختياركم الحرمين.',

    // Book Ride Panels
    'book.fixedTab': 'المسارات الثابتة VIP',
    'book.customTab': 'مسار مخصص عبر الخريطة',
    'book.selectRoute': 'اختر مسار الرحلة أو المطار',
    'book.selectVehicle': 'اختر فئة المركبة الفاخرة',
    'book.selectTerminal': 'صالة المطار',
    'book.pickupLocation': 'موقع الانطلاق / اسم الفندق',
    'book.dropoffLocation': 'الوجهة / باب الحرم',
    'book.passengers': 'عدد الركاب',
    'book.luggage': 'عدد الحقائب والأمتعة',
    'book.immediate': 'انطلاق فوري (الآن)',
    'book.scheduled': 'حجز مسبق في موعد محدد',
    'book.flightNumber': 'رقم الرحلة الجوية أو ملاحظات خاصة (اختياري)',
    'book.fareSummary': 'الأجرة الثابتة المضمونة',
    'book.vatNote': 'السعر شامل ضريبة القيمة المضافة وتصاريح المطارات ورسوم الطرق',
    'book.submitBooking': 'تأكيد حجز السائق الخاص VIP',
    'book.submitting': 'جاري تسجيل وتأكيد الحجز...',
    'book.matchingChauffeur': 'جاري البحث عن أقرب كابتن متاح...',

    // Notifications Drawer
    'notifications.title': 'الإشعارات',
    'notifications.empty': 'لا توجد إشعارات جديدة حالياً',
    'notifications.clearAll': 'مسح الكل',
    'notifications.unread': 'غير مقروءة',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  dir: 'ltr',
  isRTL: false,
  setLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback || key,
  dict: DICTIONARY.en,
});

const STORAGE_KEY = 'alharmain_customer_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateUserProfile } = useApp();

  // Initialize language from localStorage or default 'en'
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [hasHydrated, setHasHydrated] = useState(false);

  // Restore stored language on mount
  useEffect(() => {
    let initialLang: SupportedLanguage = 'en';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('alharmain_preferred_language');
      if (isValidLanguage(stored)) {
        initialLang = stored;
      }
    }
    setLanguageState(initialLang);
    setHasHydrated(true);
  }, []);

  // When currentUser loads from Supabase, sync if valid
  useEffect(() => {
    if (!hasHydrated) return;
    const profileLang = currentUser?.preferred_language;
    if (isValidLanguage(profileLang) && profileLang !== language) {
      setLanguageState(profileLang);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, profileLang);
        localStorage.setItem('alharmain_preferred_language', profileLang);
      }
    }
  }, [currentUser?.preferred_language, hasHydrated, language]);

  // Apply dir and lang to HTML document root reactively
  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', dir);
  }, [language, dir]);

  // Set language function (validates, updates state, stores, syncs with Supabase)
  const setLanguage = async (requestedLang: string): Promise<void> => {
    const validLang: SupportedLanguage = requestedLang === 'ar' ? 'ar' : 'en';

    // 1. Update state reactively
    setLanguageState(validLang);

    // 2. Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, validLang);
      localStorage.setItem('alharmain_preferred_language', validLang);
    }

    // 3. Update document attributes immediately
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', validLang);
      document.documentElement.setAttribute('dir', validLang === 'ar' ? 'rtl' : 'ltr');
    }

    // 4. Save to customer's Supabase profile if user is authenticated
    if (currentUser?.id && currentUser.id !== 'guest-profile') {
      try {
        await updateUserProfile({ preferred_language: validLang });
      } catch (err) {
        console.error('Failed to sync language to Supabase profile:', err);
      }
    }

    // 5. Toast feedback in the newly chosen language
    if (validLang === 'ar') {
      toast.success('تم تغيير لغة الحساب إلى العربية بنجاح');
    } else {
      toast.success('Language preference set to English');
    }
  };

  const dict = useMemo(() => DICTIONARY[language] || DICTIONARY.en, [language]);

  const t = (key: string, fallback?: string): string => {
    if (dict && dict[key]) {
      return dict[key];
    }
    if (DICTIONARY.en[key]) {
      return DICTIONARY.en[key];
    }
    return fallback || key;
  };

  const value = useMemo(
    () => ({
      language,
      dir,
      isRTL,
      setLanguage,
      t,
      dict,
    }),
    [language, dir, isRTL, dict]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
