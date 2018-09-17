import * as React from 'react'

export default () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    version="1.1"
  >
    <defs>
      <symbol id="sprite-pause" viewBox="0 0 100 100">
        <rect x="0" y="0" width="40" height="100" />
        <rect x="60" y="0" width="40" height="100" />
      </symbol>
      <symbol id="sprite-play" viewBox="0 0 100 100">
        <polygon
          transform="translate(50, 50) rotate(90) translate(-50, -50) "
          points="50.4785714 12.5214286 100.478571 87.4785714 0.478571429 87.4785714"
        />
      </symbol>
    </defs>
  </svg>
)
