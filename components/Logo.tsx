/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Logo: React.FC = () => (
  <svg width="110" height="36" viewBox="0 0 110 36" xmlns="http://www.w3.org/2000/svg" aria-label="Mojify Logo">
    <style>
      {`
        .logo-text-glitch {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 28px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}
    </style>
    <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="logo-text-glitch" fill="var(--glitch-pink)" transform="translate(1.5 1.5)">
      Mojify
    </text>
    <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="logo-text-glitch" fill="var(--glitch-blue)" transform="translate(-1.5 -1.5)">
      Mojify
    </text>
    <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="logo-text-glitch" fill="var(--matrix-green)">
      Mojify
    </text>
  </svg>
);

export default Logo;
