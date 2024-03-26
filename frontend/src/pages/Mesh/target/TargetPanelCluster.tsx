import * as React from 'react';
import { Node, NodeModel } from '@patternfly/react-topology';
import { kialiStyle } from 'styles/StyleUtils';
import { PFColors } from 'components/Pf/PfColors';
import { PFBadge, PFBadges } from 'components/Pf/PfBadges';
import { getKialiTheme } from 'utils/ThemeUtils';
import {
  TargetPanelCommonProps,
  shouldRefreshData,
  targetPanel,
  targetPanelBody,
  targetPanelBorder,
  targetPanelHeading,
  targetPanelWidth
} from './TargetPanelCommon';
import { kialiIconDark, kialiIconLight } from 'config';
import { KialiInstance, MeshAttr } from 'types/Mesh';
import { Theme } from 'types/Common';
import { PromisesRegistry } from 'utils/CancelablePromises';
import * as API from '../../../services/Api';
import * as FilterHelper from '../../../components/FilterList/FilterHelper';
import { ApiError } from 'types/Api';
import { KialiIcon } from 'config/KialiIcon';
import { Tooltip } from '@patternfly/react-core';
import { classes } from 'typestyle';
import { UNKNOWN } from 'types/Graph';

type TargetPanelClusterState = {
  clusterNode?: Node<NodeModel, any>;
  loading: boolean;
};

const defaultState: TargetPanelClusterState = {
  clusterNode: undefined,
  loading: false
};

const kialiIconStyle = kialiStyle({
  width: '1rem',
  marginRight: '0.25rem'
});

export class TargetPanelCluster extends React.Component<TargetPanelCommonProps, TargetPanelClusterState> {
  static readonly panelStyle = {
    backgroundColor: PFColors.BackgroundColor100,
    height: '100%',
    margin: 0,
    minWidth: targetPanelWidth,
    overflowY: 'auto' as 'auto',
    width: targetPanelWidth
  };

  private promises = new PromisesRegistry();

  constructor(props: TargetPanelCommonProps) {
    super(props);

    const clusterNode = this.props.target.elem as Node<NodeModel, any>;
    this.state = { ...defaultState, clusterNode: clusterNode };
  }

  static getDerivedStateFromProps(
    props: TargetPanelCommonProps,
    state: TargetPanelClusterState
  ): TargetPanelClusterState | null {
    // if the target (i.e. clusterBox) has changed, then init the state
    return props.target.elem !== state.clusterNode
      ? ({ clusterNode: props.target.elem, loading: true } as TargetPanelClusterState)
      : null;
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps: TargetPanelCommonProps) {
    if (shouldRefreshData(prevProps, this.props)) {
      this.load();
    }
  }

  componentWillUnmount() {
    this.promises.cancelAll();
  }

  render() {
    if (this.state.loading || !this.state.clusterNode) {
      return null;
    }

    const clusterData = this.state.clusterNode.getData()[MeshAttr.infraData] || {
      accessible: false,
      isKialiHome: false,
      name: UNKNOWN
    };

    return (
      <div id="target-panel-cluster" className={classes(targetPanelBorder, targetPanel)}>
        <div id="target-panel-cluster-heading" className={targetPanelHeading}>
          {clusterData.isKialiHome && (
            <Tooltip content="Kiali home cluster">
              <KialiIcon.Star />
            </Tooltip>
          )}
          <PFBadge badge={PFBadges.Cluster} size="sm" style={{ marginLeft: '0.225rem', marginBottom: '0.125rem' }} />
          {clusterData.name}
        </div>
        <div className={targetPanelBody}>
          {clusterData.accessible && this.renderKialiLinks(clusterData.kialiInstances)}
          {`Network: `}
          {clusterData.network ? clusterData.network : 'n/a'}
          <br />
          {`API Endpoint: `}
          {clusterData.apiEndpoint ? clusterData.apiEndpoint : 'n/a'}
          <br />
          {`Secret Name: `}
          {clusterData.secretName ? clusterData.secretName : 'n/a'}
        </div>
      </div>
    );
  }

  private load = (): void => {
    this.promises.cancelAll();

    // TODO: Do we have anything to load for the cluster side panel?
    Promise.resolve()
      .then(_result => {
        this.setState({ loading: false });
      })
      .catch(err => {
        if (err.isCanceled) {
          console.debug('TargetPanelCluster: Ignore fetch error (canceled).');
          return;
        }

        this.setState({ ...defaultState, loading: false });
        this.handleApiError('Could not fetch cluster when loading target panel', err);
      });

    this.setState({ loading: true });
  };

  private handleApiError(message: string, error: ApiError): void {
    FilterHelper.handleError(`${message}: ${API.getErrorString(error)}`);
  }

  private renderKialiLinks = (kialiInstances: KialiInstance[]): React.ReactNode => {
    const kialiIcon = getKialiTheme() === Theme.DARK ? kialiIconDark : kialiIconLight;
    return kialiInstances.map(instance => {
      if (instance.url.length !== 0) {
        return (
          <span>
            <img alt="Kiali Icon" src={kialiIcon} className={kialiIconStyle} />
            <a href={instance.url} target="_blank" rel="noopener noreferrer">
              {instance.namespace} {' / '} {instance.serviceName}
            </a>
            <br />
          </span>
        );
      } else {
        return (
          <span>
            <img alt="Kiali Icon" src={kialiIcon} className={kialiIconStyle} />
            {`${instance.namespace} / ${instance.serviceName}`}
            <br />
          </span>
        );
      }
    });
  };
}
