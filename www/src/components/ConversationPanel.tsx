import { IStatement } from '@boombox/shared/src/types/models/transcript'
import Statement from 'components/Statement'
import { WindowContext } from 'components/WindowEvents'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import './ConversationPanel.css'

const SCROLL_DURATION = 300
const ELEMENT_NODE = 1

interface IConversationPanelProps {
  audioTime: number
  onEnableSyncToAudio: () => void
  onDisableSyncToAudio: () => void
  onStatementClick: (statement: IStatement) => void
  statements: IStatement[]
}

interface IConversationPanelState {
  activeStatementTopPosition?: number
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

const isElementNode = (node?: Element | Text | null): node is Element => {
  return node !== undefined && node !== null && node.nodeType === ELEMENT_NODE
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public readonly state: IConversationPanelState = initialState
  private conversationPanelRef = React.createRef<HTMLDivElement>()
  private pastStatements: JSX.Element[] = []
  private futureStatements: JSX.Element[] = []
  private activeStatement: IStatement | undefined
  private updateHighlight = false
  private syncToAudio = true

  public render() {
    this.updateStatementsIfNecessary()

    let activeStatement: React.ReactNode | undefined
    if (this.activeStatement) {
      activeStatement = (
        <Statement
          audioTime={this.props.audioTime}
          isActive={true}
          isPast={false}
          key={this.activeStatement.startTime}
          onClick={this.props.onStatementClick}
          ref={this.activeStatement.startTime.toString()}
          statement={this.activeStatement}
        />
      )
    }

    let scrollPosition: number | undefined
    if (this.state.syncToAudio) {
      if (this.activeStatement && this.state.activeStatementTopPosition !== undefined) {
        scrollPosition = this.state.activeStatementTopPosition
      } else if (this.state.syncToAudio && this.props.audioTime === 0) {
        scrollPosition = 0
      }
    }

    console.log(this.state.highlightStyle)
    return (
      <WindowContext
        onResize={this.onResize}
        onUserScroll={this.onUserScroll}
        onScrollCancelled={this.onScrollCancelled}
        scrollPosition={scrollPosition}
        scrollDuration={this.state.animate ? SCROLL_DURATION : 0}
      >
        {() => {
          return (
            <div className="ConversationPanel" ref={this.conversationPanelRef}>
              <div
                className="ConversationPanel__statement-hightlight"
                style={this.state.highlightStyle}
              />
              <div className="ConversationPanel__statement-list">
                {[...this.pastStatements, activeStatement, ...this.futureStatements]}
              </div>
            </div>
          )
        }}
      </WindowContext>
    )
  }

  public componentDidUpdate() {
    if (this.updateHighlight) {
      this.updateActiveStatementHightlight()
    }
  }

  private getActiveStatementBounds = (): ClientRect | void => {
    if (this.activeStatement) {
      const activeRef = this.refs[this.activeStatement.startTime.toString()]
      const activeStatementElement = ReactDOM.findDOMNode(activeRef)
      if (isElementNode(activeStatementElement)) {
        return activeStatementElement.getBoundingClientRect()
      }
    }
  }

  private getConversationPanelBounds = (): ClientRect | void => {
    if (this.conversationPanelRef.current) {
      return this.conversationPanelRef.current.getBoundingClientRect()
    }
  }

  private onResize = () => {
    this.updateActiveStatementHightlight(false)
  }

  private onUserScroll = () => {
    console.log('user scroll')
    this.setSyncToAudio(false)
  }

  private onScrollCancelled = (userCancelled: boolean) => {
    if (userCancelled) {
      console.log('user scroll')
      this.setSyncToAudio(false)
    } else {
      this.updateActiveStatementHightlight(false)
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

  private updateActiveStatementHightlight = (animate = true) => {
    this.updateHighlight = false
    const activeStatement = this.getActiveStatementBounds()
    const conversationPanel = this.getConversationPanelBounds()
    if (activeStatement && conversationPanel) {
      const activeStatementTopPosition = activeStatement.top - conversationPanel.top
      const top = activeStatementTopPosition + activeStatement.height / 2
      const height = activeStatement.height
      const width = activeStatement.width
      this.setState({
        activeStatementTopPosition,
        animate,
        highlightStyle: {
          height: 1,
          transform: `translateY(${top}px) scaleY(${height})`,
          transitionDuration: `${SCROLL_DURATION}ms`,
          transitionProperty: animate ? 'transform' : 'none',
          width,
        },
      })
    }
  }

  private updateStatementsIfNecessary = () => {
    const { audioTime, statements } = this.props
    let findNewActiveStatement = false

    if (this.activeStatement) {
      findNewActiveStatement = !Statement.duringTime(this.activeStatement, audioTime)
    } else {
      findNewActiveStatement = true
    }

    if (findNewActiveStatement) {
      this.pastStatements = []
      this.futureStatements = []
      this.activeStatement = undefined
      statements.forEach(statement => {
        if (Statement.afterTime(statement, audioTime)) {
          this.futureStatements.push(
            <Statement
              isActive={false}
              isPast={false}
              key={statement.startTime}
              onClick={this.props.onStatementClick}
              statement={statement}
            />
          )
        } else if (Statement.beforeTime(statement, audioTime)) {
          this.pastStatements.push(
            <Statement
              isActive={false}
              isPast={true}
              key={statement.startTime}
              onClick={this.props.onStatementClick}
              statement={statement}
            />
          )
        } else if (Statement.duringTime(statement, audioTime)) {
          this.activeStatement = statement
        } else {
          console.error('Statement could not be placed: ', statement)
        }
      })

      if (this.activeStatement) {
        this.updateHighlight = true
      }
    }
  }
}

export default ConversationPanel
