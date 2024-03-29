import { IStatement } from '@boombox/shared'
import Statement from 'components/statement/Statement'
import { WindowContext } from 'components/WindowContext'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { timeAfterStatement, timeBeforeStatement, timeDuringStatement } from 'utilities/statement'
import './ConversationPanel.css'

const ELEMENT_NODE = 1

interface IConversationPanelProps {
  animationDuration: number
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
  private nextStatement: IStatement | undefined

  private updateHighlight = false
  private delayRenders = false
  private renderRequested = false

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
          onScrollComplete={this.onScrollComplete}
          onUserScroll={this.onUserScroll}
          scrollDuration={this.state.animate ? this.props.animationDuration : 0}
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

  public shouldComponentUpdate() {
    if (this.delayRenders) {
      this.renderRequested = true
    }
    return !this.delayRenders
  }

  public componentDidUpdate(
    prevProps: IConversationPanelProps,
    prevState: IConversationPanelState
  ) {
    if (!this.state.animate) {
      this.setState({
        animate: true,
      })
    }

    if (this.updateHighlight) {
      this.updateActiveStatementHightlight()
    }

    if (this.state.activeStatementTop !== prevState.activeStatementTop) {
      this.delayRenders = true
      setTimeout(() => {
        this.delayRenders = false
        if (this.renderRequested) {
          this.renderRequested = false
          this.forceUpdate()
        }
      }, this.props.animationDuration + 100)
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

  private onScrollComplete = (completed: boolean, userCancelled: boolean) => {
    if (!completed && !userCancelled) {
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
          transitionDuration: animate ? `${this.props.animationDuration}ms` : '0',
          width,
        },
      })
    }
  }

  private updateStatementsIfNecessary = () => {
    const { audioTime, statements } = this.props
    let findNewActiveStatement = false

    if (this.activeStatement) {
      findNewActiveStatement = !timeDuringStatement(audioTime, this.activeStatement)

      if (findNewActiveStatement && this.nextStatement) {
        const afterCurrent = timeAfterStatement(audioTime, this.activeStatement)
        const beforeNext = timeBeforeStatement(audioTime, this.nextStatement)
        findNewActiveStatement = !(afterCurrent && beforeNext)
      }
    } else {
      findNewActiveStatement = true
    }

    if (findNewActiveStatement) {
      this.pastStatements = []
      this.futureStatements = []
      this.activeStatement = undefined
      let lastPastStatement: IStatement | undefined
      let firstFutureStatement: IStatement | undefined
      statements.forEach(statement => {
        if (timeBeforeStatement(audioTime, statement)) {
          if (!firstFutureStatement) {
            firstFutureStatement = statement
          }
          this.futureStatements.push(
            <Statement
              isActive={false}
              isPast={false}
              key={statement.startTime}
              onClick={this.props.onStatementClick}
              statement={statement}
            />
          )
        } else if (timeAfterStatement(audioTime, statement)) {
          lastPastStatement = statement
          this.pastStatements.push(
            <Statement
              isActive={false}
              isPast={true}
              key={statement.startTime}
              onClick={this.props.onStatementClick}
              statement={statement}
            />
          )
        } else if (timeDuringStatement(audioTime, statement)) {
          this.activeStatement = statement
        }
      })

      if (!this.activeStatement && lastPastStatement) {
        this.activeStatement = lastPastStatement
        this.pastStatements.pop()
      }

      if (firstFutureStatement) {
        this.nextStatement = firstFutureStatement
      }

      if (this.activeStatement) {
        this.updateHighlight = true
      }
    }
  }
}

export default ConversationPanel
