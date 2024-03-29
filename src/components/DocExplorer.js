/**
 *  Copyright (c) Facebook, Inc. and its affiliates.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { GraphQLSchema, isType } from 'graphql';

import FieldDoc from './DocExplorer/FieldDoc';
import SchemaDoc from './DocExplorer/SchemaDoc';
import SearchBox from './DocExplorer/SearchBox';
import SearchResults from './DocExplorer/SearchResults';
import TypeDoc from './DocExplorer/TypeDoc';

const initialNav = {
  name: 'Schema',
  title: 'Hide schema',
};

/**
 * DocExplorer
 *
 * Shows documentations for GraphQL definitions from the schema.
 *
 * Props:
 *
 *   - schema: A required GraphQLSchema instance that provides GraphQL document
 *     definitions.
 *
 * Children:
 *
 *   - Any provided children will be positioned in the right-hand-side of the
 *     top bar. Typically this will be a "close" button for temporary explorer.
 *
 */
export class DocExplorer extends React.Component {
  static propTypes = {
    schema: PropTypes.instanceOf(GraphQLSchema),
    defaultTypeOrField: PropTypes.string,
  };

  constructor(props) {
    super(props);

    this.state = { navStack: this.createFreshNavStack(props) };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.schema !== nextProps.schema) {
      if (nextProps.schema) {
        this.setState({
          navStack: this.createFreshNavStack(nextProps),
        });
      }
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.props.schema !== nextProps.schema ||
      this.state.navStack !== nextState.navStack
    );
  }

  render() {
    const schema = this.props.schema;
    const navStack = this.state.navStack;
    const navItem = navStack[navStack.length - 1];

    let content;
    if (schema === undefined) {
      // Schema is undefined when it is being loaded via introspection.
      content = (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      );
    } else if (!schema) {
      // Schema is null when it explicitly does not exist, typically due to
      // an error during introspection.
      content = <div className="error-container">{'No Schema Available'}</div>;
    } else if (navItem.search) {
      content = (
        <SearchResults
          searchValue={navItem.search}
          withinType={navItem.def}
          schema={schema}
          onClickType={this.handleClickTypeOrField}
          onClickField={this.handleClickTypeOrField}
        />
      );
    } else if (navStack.length === 1) {
      content = (
        <SchemaDoc schema={schema} onClickType={this.handleClickTypeOrField} />
      );
    } else if (isType(navItem.def)) {
      content = (
        <TypeDoc
          schema={schema}
          type={navItem.def}
          onClickType={this.handleClickTypeOrField}
          onClickField={this.handleClickTypeOrField}
        />
      );
    } else {
      content = (
        <FieldDoc
          field={navItem.def}
          onClickType={this.handleClickTypeOrField}
        />
      );
    }

    const shouldSearchBoxAppear =
      navStack.length === 1 || (isType(navItem.def) && navItem.def.getFields);

    let prevName;
    if (navStack.length > 1) {
      prevName = navStack[navStack.length - 2].name;
    }

    return (
      <div className="doc-explorer" key={navItem.name}>
        <div className="doc-explorer-title-bar">
          {prevName && (
            <div
              className="doc-explorer-back"
              onClick={this.handleNavBackClick}>
              {prevName}
            </div>
          )}
          <div className="doc-explorer-title">
            {navItem.title || navItem.name}
          </div>
          <div className="doc-explorer-rhs">{this.props.children}</div>
        </div>
        <div className="doc-explorer-contents">
          {shouldSearchBoxAppear && (
            <SearchBox
              value={navItem.search}
              placeholder={`Search...`}
              onSearch={this.handleSearch}
            />
          )}
          {content}
        </div>
      </div>
    );
  }

  createFreshNavStack(props) {
    const navStack = [initialNav];

    if (props.defaultTypeOrField && props.schema !== undefined) {
      const typeOrField = props.schema.getType(props.defaultTypeOrField);
      if (typeOrField) {
        navStack.push({
          name: typeOrField.name,
          def: typeOrField,
        });
      }
    }

    return navStack;
  }

  // Public API
  showDoc(typeOrField) {
    const navStack = this.state.navStack;
    const topNav = navStack[navStack.length - 1];
    if (topNav.def !== typeOrField) {
      this.setState({
        navStack: navStack.concat([
          {
            name: typeOrField.name,
            def: typeOrField,
          },
        ]),
      });
    }
  }

  // Public API
  showDocForReference(reference) {
    if (reference.kind === 'Type') {
      this.showDoc(reference.type);
    } else if (reference.kind === 'Field') {
      this.showDoc(reference.field);
    } else if (reference.kind === 'Argument' && reference.field) {
      this.showDoc(reference.field);
    } else if (reference.kind === 'EnumValue' && reference.type) {
      this.showDoc(reference.type);
    }
  }

  // Public API
  showSearch(search) {
    const navStack = this.state.navStack.slice();
    const topNav = navStack[navStack.length - 1];
    navStack[navStack.length - 1] = { ...topNav, search };
    this.setState({ navStack });
  }

  reset() {
    this.setState({ navStack: [initialNav] });
  }

  handleNavBackClick = () => {
    if (this.state.navStack.length > 1) {
      this.setState({ navStack: this.state.navStack.slice(0, -1) });
    }
  };

  handleClickTypeOrField = typeOrField => {
    this.showDoc(typeOrField);
  };

  handleSearch = value => {
    this.showSearch(value);
  };
}
