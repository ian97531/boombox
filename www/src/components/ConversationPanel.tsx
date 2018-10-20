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
  highlightStyle: object
  scrollDuration: number
  scrollPosition?: number
}

const initialState: IConversationPanelState = {
  highlightStyle: {
    height: 0,
    width: '100%',
  },
  scrollDuration: SCROLL_DURATION,
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public static getDerivedStateFromProps(
    props: IConversationPanelProps,
    state: IConversationPanelState
  ) {
    const derivedState: IConversationPanelState = {
      activeStatementIndex: state.activeStatementIndex,
      highlightStyle: state.highlightStyle,
      scrollDuration: state.scrollDuration,
      scrollPosition: state.scrollPosition,
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
        scrollPosition={this.state.scrollPosition}
        scrollDuration={this.state.scrollDuration}
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
      this.updateHighlight()
    }
  }

  private onResize = () => {
    this.updateHighlight(false)
  }

  private onUserScroll = () => {
    this.setSyncToAudio(false)
  }

  private setSyncToAudio = (enabled: boolean) => {
    if (this.syncToAudio !== enabled) {
      this.syncToAudio = enabled
      if (enabled) {
        this.scrollToActiveStatement()
        this.props.onEnableSyncToAudio()
      } else {
        this.props.onDisableSyncToAudio()
      }
    }
  }

  private updateHighlight = (animate = true) => {
    const activeStatement = this.getActiveStatementBounds()
    const conversationPanel = this.getConversationPanelBounds()
    if (activeStatement && conversationPanel) {
      const scrollTop = activeStatement.top - conversationPanel.top
      const top = scrollTop + activeStatement.height / 2
      const height = activeStatement.height
      const width = activeStatement.width
      this.setState({
        highlightStyle: {
          height: 1,
          transform: `translateY(${top}px) scaleY(${height})`,
          transitionProperty: animate ? 'transform' : 'none',
          width,
        },
      })

      this.scrollToActiveStatement(animate)
    }
  }

  private scrollToActiveStatement = (animate = true) => {
    if (this.syncToAudio) {
      const activeStatementBounds = this.getActiveStatementBounds()
      const conversationPanelBounds = this.getConversationPanelBounds()
      if (activeStatementBounds && conversationPanelBounds) {
        const scrollPosition = activeStatementBounds.top - conversationPanelBounds.top
        const scrollDuration = animate ? SCROLL_DURATION : 0
        this.setState({
          scrollDuration,
          scrollPosition,
        })
      }
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
