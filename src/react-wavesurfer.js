import React, { Component } from 'react';
import PropTypes from 'prop-types';
import assign from 'deep-assign';
import WaveSurfer from 'wavesurfer.js';

const EVENTS = [
  'audioprocess',
  'error',
  'finish',
  'loading',
  'mouseup',
  'pause',
  'play',
  'ready',
  'scroll',
  'seek',
  'zoom'
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

/**
 * @description Throws an error if the prop is defined and not an integer or not positive
 */
function positiveIntegerProptype(props, propName, componentName) {
  const n = props[propName];
  if (
    n !== undefined &&
    (typeof n !== 'number' || n !== parseInt(n, 10) || n < 0)
  ) {
    return new Error(`Invalid ${propName} supplied to ${componentName},
      expected a positive integer`);
  }

  return null;
}

const resizeThrottler = fn => () => {
  let resizeTimeout;

  if (!resizeTimeout) {
    resizeTimeout = setTimeout(() => {
      resizeTimeout = null;
      fn();
    }, 66);
  }
};

class ReactWavesurfer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isReady: false
    };

    this.wavesurferEl = React.createRef()

    this._loadMediaElt = this._loadMediaElt.bind(this);
    this._loadAudio = this._loadAudio.bind(this);
    this._seekTo = this._seekTo.bind(this);

    if (this.props.responsive) {
      this._handleResize = resizeThrottler(() => {
        // pause playback for resize operation
        if (this.props.playing) {
          this._wavesurfer.pause();
        }

        // resize the waveform
        this._wavesurfer.drawBuffer();

        // We allow resize before file isloaded, since we can get wave data from outside,
        // so there might not be a file loaded when resizing
        if (this.state.isReady) {
          // restore previous position
          this._seekTo(this.props.pos);
        }

        // restore playback
        if (this.props.playing) {
          this._wavesurfer.play();
        }
      });
    }
  }

  componentDidMount() {
    const options = assign({}, this.props.options, {
      container: this.wavesurferEl.current
    });

    // media element loading is only supported by MediaElement backend
    if (this.props.mediaElt) {
      options.backend = 'MediaElement';
    }

    this._wavesurfer = WaveSurfer.create(options);

    // file was loaded, wave was drawn
    this._wavesurfer.on('ready', () => {
      this.setState({
        isReady: true,
        pos: this.props.pos
      });

      // set initial position
      if (this.props.pos) {
        this._seekTo(this.props.pos);
      }

      // set initial volume
      if (this.props.volume) {
        this._wavesurfer.setVolume(this.props.volume);
      }

      // set initial playing state
      if (this.props.playing) {
        this._wavesurfer.play();
      }

      // set initial zoom
      if (this.props.zoom) {
        this._wavesurfer.zoom(this.props.zoom);
      }
    });

    this._wavesurfer.on('audioprocess', pos => {
      this.setState({
        pos
      });
      this.props.onPosChange({
        wavesurfer: this._wavesurfer,
        originalArgs: [pos]
      });
    });

    // `audioprocess` is not fired when seeking, so we have to plug into the
    // `seek` event and calculate the equivalent in seconds (seek event
    // receives a position float 0-1) – See the README.md for explanation why we
    // need this
    this._wavesurfer.on('seek', pos => {
      if (this.state.isReady) {
        const formattedPos = this._posToSec(pos);
        this.setState({
          formattedPos
        });
        this.props.onPosChange({
          wavesurfer: this._wavesurfer,
          originalArgs: [formattedPos]
        });
      }
    });

    // hook up events to callback handlers passed in as props
    EVENTS.forEach(e => {
      const propCallback = this.props[`on${capitaliseFirstLetter(e)}`];
      const wavesurfer = this._wavesurfer;
      if (propCallback) {
        this._wavesurfer.on(e, (...originalArgs) => {
          propCallback({
            wavesurfer,
            originalArgs
          });
        });
      }
    });

    // if audioFile prop, load file
    if (this.props.audioFile) {
      this._loadAudio(this.props.audioFile, this.props.audioPeaks);
    }

    // if mediaElt prop, load media Element
    if (this.props.mediaElt) {
      this._loadMediaElt(this.props.mediaElt, this.props.audioPeaks);
    }

    if (this.props.responsive) {
      window.addEventListener('resize', this._handleResize, false);
    }
  }

  // update wavesurfer rendering manually
  componentDidUpdate(prevProps) {
    let newSource = false;
    let seekToInNewFile;

    // update audioFile
    if (this.props.audioFile !== prevProps.audioFile) {
      this.setState({
        isReady: false
      });
      this._loadAudio(this.props.audioFile, this.props.audioPeaks);
      newSource = true;
    }

    // update mediaElt
    if (this.props.mediaElt !== prevProps.mediaElt) {
      this.setState({
        isReady: false
      });
      this._loadMediaElt(this.props.mediaElt, this.props.audioPeaks);
      newSource = true;
    }

    // update peaks
    if (this.props.audioPeaks !== prevProps.audioPeaks) {
      if (this.props.mediaElt) {
        this._loadMediaElt(this.props.mediaElt, this.props.audioPeaks);
      } else {
        this._loadAudio(this.props.audioFile, this.props.audioPeaks);
      }
    }

    // update position
    if (
      this.props.pos !== undefined &&
      this.state.isReady &&
      prevProps.pos !== this.props.pos &&
      this.props.pos !== this.state.pos
    ) {
      if (newSource) {
        seekToInNewFile = this._wavesurfer.on('ready', () => {
          this._seekTo(this.props.pos);
          seekToInNewFile.un();
        });
      } else {
        this._seekTo(this.props.pos);
      }
    }

    // update playing state
    if (
      !newSource &&
      (this.props.playing !== prevProps.playing ||
        this._wavesurfer.isPlaying() !== this.props.playing)
    ) {
      if (this.props.playing) {
        this._wavesurfer.play();
      } else {
        this._wavesurfer.pause();
      }
    }

    // update volume
    if (this.props.volume !== prevProps.volume) {
      this._wavesurfer.setVolume(this.props.volume);
    }

    // update volume
    if (this.props.zoom !== prevProps.zoom) {
      this._wavesurfer.zoom(this.props.zoom);
    }

    // update audioRate
    if (this.props.options.audioRate !== prevProps.options.audioRate) {
      this._wavesurfer.setPlaybackRate(this.props.options.audioRate);
    }

    // turn responsive on
    if (
      this.props.responsive &&
      this.props.responsive !== prevProps.responsive
    ) {
      window.addEventListener('resize', this._handleResize, false);
    }

    // turn responsive off
    if (
      !this.props.responsive &&
      this.props.responsive !== prevProps.responsive
    ) {
      window.removeEventListener('resize', this._handleResize);
    }
  }

  componentWillUnmount() {
    // remove listeners
    EVENTS.forEach(e => {
      this._wavesurfer.un(e);
    });

    // destroy wavesurfer instance
    this._wavesurfer.destroy();

    if (this.props.responsive) {
      window.removeEventListener('resize', this._handleResize);
    }
  }

  // receives seconds and transforms this to the position as a float 0-1
  _secToPos(sec) {
    return 1 / this._wavesurfer.getDuration() * sec;
  }

  // receives position as a float 0-1 and transforms this to seconds
  _posToSec(pos) {
    return pos * this._wavesurfer.getDuration();
  }

  // pos is in seconds, the 0-1 proportional position we calculate here …
  _seekTo(sec) {
    const pos = this._secToPos(sec);
    if (this.props.options.autoCenter) {
      this._wavesurfer.seekAndCenter(pos);
    } else {
      this._wavesurfer.seekTo(pos);
    }
  }

  // load a media element selector or HTML element
  // if selector, get the HTML element for it
  // and pass to _loadAudio
  _loadMediaElt(selectorOrElt, audioPeaks) {
    if (selectorOrElt instanceof window.HTMLElement) {
      this._loadAudio(selectorOrElt, audioPeaks);
    } else {
      if (!window.document.querySelector(selectorOrElt)) {
        throw new Error('Media Element not found!');
      }

      this._loadAudio(window.document.querySelector(selectorOrElt), audioPeaks);
    }
  }

  // pass audio data to wavesurfer
  _loadAudio(audioFileOrElt, audioPeaks) {
    if (audioFileOrElt instanceof window.HTMLElement) {
      // media element
      this._wavesurfer.loadMediaElement(audioFileOrElt, audioPeaks);
    } else if (typeof audioFileOrElt === 'string') {
      // bog-standard string is handled by load method and ajax call
      this._wavesurfer.load(audioFileOrElt, audioPeaks);
    } else if (
      audioFileOrElt instanceof window.Blob ||
      audioFileOrElt instanceof window.File
    ) {
      // blob or file is loaded with loadBlob method
      this._wavesurfer.loadBlob(audioFileOrElt, audioPeaks);
    } else {
      throw new Error(`Wavesurfer._loadAudio expects prop audioFile
        to be either HTMLElement, string or file/blob`);
    }
  }

  render() {
    const childrenWithProps = (this._wavesurfer && this.props.children)
      ? React.Children.map(this.props.children, child =>
          child
          ? React.cloneElement(child, {
            wavesurfer: this._wavesurfer,
            isReady: this.state.isReady
          })
          : child
        )
      : false;
    return (
      <div {...this.props.containerProps}>
        <div ref={this.wavesurferEl} />
        {childrenWithProps}
      </div>
    );
  }
}

ReactWavesurfer.propTypes = {
  playing: PropTypes.bool,
  pos: PropTypes.number,
  audioFile: (props, propName, componentName) => {
    const prop = props[propName];
    if (
      prop &&
      typeof prop !== 'string' &&
      !(prop instanceof window.Blob) &&
      !(prop instanceof window.File)
    ) {
      return new Error(`Invalid ${propName} supplied to ${componentName}
        expected either string or file/blob`);
    }

    return null;
  },

  mediaElt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(window.HTMLElement)
  ]),
  audioPeaks: PropTypes.array,
  volume: PropTypes.number,
  zoom: PropTypes.number,
  responsive: PropTypes.bool,
  onPosChange: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
  options: PropTypes.shape({
    audioRate: PropTypes.number,
    backend: PropTypes.oneOf(['WebAudio', 'MediaElement']),
    barWidth: (props, propName, componentName) => {
      const prop = props[propName];
      if (prop !== undefined && typeof prop !== 'number') {
        return new Error(`Invalid ${propName} supplied to ${componentName}
          expected either undefined or number`);
      }

      return null;
    },

    cursorColor: PropTypes.string,
    cursorWidth: positiveIntegerProptype,
    dragSelection: PropTypes.bool,
    fillParent: PropTypes.bool,
    height: positiveIntegerProptype,
    hideScrollbar: PropTypes.bool,
    interact: PropTypes.bool,
    loopSelection: PropTypes.bool,
    mediaControls: PropTypes.bool,
    minPxPerSec: positiveIntegerProptype,
    normalize: PropTypes.bool,
    pixelRatio: PropTypes.number,
    progressColor: PropTypes.string,
    scrollParent: PropTypes.bool,
    skipLength: PropTypes.number,
    waveColor: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(window.CanvasGradient)
    ]),
    autoCenter: PropTypes.bool,
    containerProps: PropTypes.object,
  })
};

ReactWavesurfer.defaultProps = {
  playing: false,
  pos: 0,
  options: WaveSurfer.defaultParams,
  responsive: true,
  onPosChange: () => {},
  containerProps: {},
};

export default ReactWavesurfer;
