import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';


class Timeline extends Component {
  timelineRef = React.createRef()

  componentDidMount() {
    if (this.props.isReady) {
      this._init();
    } else {
      this.props.wavesurfer.on('ready', this._init);
    }
  }

  _init = () => {
    this.props.wavesurfer.addPlugin(TimelinePlugin.create({
      container: this.timelineRef.current,
      ...this.props.options
    })).initPlugin('timeline')
  }

  render() {
    return (
      <div ref={this.timelineRef}/>
    );
  }
}

Timeline.propTypes = {
  isReady: PropTypes.bool.isRequired,
  options: PropTypes.object.isRequired,
  wavesurfer: PropTypes.object
};

Timeline.defaultProps = {
  isReady: false,
  options: {}
};

export default Timeline;
