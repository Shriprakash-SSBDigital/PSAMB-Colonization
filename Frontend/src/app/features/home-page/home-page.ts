import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Announcement {
  id: number;
  // date: string;
  title: string;
  isNew: boolean;
  url?: string; // Optional URL for the announcement
}

interface QuickLink {
  id: number;
  title: string;
  punjabiTitle: string;
  icon: string;
  route: string;
  color: string;
  queryParams?: any;
}

interface PhotoItem {
  id: number;
  title: string;
  image: string;
  loaded?: boolean;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, MatIconModule, MatButtonModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  announcements: Announcement[] = [
    { id: 1, title: 'Tender Document for Hiring Vehicles', isNew: true, url: 'https://emandikaran-pb.in/files/HiringVehicles.pdf' },
    { id: 2, title: 'Notification Regarding Fruit Items', isNew: true, url: 'https://emandikaran-pb.in/files/Notification-Regarding-Fruit-Items.pdf' },
    { id: 3, title: 'Self Declaration/Manual Form for Aayushmaan Scheme', isNew: false, url: 'https://emandikaran-pb.in/files/Ayushman_bharat_self_declaration.pdf' },
    { id: 4, title: 'Instruction Regarding Manpower Contractor.', isNew: false ,url: 'https://emandikaran-pb.in/files/Draft%20Man_power_enlistment_26-27.pdf'},
    { id: 5, title: 'Instruction Regarding Enlistment of Contractor', isNew: false, url: 'https://emandikaran-pb.in/files/Draft%20enlmt_Marketing_2026-27_.pdf' },
    { id: 5, title: 'Canteen corrigendum', isNew: false, url: 'https://emandikaran-pb.in/files/CafeTender.pdf' },
    { id: 5, title: 'E-Auction User Manual', isNew: false, url: 'https://emandikaran-pb.in/files/UserManual_PMBeNavida_Registration.pdf' },
    { id: 5, title: 'Video Guide for E-auction', isNew: false, url: 'https://emandikaran-pb.in/files/CafeTender.pdf' },
    { id: 5, title: 'Tender Notice For Plantation and Grassing', isNew: false, url: 'https://emandikaran-pb.in/files/Tender_notice_for_plantation_and_grassing.pdf' },
    { id: 5, title: 'Kisan Bhawan Bid document for furniture', isNew: false, url: 'https://emandikaran-pb.in/files/Kisan_Bhawan_Bid_document_for_furniture.pdf' },
    { id: 5, title: 'Self Declaration/Manual Form for Aayushmaan', isNew: false, url: 'https://emandikaran-pb.in/files/Ayushman_bharat_self_declaration.pdf' },
    { id: 5, title: 'Tender for Supply/ Stitching of Uniforms, Shoes etc', isNew: false, url: 'https://emandikaran-pb.in/files/Uniformtenders.pdf' },
    { id: 5, title: 'Notification Regarding Fruit Items', isNew: false, url: 'https://emandikaran-pb.in/files/Notification-Regarding-Fruit-Items.pdf' },
    { id: 5, title: 'EOI for Installation, Operation & Maintenance of Electric Vehicles (EVs)', isNew: false, url: 'https://emandikaran-pb.in/files/DNIT-RegEVCharger-Station-at-Kisan-Bhawan.pdf' },
  ];

  quickLinks: QuickLink[] = [
    { id: 1, title: 'Citizen Login', punjabiTitle: 'ਬਿਨੈਕਾਰ ਲੋਗਇਨ', icon: 'login', route: '/login', color: 'blue', queryParams: { mode: 'signin' } },
    { id: 2, title: 'New Registration', punjabiTitle: 'ਨਵੀਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ', icon: 'person_add', route: '/login', color: 'teal', queryParams: { mode: 'signup' } },
    { id: 3, title: 'Active e-Auctions', punjabiTitle: 'ਚੱਲ ਰਹੀਆਂ ਬੋਲੀਆਂ', icon: 'gavel', route: '/login', color: 'purple', queryParams: { mode: 'signin' } },
    { id: 4, title: 'Verify Property', punjabiTitle: 'ਜਾਇਦਾਦ ਦੀ ਜਾਂਚ', icon: 'fact_check', route: '/login', color: 'orange', queryParams: { mode: 'signin' } },
    { id: 5, title: 'Apply for NOC', punjabiTitle: 'NOC ਲਈ ਅਪਲਾਈ ਕਰੋ', icon: 'article', route: '/login', color: 'emerald', queryParams: { mode: 'signin' } },
    { id: 6, title: 'Grievance Redressal', punjabiTitle: 'ਸ਼ਿਕਾਇਤ ਨਿਵਾਰਨ', icon: 'support_agent', route: '/login', color: 'rose', queryParams: { mode: 'signin' } }
  ];

  photos: PhotoItem[] = [
    { id: 1, title: 'Mandi Image', image: 'assets/Mandi16.JPG' },
    { id: 2, title: 'Mandi Image', image: 'assets/Mandi17.JPG' },
    { id: 3, title: 'Mandi Image', image: 'assets/Mandi15.jpg' },
    { id: 4, title: 'Mandi Image', image: 'assets/Mandi13.jpg' },
    { id: 5, title: 'Mandi Image', image: 'assets/Mandi18.JPG' },
    { id: 6, title: 'Mandi Image', image: 'assets/Mandi19.JPG' },
    { id: 7, title: 'Mandi Image', image: 'assets/Mandi14.jpg' },
    // { id: 8, title: 'Mandi Image', image: 'assets/Mandi8.jpg' },
    { id: 9, title: 'Mandi Image', image: 'assets/Mandi12.jpg' },
    { id: 10, title: 'Mandi Image', image: 'assets/Mandi11.jpg' },
  ];

  leadershipShortlist = [
    {
      id: 'cm',
      name: "Hon'ble Chief Minister",
      punjabiName: "ਮਾਨਯੋਗ ਮੁੱਖ ਮੰਤਰੀ",
      image: 'assets/chief minister.jpg',
      role: "Sh. Bhagwant Singh Mann"
    },
    {
      id: 'fm',
      name: "Hon'ble Agriculture Minister ",
      punjabiName: "ਮਾਨਯੋਗ ਖੇਤੀਬਾੜੀ ਮੰਤਰੀ",
      image: "assets/agriculture_minister.jpg",
      role: "Sh. Gurmeet Singh Khuddian"
    },
    {
      id: 'doc',
      name: "Director of Colonization",
      punjabiName: "\u0A21\u0A3E\u0A07\u0A30\u0A48\u0A15\u0A1F\u0A30 \u0A06\u0A2c\u0A3e\u0A26\u0A15\u0A3e\u0A30\u0A40",
      image: "assets/ias_image.jpg",
      role: "Dr. Baldeep Kaur IAS"
    }
  ];
  private autoplayTimer: any;
  private readonly AUTOPLAY_DELAY = 3000;
  isLeaderModalOpen = false;
  selectedLeaderId: string | null = null;
  selectedLeaderData: any = null;

  leadershipMessages: Record<string, any> = {
    cm: {
      id: 'cm',
      name: 'Sh. Bhagwant Singh Mann',
      title: "Hon'ble Chief Minister, Punjab",
      punjabiTitle: "ਮਾਨਯੋਗ ਮੁੱਖ ਮੰਤਰੀ, ਪੰਜਾਬ",
      image: "assets/chief minister.jpg",
      quote: "Our vision is to make Punjab a hub of digital governance and commercial prosperity.",
      punjabiQuote: "ਸਾਡਾ ਸੰਕਲਪ ਪੰਜਾਬ ਨੂੰ ਡਿਜੀਟਲ ਗਵਰਨੈਂਸ ਅਤੇ ਵਪਾਰਕ ਖੁਸ਼ਹਾਲੀ ਦਾ ਕੇਂਦਰ ਬਣਾਉਣਾ ਹੈ।",
      fullMessage: [
        "Punjab, the land of great heritage, courage, and resilience, has always stood as a symbol of progress and unity. ",
        "Our government is firmly committed to building a transparent, efficient, and citizen-centric administration that works for the welfare of every individual.",
        "We are continuously striving to strengthen infrastructure, improve public services, and ensure that every section of society benefits from development. ",
        "Special emphasis is being placed on digital transformation, ease of access to government services, and creating opportunities for the youth of Punjab.",
        "Our vision is to make Punjab a leading state in innovation, agriculture, education, and industry. With collective efforts, dedication, and public participation, we aim to bring positive change and ensure a brighter future for our coming generations. I extend my heartfelt gratitude to the people of Punjab for their trust and support. Together, we will continue to work towards prosperity, inclusivity, and sustainable development."
      ],
      punjabiFullMessage: [
        "ਪੰਜਾਬ, ਜੋ ਆਪਣੀ ਮਹਾਨ ਵਿਰਾਸਤ, ਹਿੰਮਤ ਅਤੇ ਸਹਿਨਸ਼ੀਲਤਾ ਲਈ ਜਾਣਿਆ ਜਾਂਦਾ ਹੈ, ਹਮੇਸ਼ਾਂ ਤਰੱਕੀ ਅਤੇ ਏਕਤਾ ਦਾ ਪ੍ਰਤੀਕ ਰਿਹਾ ਹੈ। ਸਾਡੀ ਸਰਕਾਰ ਹਰ ਇਕ ਵਿਅਕਤੀ ਦੀ ਭਲਾਈ ਲਈ ਪਾਰਦਰਸ਼ੀ, ਪ੍ਰਭਾਵਸ਼ਾਲੀ ਅਤੇ ਲੋਕ-ਕੇਂਦਰਿਤ ਪ੍ਰਸ਼ਾਸਨ ਬਣਾਉਣ ਲਈ ਪੂਰੀ ਤਰ੍ਹਾਂ ਵਚਨਬੱਧ ਹੈ।",
        "ਅਸੀਂ ਲਗਾਤਾਰ ਬੁਨਿਆਦੀ ਢਾਂਚੇ ਨੂੰ ਮਜ਼ਬੂਤ ਕਰਨ, ਸਰਕਾਰੀ ਸੇਵਾਵਾਂ ਵਿੱਚ ਸੁਧਾਰ ਕਰਨ ਅਤੇ ਇਹ ਯਕੀਨੀ ਬਣਾਉਣ ਲਈ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਹੇ ਹਾਂ ਕਿ ਸਮਾਜ ਦੇ ਹਰ ਵਰਗ ਨੂੰ ਵਿਕਾਸ ਦਾ ਲਾਭ ਮਿਲੇ। ਡਿਜ਼ਿਟਲ ਬਦਲਾਅ, ਸਰਕਾਰੀ ਸੇਵਾਵਾਂ ਤੱਕ ਆਸਾਨ ਪਹੁੰਚ ਅਤੇ ਪੰਜਾਬ ਦੇ ਨੌਜਵਾਨਾਂ ਲਈ ਮੌਕੇ ਪੈਦਾ ਕਰਨ ‘ਤੇ ਖਾਸ ਧਿਆਨ ਦਿੱਤਾ ਜਾ ਰਿਹਾ ਹੈ।",
        "ਸਾਡਾ ਵਿਜ਼ਨ ਪੰਜਾਬ ਨੂੰ ਨਵੀਨਤਾ, ਖੇਤੀਬਾੜੀ, ਸਿੱਖਿਆ ਅਤੇ ਉਦਯੋਗ ਦੇ ਖੇਤਰਾਂ ਵਿੱਚ ਅੱਗੇ ਲੈ ਜਾਣਾ ਹੈ। ਸਾਂਝੇ ਯਤਨਾਂ, ਸਮਰਪਣ ਅਤੇ ਲੋਕ ਭਾਗੀਦਾਰੀ ਨਾਲ ਅਸੀਂ ਸਕਾਰਾਤਮਕ ਬਦਲਾਅ ਲਿਆਉਣ ਅਤੇ ਆਉਣ ਵਾਲੀਆਂ ਪੀੜ੍ਹੀਆਂ ਲਈ ਚੰਗਾ ਭਵਿੱਖ ਯਕੀਨੀ ਬਣਾਉਣ ਦਾ ਲਕਸ਼ ਰੱਖਦੇ ਹਾਂ।",
        "ਮੈਂ ਪੰਜਾਬ ਦੇ ਲੋਕਾਂ ਦਾ ਉਨ੍ਹਾਂ ਦੇ ਭਰੋਸੇ ਅਤੇ ਸਹਿਯੋਗ ਲਈ ਦਿਲੋਂ ਧੰਨਵਾਦ ਕਰਦਾ ਹਾਂ। ਅਸੀਂ ਇਕੱਠੇ ਮਿਲ ਕੇ ਖੁਸ਼ਹਾਲੀ, ਸਮਾਵੇਸ਼ਤਾ ਅਤੇ ਟਿਕਾਊ ਵਿਕਾਸ ਵੱਲ ਅੱਗੇ ਵਧਦੇ ਰਹਾਂਗੇ।  "
      ]
    },
    fm: {
      id: 'fm',
      name: 'Sh. Gurmeet Singh Khuddian',
      title: "Hon'ble Agriculture Minister, Punjab",
      punjabiTitle: "ਮਾਨਯੋਗ ਖੇਤੀਬਾੜੀ ਮੰਤਰੀ, ਪੰਜਾਬ",
      image: "assets/agriculture_minister.jpg",
      quote: "Empowering our farmers and boosting the rural economy through modern agricultural infrastructure is our top priority.",
      punjabiQuote: "ਆਧੁਨਿਕ ਖੇਤੀਬਾੜੀ ਬੁਨਿਆਦੀ ਢਾਂਚੇ ਰਾਹੀਂ ਸਾਡੇ ਕਿਸਾਨਾਂ ਨੂੰ ਸਮਰੱਥ ਬਣਾਉਣਾ ਅਤੇ ਪੇਂਡੂ ਆਰਥਿਕਤਾ ਨੂੰ ਮਜ਼ਬੂਤ ਕਰਨਾ ਸਾਡੀ ਮੁੱਖ ਤਰਜੀਹ ਹੈ।",
      fullMessage: [
        "Punjab has always been the breadbasket of the nation, built on the hard work, resilience, and dedication of our farming community. As the Hon’ble Agriculture Minister, our commitment is to empower our farmers, modernize agricultural practices, and ensure sustainable growth across the state.",
        "We are focused on strengthening Punjab's agricultural ecosystem by advancing crop diversification, promoting eco-friendly farming, improving irrigation networks, and guaranteeing timely access to quality seeds, fertilizers, and modern equipment. Special emphasis is being placed on supporting small and marginal farmers, ensuring fair market access, and increasing farm incomes.",
        "Our goal is to build a resilient and modern agricultural sector that generates sustainable employment, protects our soil and water resources, and secures the future of rural Punjab. Through strategic planning, technological innovation, and farmer-centric governance, we aim to make agriculture more profitable and sustainable.",
        "I express my sincere gratitude to the hardworking farmers and people of Punjab for their unwavering dedication. Together, we will work towards a prosperous, green, and vibrant Punjab. "
      ],
      punjabiFullMessage: [
        "ਪੰਜਾਬ ਹਮੇਸ਼ਾ ਦੇਸ਼ ਦਾ 'ਅੰਨਦਾਤਾ' ਰਿਹਾ ਹੈ, ਜੋ ਸਾਡੇ ਕਿਸਾਨ ਭਾਈਚਾਰੇ ਦੀ ਅਣਥੱਕ ਮਿਹਨਤ, ਦ੍ਰਿੜਤਾ ਅਤੇ ਸਮਰਪਣ 'ਤੇ ਟਿਕਿਆ ਹੋਇਆ ਹੈ। ਮਾਨਯੋਗ ਖੇਤੀਬਾੜੀ ਮੰਤਰੀ ਵਜੋਂ, ਸਾਡੀ ਵਚਨਬੱਧਤਾ ਕਿਸਾਨਾਂ ਨੂੰ ਸਮਰੱਥ ਬਣਾਉਣਾ, ਖੇਤੀਬਾੜੀ ਤਰੀਕਿਆਂ ਦਾ ਆਧੁਨਿਕੀਕਰਨ ਕਰਨਾ ਅਤੇ ਰਾਜ ਵਿੱਚ ਟਿਕਾਊ ਵਿਕਾਸ ਨੂੰ ਯਕੀਨੀ ਬਣਾਉਣਾ ਹੈ।",
        "ਅਸੀਂ ਫਸਲੀ ਭਿੰਨਤਾ ਨੂੰ ਉਤਸ਼ਾਹਿਤ ਕਰਕੇ, ਵਾਤਾਵਰਣ ਪੱਖੀ ਖੇਤੀ ਨੂੰ ਬੜ੍ਹਾਵਾ ਦੇ ਕੇ, ਸਿੰਚਾਈ ਨੈੱਟਵਰਕ ਵਿੱਚ ਸੁਧਾਰ ਕਰਕੇ ਅਤੇ ਉੱਚ ਮਿਆਰੀ ਬੀਜਾਂ, ਖਾਦਾਂ ਅਤੇ ਆਧੁਨਿਕ ਮਸ਼ੀਨਰੀ ਦੀ ਸਮੇਂ ਸਿਰ ਉਪਲਬਧਤਾ ਯਕੀਨੀ ਬਣਾ ਕੇ ਪੰਜਾਬ ਦੇ ਖੇਤੀਬਾੜੀ ਖੇਤਰ ਨੂੰ ਮਜ਼ਬੂਤ ਕਰਨ 'ਤੇ ਧਿਆਨ ਕੇਂਦਰਿਤ ਕਰ ਰਹੇ ਹਾਂ। ਛੋਟੇ ਅਤੇ ਸੀਮਾਂਤ ਕਿਸਾਨਾਂ ਦੀ ਸਹਾਇਤਾ ਕਰਨ, ਮੰਡੀਕਰਨ ਨੂੰ ਆਸਾਨ ਬਣਾਉਣ ਅਤੇ ਕਿਸਾਨੀ ਆਮਦਨ ਵਧਾਉਣ 'ਤੇ ਵਿਸ਼ੇਸ਼ ਜ਼ੋਰ ਦਿੱਤਾ ਜਾ ਰਿਹਾ ਹੈ।",
        "ਸਾਡਾ ਉਦੇਸ਼ ਇੱਕ ਅਜਿਹਾ ਮਜ਼ਬੂਤ ਅਤੇ ਆਧੁਨਿਕ ਖੇਤੀਬਾੜੀ ਖੇਤਰ ਤਿਆਰ ਕਰਨਾ ਹੈ ਜੋ ਰੋਜ਼ਗਾਰ ਦੇ ਮੌਕੇ ਪੈਦਾ ਕਰੇ, ਸਾਡੀ ਜ਼ਮੀਨ ਅਤੇ ਪਾਣੀ ਦੇ ਸਰੋਤਾਂ ਦੀ ਸੰਭਾਲ ਕਰੇ, ਅਤੇ ਪੰਜਾਬ ਦੇ ਪੇਂਡੂ ਭਵਿੱਖ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰੇ। ਯੋਜਨਾਬੱਧ ਨੀਤੀਆਂ, ਤਕਨਾਲੋਜੀ ਦੇ ਸੁਚੱਜੇ ਪ੍ਰਯੋਗ ਅਤੇ ਕਿਸਾਨ ਪੱਖੀ ਪ੍ਰਸ਼ਾਸਨ ਰਾਹੀਂ, ਅਸੀਂ ਖੇਤੀਬਾੜੀ ਨੂੰ ਹੋਰ ਲਾਹੇਵੰਦ ਅਤੇ ਟਿਕਾਊ ਬਣਾਉਣ ਲਈ ਯਤਨਸ਼ੀਲ ਹਾਂ।",
        "ਮੈਂ ਪੰਜਾਬ ਦੇ ਮਿਹਨਤੀ ਕਿਸਾਨਾਂ ਅਤੇ ਆਮ ਨਾਗਰਿਕਾਂ ਦਾ ਅਤੁੱਟ ਵਿਸ਼ਵਾਸ ਅਤੇ ਸਹਿਯੋਗ ਲਈ ਤਹਿ ਦਿਲੋਂ ਧੰਨਵਾਦ ਕਰਦਾ ਹਾਂ। ਆਓ ਸਾਰੇ ਮਿਲ ਕੇ ਇੱਕ ਖੁਸ਼ਹਾਲ, ਹਰਿਆ-ਭਰਿਆ ਅਤੇ ਗਤੀਸ਼ੀਲ ਪੰਜਾਬ ਬਣਾਉਣ ਲਈ ਕੰਮ ਕਰੀਏ।"
      ]
    },
    doc: {
      id: 'doc',
      name: 'Dr. Baldeep Kaur IAS',
      title: "Director of Colonization, Punjab",
      punjabiTitle: "\u0A21\u0A3E\u0A07\u0A30\u0A48\u0A15\u0A1F\u0A30 \u0A06\u0A2c\u0A3e\u0A26\u0A15\u0A3e\u0A30\u0A40, \u0A2a\u0A70\u0A1c\u0A3e\u0A2c",
      image: "assets/ias_image.jpg",
      quote: "Welcome to the Digital Property and e-Auction Portal. We are dedicated to providing seamless, paperless citizen services.",
      punjabiQuote: "ਡਿਜੀਟਲ ਪ੍ਰਾਪਰਟੀ ਅਤੇ ਈ-ਨਿਲਾਮੀ ਪੋਰਟਲ 'ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਅਸੀਂ ਨਿਰਵਿਘਨ ਅਤੇ ਕਾਗਜ਼ ਰਹਿਤ ਨਾਗਰਿਕ ਸੇਵਾਵਾਂ ਪ੍ਰਦਾਨ ਕਰਨ ਲਈ ਵਚਨਬੱਧ ਹਾਂ।",
      fullMessage: [
        "As Director of Colonization, my primary mission is the modernization of our land administration systems. We have completely overhauled our allotment files, mutation registries, and auction workflows into secure digital models.",
        "Citizens can now check their property ledger cards, pay lease installments, Transfer of Properties, and participate in active e-Auctions directly from their homes or offices without visiting government desks. Our target is a fully transparent administration, faster delivery of NOCs, and automated land allotment procedures.",
        "We are continuously upgrading our portals to bring more convenience and ease of access. I encourage all citizen bid applicants to review online instructional videos and bid with confidence on our secure portal."
      ],
      punjabiFullMessage: [
        "ਡਾਇਰੈਕਟਰ ਆਬਾਦਕਾਰੀ ਵਜੋਂ, ਮੇਰਾ ਮੁੱਖ ਉਦੇਸ਼ ਜ਼ਮੀਨੀ ਪ੍ਰਸ਼ਾਸਨ ਪ੍ਰਣਾਲੀਆਂ ਦਾ ਆਧੁਨਿਕੀਕਰਨ ਕਰਨਾ ਹੈ। ਅਸੀਂ ਅਲਾਟਮੈਂਟ ਫਾਈਲਾਂ, ਤਬਦੀਲੀ ਰਜਿਸਟਰੀਆਂ ਅਤੇ ਬੋਲੀ ਪ੍ਰਕਿਰਿਆਵਾਂ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਡਿਜੀਟਲ ਮਾਡਲਾਂ ਵਿੱਚ ਤਬਦੀਲ ਕਰ ਦਿੱਤਾ ਹੈ।",
        "ਨਾਗਰਿਕ ਹੁਣ ਆਪਣੇ ਘਰਾਂ ਜਾਂ ਦਫ਼ਤਰਾਂ ਤੋਂ ਸਿੱਧੇ ਆਪਣੇ ਪ੍ਰਾਪਰਟੀ ਲੈਜਰ ਕਾਰਡਾਂ ਦੀ ਜਾਂਚ ਕਰ ਸਕਦੇ ਹਨ, ਲੀਜ਼ ਦੀਆਂ ਕਿਸ਼ਤਾਂ ਦਾ ਭੁਗਤਾਨ ਕਰ ਸਕਦੇ ਹਨ ਅਤੇ ਈ-ਨਿਲਾਮੀ ਵਿੱਚ ਹਿੱਸਾ ਲੈ ਸਕਦੇ ਹਨ। ਸਾਡਾ ਟੀਚਾ ਪੂਰੀ ਤਰ੍ਹਾਂ ਪਾਰਦਰਸ਼ੀ ਪ੍ਰਸ਼ਾਸਨ ਅਤੇ ਸਰਲ ਪ੍ਰਕਿਰਿਆਵਾਂ ਹਨ।",
        "ਅਸੀਂ ਨਾਗਰਿਕਾਂ ਦੀ ਸਹੂਲਤ ਲਈ ਪੋਰਟਲ ਨੂੰ ਲਗਾਤਾਰ ਅਪਗ੍ਰੇਡ ਕਰ ਰਹੇ ਹਾਂ। ਮੈਂ ਸਾਰੇ ਬਿਨੈਕਾਰਾਂ ਨੂੰ ਭਰੋਸੇ ਨਾਲ ਸਾਡੇ ਸੁਰੱਖਿਅਤ ਪੋਰਟਲ 'ਤੇ ਬੋਲੀ ਲਗਾਉਣ ਲਈ ਸੱਦਾ ਦਿੰਦੀ ਹਾਂ।"
      ]
    }
  };

  openLeaderModal(id: string) {
    this.selectedLeaderId = id;
    this.selectedLeaderData = this.leadershipMessages[id];
    this.isLeaderModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLeaderModal() {
    this.isLeaderModalOpen = false;
    this.selectedLeaderId = null;
    this.selectedLeaderData = null;
    document.body.style.overflow = '';
  }

  @ViewChild('galleryContainer') galleryContainer!: ElementRef<HTMLDivElement>;

   ngAfterViewInit() {
    this.startAutoplay();
  }
  ngOnDestroy() {
    this.pauseAutoplay();
  }

  selectMessageTab(tab: string) {
    const element = document.getElementById('messages-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
 scrollGallery(direction: number) {
    const container = this.galleryContainer?.nativeElement;
    if (!container) return;

    const card = container.querySelector('.photo-thumbnail-card') as HTMLElement;
    if (!card) return;

    const gap = 12; // must match your CSS gap
    const cardWidth = card.offsetWidth + gap;
    const maxScroll = container.scrollWidth - container.clientWidth;

    // If we're already at (or past) the end, loop back to the start
    if (direction > 0 && container.scrollLeft >= maxScroll - 5) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (direction < 0 && container.scrollLeft <= 5) {
      container.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }

    const target = container.scrollLeft + cardWidth * direction;
    container.scrollTo({ left: target, behavior: 'smooth' });
  }
  
  startAutoplay() {
    this.pauseAutoplay(); // avoid stacking multiple intervals
    this.autoplayTimer = setInterval(() => {
      this.scrollGallery(1);
    }, this.AUTOPLAY_DELAY);
  }

  pauseAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  resumeAutoplay() {
    this.startAutoplay();
  }



  private animateScroll(element: HTMLElement, target: number, duration: number) {
    const start = element.scrollLeft;
    const change = target - start;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Snappy easeOutQuad easing
      const ease = progress * (2 - progress);
      element.scrollLeft = start + change * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }
}
