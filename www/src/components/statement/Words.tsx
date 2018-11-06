import { IStatementWord } from '@boombox/shared/src/types/models/transcript'
import classNames from 'classnames'
import * as React from 'react'
import { connect } from 'react-redux'
import { IPlayerStore } from 'store/reducers/player'
import './Words.css'

interface IExternalProps {
  words: IStatementWord[]
}

const InActiveWords: React.SFC<IExternalProps> = ({ words }) => (
  <div className="Words">{words.map(word => word.content.toLowerCase()).join(' ')}</div>
)

interface IActiveWordProps extends IExternalProps {
  currentTime: number
}

const UnconnectedActiveWords: React.SFC<IActiveWordProps> = ({ currentTime, words }) => (
  <div className="Words">
    {words.map(({ content, startTime }, index) => (
      <span
        key={`${content}-${index}`}
        className={classNames('Words__word', {
          // Add 0.5 seconds to the current time to make it so that the highlighting leads the
          // speaker a little bit.
          'Words__word--active': currentTime + 0.5 >= startTime,
        })}
      >
        {content}{' '}
      </span>
    ))}
  </div>
)

const ActiveWords = connect(({ player }: { player: IPlayerStore }) => ({
  currentTime: player.currentTime,
}))(UnconnectedActiveWords)

export default ({ words, isActive }: { words: IStatementWord[]; isActive: boolean }) =>
  isActive ? <ActiveWords words={words} /> : <InActiveWords words={words} />
