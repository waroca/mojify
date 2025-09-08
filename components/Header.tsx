/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { UploadIcon, DownloadIcon } from './icons';
import Logo from './Logo';

interface HeaderProps {
    onUploadNew: () => void;
    onDownload: () => void;
    hasImage: boolean;
}

const Header: React.FC<HeaderProps> = ({ onUploadNew, onDownload, hasImage }) => {
  return (
    <header className="navbar">
      <div>
        <Logo />
      </div>

      {hasImage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-fade-in">
          <button 
              onClick={onUploadNew}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
              aria-label="Upload a new image"
          >
              <UploadIcon className="w-5 h-5" />
              <span>New</span>
          </button>
          <button 
              onClick={onDownload}
              className="btn-primary"
              style={{ padding: '10px' }}
              aria-label="Download the edited image"
          >
              <DownloadIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;