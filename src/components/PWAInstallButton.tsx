import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  if (variant === 'banner') {
    if (!isInstallable && !isIOS) return null;
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 border border-[#D4AF37]/40 bg-[#18181B] px-4 py-2 text-xs font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0D0D0D] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" />
          Install App
        </button>
        {showGuide && <IOSInstallModal onClose={() => setShowGuide(false)} isIOS={isIOS} />}
      </>
    );
  }

  if (variant === 'footer') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-[#F5F2EB] transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
          {isInstallable ? 'Install Pakeeza Perfumez App' : 'Get Mobile Web App'}
        </button>
        {showGuide && <IOSInstallModal onClose={() => setShowGuide(false)} isIOS={isIOS} />}
      </>
    );
  }

  // Header subtle button (shown when installable or iOS)
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Pakeeza Perfumez App"
        className="hidden sm:inline-flex items-center gap-1.5 border border-[#D4AF37]/35 px-3 py-1.5 text-xs font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0D0D0D] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install</span>
      </button>
      {showGuide && <IOSInstallModal onClose={() => setShowGuide(false)} isIOS={isIOS} />}
    </>
  );
};

const IOSInstallModal: React.FC<{ onClose: () => void; isIOS: boolean }> = ({ onClose, isIOS }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm border border-white/10 bg-[#141416] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-serif text-lg font-semibold text-[#F5F2EB]">
          Install Pakeeza Perfumez App
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {isIOS ? (
        <ol className="mt-4 space-y-2 text-sm text-[#A19D94]">
          <li>1. Tap the <strong className="text-[#F5F2EB]">Share</strong> icon in Safari toolbar.</li>
          <li>2. Scroll down and select <strong className="text-[#F5F2EB]">Add to Home Screen</strong>.</li>
          <li>3. Tap <strong className="text-[#F5F2EB]">Add</strong> to launch full-screen.</li>
        </ol>
      ) : (
        <p className="mt-4 text-sm text-[#A19D94]">
          Open your browser menu and select <strong className="text-[#F5F2EB]">Install App</strong> or{' '}
          <strong className="text-[#F5F2EB]">Add to Home Screen</strong> for instant offline catalog access.
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full bg-[#D4AF37] py-2.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] cursor-pointer"
      >
        Done
      </button>
    </div>
  </div>
);

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 border border-amber-400/30 bg-[#18181B] px-3.5 py-2 text-xs font-medium text-amber-300 shadow-lg md:bottom-5">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode — Browsing cached fragrances</span>
    </div>
  );
};
