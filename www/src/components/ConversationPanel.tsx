import Statement from 'components/Statement';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getStatements } from 'store/actions/statements';
import { IStatementsStore } from 'store/reducers/statements';

interface IConversationPanelProps extends IStatementsStore {
  dispatch: Dispatch;
}

class ConversationPanel extends React.Component<IConversationPanelProps> {
  public render() {
    return (
      <div className="ConversationPanel">
        {this.props.statements.map((statement, index) => (
          // HACK(ndrwhr): We should use startTime as the key but since we don't have the response
          // types in www yet I can't get typescript to not freak out.
          <Statement key={index} {...statement} />
        ))}
      </div>
    );
  }

  public componentDidMount() {
    this.props.dispatch(getStatements());
  }
}

function mapStateToProps({ statements }: { statements: IStatementsStore }) {
  return statements;
}

export default connect(mapStateToProps)(ConversationPanel);
