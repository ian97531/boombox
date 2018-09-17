import classNames from 'classnames'
import * as React from 'react'
import './Sprite.css'

interface ISpriteProps {
  id: string
  className?: string
}

export default ({ id, className }: ISpriteProps) => (
  <svg className={classNames('Sprite', className)}>
    <use xlinkHref={`#sprite-${id}`} />
  </svg>
)
