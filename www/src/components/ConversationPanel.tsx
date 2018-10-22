import { IStatement } from '@boombox/shared/src/types/models/transcript'
import Statement from 'components/Statement'
import { WindowContext } from 'components/WindowContext'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import './ConversationPanel.css'

const SCROLL_DURATION = 400
const ELEMENT_NODE = 1

interface IConversationPanelProps {
  audioTime: number
  onStatementClick: (statement: IStatement) => void
  onUserScroll: () => void
  statements: IStatement[]
  syncToAudio: boolean
}

interface IConversationPanelState {
  activeStatementTop?: number
  animate: boolean
  highlightStyle: React.CSSProperties
}

const initialState: IConversationPanelState = {
  animate: true,
  highlightStyle: {
    height: 0,
    width: '100%',
  },
}

const isElementNode = (node?: Element | Text | null): node is Element => {
  return node !== undefined && node !== null && node.nodeType === ELEMENT_NODE
}

class ConversationPanel extends React.Component<IConversationPanelProps, IConversationPanelState> {
  public readonly state: IConversationPanelState = initialState

  private conversationPanelRef = React.createRef<HTMLDivElement>()
  private activeStatementRef = React.createRef<Statement>()

  private pastStatements: JSX.Element[] = []
  private futureStatements: JSX.Element[] = []
  private activeStatement: IStatement | undefined

  private updateHighlight = false

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
          ref={this.activeStatementRef}
          statement={this.activeStatement}
        />
      )
    }

    let scrollPosition: number | undefined
    if (this.props.syncToAudio) {
      if (this.activeStatement && this.state.activeStatementTop !== undefined) {
        scrollPosition = this.state.activeStatementTop
      } else if (this.props.syncToAudio && this.props.audioTime === 0) {
        scrollPosition = 0
      }
    }

    return (
      <div className="ConversationPanel" ref={this.conversationPanelRef}>
        <WindowContext
          onResize={this.onResize}
          onScrollCancelled={this.onScrollCancelled}
          onUserScroll={this.onUserScroll}
          scrollDuration={this.state.animate ? SCROLL_DURATION : 0}
          scrollPosition={scrollPosition}
        />
        <div
          className="ConversationPanel__statement-hightlight"
          style={this.state.highlightStyle}
        />
        <div className="ConversationPanel__statement-list">
          {[...this.pastStatements, activeStatement, ...this.futureStatements]}
        </div>
      </div>
    )
  }

  public componentDidUpdate() {
    if (!this.state.animate) {
      this.setState({
        animate: true,
      })
    }
    if (this.updateHighlight) {
      this.updateActiveStatementHightlight()
    }
  }

  private getActiveStatementBounds = (): ClientRect | void => {
    if (this.activeStatementRef.current) {
      const element = ReactDOM.findDOMNode(this.activeStatementRef.current)
      if (isElementNode(element)) {
        return element.getBoundingClientRect()
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
    this.props.onUserScroll()
  }

  private onScrollCancelled = (userCancelled: boolean) => {
    if (!userCancelled) {
      this.updateActiveStatementHightlight(false)
    }
  }

  private updateActiveStatementHightlight = (animate = true) => {
    this.updateHighlight = false
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
          transitionDuration: animate ? `${SCROLL_DURATION}ms` : '0',
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
