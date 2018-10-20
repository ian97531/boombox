import { IStatement } from '@boombox/shared/src/types/models/transcript'
import Statement from 'components/Statement'
import { WindowContext } from 'components/WindowEvents'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { getStatements } from 'store/actions/statements'
import { IStatementsStore } from 'store/reducers/statements'
import './ConversationPanel.css'

const SCROLL_DURATION = 300

interface IConversationPanelProps extends IStatementsStore {
  audioTime: number
  dispatch: Dispatch
  onEnableSyncToAudio: () => void
  onDisableSyncToAudio: () => void
  onStatementClick: (statement: IStatement) => void
  requestedEpisodeSlug: string
  requestedPodcastSlug: string
}

interface IConversationPanelState {
  activeStatementIndex?: number
  activeStatementTop?: number
  animate: boolean
  highlightStyle: React.CSSProperties
  syncToAudio: boolean
}

const initialState: IConversationPanelState = {
  animate: true,
  highlightStyle: {
    height: 0,
    width: '100%',
  },
  syncToAudio: true,
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public static getDerivedStateFromProps(
    props: IConversationPanelProps,
    state: IConversationPanelState
  ) {
    const derivedState: IConversationPanelState = {
      ...state,
      activeStatementIndex: state.activeStatementIndex,
    }
    const activeIndex = state.activeStatementIndex
    let findNewActiveIndex = activeIndex === undefined
    if (activeIndex !== undefined) {
      const active = props.statements[activeIndex]
      findNewActiveIndex = !ConversationPanel.checkTimeInStatement(props.audioTime, active)
    }
    if (findNewActiveIndex) {
      // It's probably the next statement.
      const next = activeIndex ? activeIndex + 1 : 0
      if (
        props.statements[next] &&
        ConversationPanel.checkTimeInStatement(props.audioTime, props.statements[next])
      ) {
        derivedState.activeStatementIndex = next
      } else {
        // But if not, go find it in the array.
        props.statements.find((statement, index) => {
          if (ConversationPanel.checkTimeInStatement(props.audioTime, statement)) {
            derivedState.activeStatementIndex = index
            return true
          }
          return false
        })
      }
    }

    return derivedState
  }

  public static checkTimeInStatement(time: number, statement: IStatement): boolean {
    return time >= statement.startTime && time <= statement.endTime
  }

  public readonly state: IConversationPanelState = initialState
  private conversationPanelRef = React.createRef<HTMLDivElement>()
  private syncToAudio: boolean = true

  public render() {
    const statements = this.props.statements.map((statement, index) => {
      const isActive = this.state.activeStatementIndex === index
      const isPast: boolean = !!(
        this.state.activeStatementIndex &&
        this.state.activeStatementIndex >= 0 &&
        this.state.activeStatementIndex < index
      )
      return (
        <Statement
          audioTime={isActive ? this.props.audioTime : undefined}
          isActive={isActive}
          isPast={isPast}
          key={statement.startTime}
          onClick={this.props.onStatementClick}
          ref={statement.startTime.toString()}
          statement={statement}
        />
      )
    })

    return (
      <WindowContext
        onResize={this.onResize}
        onUserScroll={this.onUserScroll}
        onScrollCancelled={this.onScrollCancelled}
        scrollPosition={this.state.syncToAudio ? this.state.activeStatementTop : undefined}
        scrollDuration={this.state.animate ? SCROLL_DURATION : 0}
      >
        {() => {
          return (
            <div className="ConversationPanel" ref={this.conversationPanelRef}>
              <div
                className="ConversationPanel__statement-hightlight"
                style={this.state.highlightStyle}
              />
              <div className="ConversationPanel__statement-list">{statements}</div>
            </div>
          )
        }}
      </WindowContext>
    )
  }

  public componentDidMount() {
    if (this.props.episodeSlug !== this.props.requestedEpisodeSlug) {
      this.props.dispatch(
        getStatements({
          episodeSlug: this.props.requestedEpisodeSlug,
          podcastSlug: this.props.requestedPodcastSlug,
        })
      )
    }
  }

  public componentDidUpdate(
    prevProps: IConversationPanelProps,
    prevState: IConversationPanelState
  ) {
    if (this.state.activeStatementIndex !== prevState.activeStatementIndex) {
      this.updateActiveStatement()
    }
  }

  private onResize = () => {
    this.updateActiveStatement(false)
  }

  private onUserScroll = () => {
    this.setSyncToAudio(false)
  }

  private onScrollCancelled = (userCancelled: boolean) => {
    if (userCancelled) {
      this.setSyncToAudio(false)
    } else {
      this.updateActiveStatement(false)
    }
  }

  private setSyncToAudio = (enabled: boolean) => {
    if (this.syncToAudio !== enabled) {
      this.setState({
        syncToAudio: enabled,
      })
      if (enabled) {
        this.props.onEnableSyncToAudio()
      } else {
        this.props.onDisableSyncToAudio()
      }
    }
  }

  private updateActiveStatement = (animate = true) => {
    const activeStatement = this.getActiveStatementBounds()
    const conversationPanel = this.getConversationPanelBounds()
    if (activeStatement && conversationPanel) {
      const activeStatementTop = activeStatement.top - conversationPanel.top
      const top = activeStatementTop + activeStatement.height / 2
      const height = activeStatement.height
      const width = activeStatement.width
      this.setState({
        activeStatementTop,
        animate,
        highlightStyle: {
          height: 1,
          transform: `translateY(${top}px) scaleY(${height})`,
          transitionDuration: animate ? SCROLL_DURATION.toString() : '0',
          width,
        },
      })
    }
  }

  private getActiveStatementBounds = (): ClientRect | void => {
    if (this.state.activeStatementIndex !== undefined) {
      const activeStatement = this.props.statements[this.state.activeStatementIndex]
      const activeRef = this.refs[activeStatement.startTime.toString()]
      const activeStatementElement = ReactDOM.findDOMNode(activeRef) as Element
      return activeStatementElement.getBoundingClientRect()
    }
  }

  private getConversationPanelBounds = (): ClientRect | void => {
    if (this.conversationPanelRef.current) {
      return this.conversationPanelRef.current.getBoundingClientRect()
    }
  }
}

function mapStateToProps({ statements }: { statements: IStatementsStore }) {
  return {
    ...statements,
  }
}

export default connect(mapStateToProps)(ConversationPanel)
