import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export const DEVELOPER_INFO = {
  instagramHandle: '@cybergenius.io',
  instagramUrl: 'https://www.instagram.com/cybergenius.io/',
  developerName: 'ZAID BILAL',
  portfolioLabel: 'Meet the Developer',
  portfolioUrl: 'https://zaidu704.github.io/cybergenius.io/',
};

interface DeveloperCreditProps {
  compact?: boolean;
}

export const DeveloperCredit: React.FC<DeveloperCreditProps> = ({ compact = false }) => {
  return (
    <div
      data-testid="developer-credit"
      className={`pointer-events-auto flex flex-wrap sm:flex-nowrap whitespace-nowrap items-center justify-center gap-x-2.5 gap-y-1 rounded-2xl bg-[#101827]/90 border border-[#FF7043]/45 shadow-[0_8px_28px_rgba(0,0,0,0.65)] ${
        compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs sm:text-[13px]'
      }`}
    >
      {/* Prominent Instagram Icon + Handle Link */}
      <a
        href={DEVELOPER_INFO.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Follow ${DEVELOPER_INFO.instagramHandle} on Instagram`}
        className="group inline-flex items-center space-x-1.5 font-extrabold text-[#FFC247] hover:text-[#FF7043] transition-colors"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-tr from-[#FFC247] via-[#FF7043] to-fuchsia-600 text-white shadow-sm group-hover:scale-105 transition-transform">
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        </span>
        <span className="tracking-wide underline decoration-[#FFC247]/50 underline-offset-2 group-hover:decoration-[#FF7043]">
          {DEVELOPER_INFO.instagramHandle}
        </span>
      </a>

      <span className="text-slate-600 select-none" aria-hidden="true">
        •
      </span>

      {/* Developer Name */}
      <div className="inline-flex items-center space-x-1 text-[#F8FAFC]">
        <span className="text-slate-400 font-medium">Dev:</span>
        <span className="font-bold text-[#F8FAFC] tracking-wide">{DEVELOPER_INFO.developerName}</span>
      </div>

      <span className="hidden sm:inline text-slate-600 select-none" aria-hidden="true">
        •
      </span>

      {/* Clickable Portfolio Link */}
      <a
        href={DEVELOPER_INFO.portfolioUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${DEVELOPER_INFO.portfolioLabel} — ${DEVELOPER_INFO.developerName}`}
        className="inline-flex items-center space-x-1 font-bold text-[#FF7043] hover:text-[#FFC247] transition-colors"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="underline decoration-[#FF7043]/60 underline-offset-2">
          {DEVELOPER_INFO.portfolioLabel}
        </span>
        <ExternalLink className="w-3 h-3 opacity-85 shrink-0" />
      </a>
    </div>
  );
};

