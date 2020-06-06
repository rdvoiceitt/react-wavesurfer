import { Component } from 'react';
import PropTypes from 'prop-types';
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';

const REGIONS_EVENTS = [
  'region-in',
  'region-out',
  'region-mouseenter',
  'region-mouseleave',
  'region-click',
  'region-dblclick',
  'region-updated',
  'region-update-end',
  'region-removed',
  'region-play'
];

const REGION_EVENTS = [
  'in',
  'out',
  'remove',
  'update',
  'click',
  'dbclick',
  'over',
  'leave'
];

/**
 * @description Capitalise the first letter of a string
 */
function capitaliseFirstLetter(string) {
  return string
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

class Regions extends Component {
  constructor(props) {
    super(props);

    // this is so that jscs does not force us to go functional
    this.state = {};
  }

  componentDidMount() {
    if (this.props.isReady) {
      this._init();
    } else {
      this.props.wavesurfer.on('ready', this._init);
    }
  }

  componentDidUpdate() {
    // only update if the wavesurfer instance has been ready
    if (!this.props.isReady) {
      return;
    }

    // cache reference to old regions
    let oldRegions = {...prevProps.wavesurfer.regions.list};
    let newRegionId;
    let oldRegionId;

    for (newRegionId in this.props.regions) {
      const newRegion = this.props.regions[newRegionId];
      if (!newRegion) continue

      // remove from oldRegions
      delete oldRegions[newRegionId];

      // new regions
      if (!this.props.wavesurfer.regions.list[newRegionId]) {
        this._hookUpRegionEvents(this.props.wavesurfer.addRegion(newRegion));

        // update regions
      } else if (
        oldRegions[newRegionId] &&
        (oldRegions[newRegionId].start !== newRegion.start ||
          oldRegions[newRegionId].end !== newRegion.end)
      ) {
        this.props.wavesurfer.regions.list[newRegionId].update({
          start: newRegion.start,
          end: newRegion.end
        });
      }
    }

    // remove any old regions
    for (oldRegionId in oldRegions) {
      this.props.wavesurfer.regions.list[oldRegionId].remove();
    }
  }

  shouldComponentUpdate() {

    // only update if there are regions
    if (this.props.wavesurfer.regions === undefined) {
      return false;
    }

    // only update if the wavesurfer instance has been ready
    if (!this.props.isReady) {
      return false;
    }
    return true;
}

  componentWillUnmount() {
    REGION_EVENTS.forEach(e => {
      this.props.wavesurfer.un(e);
    });
  }

  _init = () => {
    const { wavesurfer, regions } = this.props;

    wavesurfer.addPlugin(RegionsPlugin.create({})).initPlugin('regions')

    let newRegionId;

    REGIONS_EVENTS.forEach(e => {
      const propCallback = this.props[`on${capitaliseFirstLetter(e)}`];
      if (!propCallback) return;

      wavesurfer.on(e, (...originalArgs) => {
        propCallback({
          wavesurfer,
          originalArgs
        });
      });
    });

    // add regions and hook up callbacks to region objects
    for (newRegionId in regions) {
      if (regions[newRegionId]) {
        this._hookUpRegionEvents(wavesurfer.addRegion(regions[newRegionId]));
      }
    }
  }

  _hookUpRegionEvents(region) {
    REGION_EVENTS.forEach(e => {
      const propCallback = this.props[
        `onSingleRegion${capitaliseFirstLetter(e)}`
      ];
      const { wavesurfer } = this.props;
      if (propCallback) {
        region.on(e, (...originalArgs) => {
          propCallback({
            wavesurfer,
            originalArgs,
            region
          });
        });
      }
    });

    region.on('remove', () => {
      REGION_EVENTS.forEach(e => {
        region.un(e);
      });
    });
  }

  render() {
    return false;
  }
}

Regions.propTypes = {
  isReady: PropTypes.bool,
  regions: PropTypes.object,
  wavesurfer: PropTypes.object
};

Regions.defaultProps = {
  regions: {}
};

export default Regions;
