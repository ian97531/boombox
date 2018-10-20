import { IStatement } from '@boombox/shared/src/types/models/transcript'
import Statement from 'components/Statement'
import { IWindowContext } from 'components/WindowEvents'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { getStatements } from 'store/actions/statements'
import { IStatementsStore } from 'store/reducers/statements'
import './ConversationPanel.css'

interface IConversationPanelProps extends IStatementsStore {
  audioTime: number
  dispatch: Dispatch
  onEnableSyncToAudio: () => void
  onDisableSyncToAudio: () => void
  onStatementClick: (statement: IStatement) => void
  requestedEpisodeSlug: string
  requestedPodcastSlug: string
  windowEvents: IWindowContext
}

interface IConversationPanelState {
  activeStatementIndex?: number
  highlightStyle?: object
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public static getDerivedStateFromProps(
    props: IConversationPanelProps,
    state: IConversationPanelState
  ) {
    const derivedState: IConversationPanelState = {
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

  public readonly state: IConversationPanelState = {}
  private conversationPanelRef = React.createRef<HTMLDivElement>()
  private animate: boolean = true
  private syncToAudio: boolean = true

  public render() {
    const styles = this.getHightlightStyle()
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
      <div className="ConversationPanel" ref={this.conversationPanelRef}>
        <div className="ConversationPanel__statement-hightlight" style={styles} />
        <div className="ConversationPanel__statement-list">{statements}</div>
      </div>
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
    this.props.windowEvents.addUserScrollListener(this.onUserScroll)
    this.props.windowEvents.addResizeListener(this.onResize)
  }

  public componentWillUnmount() {
    this.props.windowEvents.removeUserScrollListener(this.onUserScroll)
    this.props.windowEvents.removeResizeListener(this.onResize)
  }

  public componentDidUpdate(
    prevProps: IConversationPanelProps,
    prevState: IConversationPanelState
  ) {
    // Turn animations back on if we just rendered without them. This happens when the window
    // resizes and the highlights and scroll positions need to be updated without animations.
    if (this.animate === false) {
      this.animate = true
    }

    if (this.state.activeStatementIndex !== prevState.activeStatementIndex) {
      this.updateHighlight()
    }
  }

  private onResize = () => {
    this.animate = false
    this.updateHighlight()
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

  private updateHighlight = () => {
    const activeStatement = this.getActiveStatementBounds()
    const conversationPanel = this.getConversationPanelBounds()
    if (activeStatement && conversationPanel) {
      const top = activeStatement.top - conversationPanel.top + activeStatement.height / 2
      const height = activeStatement.height
      const width = activeStatement.width
      const highlightStyle = {
        height: 1,
        transform: `translateY(${top}px) scaleY(${height})`,
        transitionProperty: this.animate ? 'transform' : 'none',
        width,
      }
      window.requestAnimationFrame(() => {
        this.setState({
          highlightStyle,
        })
      })
      this.scrollToActiveStatement()
    }
  }

  private getHightlightStyle = (): object => {
    let style: any
    if (this.state.highlightStyle !== undefined) {
      style = this.state.highlightStyle
    } else {
      style = {
        height: 0,
        width: '100%',
      }
    }

    return style
  }

  private scrollToActiveStatement = () => {
    if (this.syncToAudio) {
      const activeStatementBounds = this.getActiveStatementBounds()
      const conversationPanelBounds = this.getConversationPanelBounds()
      if (activeStatementBounds && conversationPanelBounds) {
        const position = activeStatementBounds.top - conversationPanelBounds.top
        const duration = this.animate ? 300 : 0
        this.props.windowEvents.requestScrollPosition(
          position,
          duration,
          (cancelled, userScroll) => {
            if (userScroll) {
              this.setSyncToAudio(false)
            } else if (cancelled) {
              this.animate = false
              this.scrollToActiveStatement()
            }
          }
        )
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
