import { Component } from 'react';
import PropTypes from 'prop-types';
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';


class Minimap extends Component {
  componentDidMount() {
    if (this.props.isReady) {
      this._init();
    } else {
      this.props.wavesurfer.on('ready', this._init);
    }
  }

  _init() {
    this.props.wavesurfer.addPlugin(MinimapPlugin.create(this.props.options)).initPlugin('minimap')
  }

  render() {
    return false;
  }
}

Minimap.propTypes = {
  isReady: PropTypes.bool.isRequired,
  options: PropTypes.object.isRequired,
  wavesurfer: PropTypes.object
};

Minimap.defaultProps = {
  isReady: false,
  options: {}
};

export default Minimap;
