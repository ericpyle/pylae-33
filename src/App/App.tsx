import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css'
import StickyNavbar from './StickyNavbar';

const isSupportedInBrowser = navigator.mediaDevices &&
  "getDisplayMedia" in navigator.mediaDevices


const MAX_DURATION = 33000
const RECORDING_INTERVAL = 3000
const MAX_RECORDERS = MAX_DURATION / RECORDING_INTERVAL
// console.log({MAX_RECORDERS, RECORDING_INTERVAL})

/*
 * From https://stackoverflow.com/a/53360402 and https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();
  const savedIntervalId = useRef<number>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current!();
    }
    console.log('useInterval useEffect delay: ' + delay)
    console.log('savedIntervalId: ' + savedIntervalId.current);
    if (savedIntervalId.current !== undefined) {
      console.log('clearInterval: ' + savedIntervalId.current);
      clearInterval(savedIntervalId.current)
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      savedIntervalId.current = id
      console.log(`setInterval ${id} ${delay}`)
      return () => clearInterval(id);
    }
  }, [delay]);
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'stopped' | 'record-pressed' | 'recording' | 'paused' | 'saving'>('stopped');
  const mediaRecordersRef = useRef<MediaRecorder[]>([]);
  const mediaStreamRef = useRef<MediaStream>();
  const [countDown, setCountDown] = useState(3);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string>()

  console.log({ mode, countDown })

  const addToMediaRecorders = () => {
    const newMediaRecorder = new MediaRecorder(mediaStreamRef.current!, {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 1000000,
    });
    const timestamp = Date.now().toString();
    console.log({ mediaRecorders: mediaRecordersRef.current.length }, timestamp);
    newMediaRecorder.start();
    console.log('started');
    // if ('memory' in window.performance)
    // console.log({memory: window.performance.memory})
    if (mediaRecordersRef.current.length === MAX_RECORDERS) {
      stopRecorders(mediaRecordersRef.current.slice(0, 1)); // stop the first one
    }
    mediaRecordersRef.current = [...mediaRecordersRef.current.slice(-(MAX_RECORDERS - 1)), newMediaRecorder];
    console.log({ states: mediaRecordersRef.current.map(mr => mr.state) });
  }

  useInterval(() => {
    console.log({ countDown, timestamp: Date.now().toString() })
    if (countDown === 3) {
      addToMediaRecorders();
      console.log('pausing for countdown: ' + Date.now().toString());
      mediaRecordersRef.current[0].pause();
    }
    setCountDown(countDown - 1);
  }, (mode === 'recording' && countDown > 0) ? 1000 : null);

  useInterval(() => {
    if (mediaRecordersRef.current[0].state === 'paused') {
      console.log('resuming: ' + Date.now().toString());
      mediaRecordersRef.current[0].resume();
      return;
    }
    console.log('adding to mediarecorders: ' + Date.now().toString());
    addToMediaRecorders();

  }, (mode === 'recording' && countDown == 0) ? RECORDING_INTERVAL : null);

  const handleKeyShortcut = (event: KeyboardEvent) => {
    // console.log(JSON.stringify(event.key));
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (mode === 'stopped') {
        handleStartRecording();
        return;
      }
      if (mode === 'recording') {
        handlePauseRecording();
        return;
      }
      if (mode === 'paused') {
        handleResumeRecording();
        return;
      }
    }
    if (mode === 'paused' && event.ctrlKey && event.key === 's') {
      event.preventDefault();
      handleSaveRecording();
      return;
    }

  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyShortcut);
    return () => {
      document.removeEventListener('keydown', handleKeyShortcut);
    };
  }, [handleKeyShortcut]);


  const handleStartRecording = async () => {
    try {
      setMode('record-pressed');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          /* displaySurface seems to block keyboard */
          /* displaySurface: "monitor", */
          /* low frameRate seems to lose cursor but is less GPU intensive */
          frameRate: 11,
        },
        audio: false,
      });
      // handle if the user stops sharing screen
      // see https://stackoverflow.com/a/25179198
      stream.getVideoTracks()[0].onended = function () {
        mediaRecordersRef.current = [];
        setMode('stopped');
      };
      mediaStreamRef.current = stream;
      setCountDown(3);
      setMode('recording');
    } catch (error) {
      console.error('Error starting screen recording: ', error);
      setMode('stopped');
    }
  };

  const handlePauseRecording = () => {
    mediaRecordersRef.current.forEach((mediaRecorder) => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
      }
    });
    setMode('paused');
  };

  const handleResumeRecording = () => {
    mediaRecordersRef.current.forEach((mediaRecorder) => {
      if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
      }
    });
    setMode('recording');
  };

  const handleSaveRecording = () => {
    setMode('saving');
    // Stop recording the media recorder with the most seconds
    console.log({ statesInSave: mediaRecordersRef.current.map(mr => mr.state) })
    const longestMediaRecorder = mediaRecordersRef.current[0];
    const recordedChunks: Blob[] = [];
    longestMediaRecorder.ondataavailable = (event) => {
      recordedChunks.push(event.data)
    }
    longestMediaRecorder.onstop = () => {
      // Generate the filename
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${padZeros(now.getMonth() + 1, 2)}-${padZeros(now.getDate(), 2)} ${padZeros(now.getHours(), 2)}-${padZeros(now.getMinutes(), 2)}${padZeros(now.getSeconds(), 2)}`;
      const duration = mediaRecordersRef.current.length * RECORDING_INTERVAL / 1000
      const filename = `pylae-33-${timestamp}_${duration}s.mp4`;

      // Save the recording
      const blob = new Blob(recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setSavedVideoUrl(url);

      // Reset the app
      stopRecorders(mediaRecordersRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      mediaRecordersRef.current = [];
      setMode('stopped');
    }
    longestMediaRecorder.stop();
  };

  if (!isSupportedInBrowser) {
    return <div className="app">
      {!isSupportedInBrowser && <div className="warn-unsupported">Sorry, sceen capture is not supported in your browser</div>}
    </div>
  }

  const videoUrl = savedVideoUrl ?? 'https://user-images.githubusercontent.com/1125565/233755686-a0ebc300-1bd1-4584-afe0-3b02150d39d8.mp4' 
  return (<>
    <div className="app">
      {(mode === 'stopped' || mode === 'record-pressed') && (
        <div>
          <div className="controls sticky-nav" title="(Space/Enter)">
            <button type="button" className="btn btn-record" onClick={handleStartRecording}>
              <i className={`fas fa-circle ${mode === 'record-pressed' && 'fa-inverse'}`} /> Record
            </button>
            <div className="video-container">
              <video src={videoUrl} muted controls style={{ maxHeight: "640px", minHeight: "200px" }} data-video="0" />
            </div>
          </div>
        </div>
      )}
      {(mode !== 'stopped') && mode !== 'record-pressed' && <div>
        <h3>Alternative instructions:</h3>
        <h4>Using recording software to try and catch random crashes.</h4>
        Suggested steps:
        <ol>
          <li>Install OBS from <a href="https://obsproject.com/download" target="_blank">https://obsproject.com/download</a></li>
          <li>Run the installer and choose to optimize for virtual camera.</li>
          <li>Add the display where [our product] will be used to the Sources panel</li>
          <li>Go to Settings -&gt; Output and choose .mp4 format and then select the 'Enable Replay Buffer' under Recording</li>
          <li>Set the Maximum Replay Time to 120 seconds.</li>
          <li>Click 'Start Replay Buffer' and use [our product]</li>
          <li>When it crashes click on the Save Replay button (looks like a download icon)</li>
          <li>Send support that file</li>
        </ol>
      </div>}
      {(mode === 'recording' && countDown > 0) && (
        <div className="controls sticky-nav" title="(Space/Enter)">
          <button className="btn btn-pause" onClick={() => console.log('Recording countdown')}>
            <i className="fas fa-circle fa-inverse" /> Recording in {countDown.toString().padStart(countDown)} second{countDown > 1 && 's'}
          </button>
        </div>
      )}
      {(mode === 'recording' && countDown <= 0) && (
        <div className="controls sticky-nav" title="(Space/Enter)">
          <button className="btn btn-pause" onClick={handlePauseRecording}>
            <i className="fas fa-pause-circle" /> Pause
          </button>
        </div>
      )}
      {(mode === 'paused') && (
        <div className="controls sticky-nav">
          <button className="btn btn-resume" title="(Space/Enter)" onClick={handleResumeRecording}>
            <i className={'fas fa-pause-circle fa-spin fa-inverse'} /> Resume
          </button>
          <button className="btn btn-save" title="(Ctrl+S)" onClick={handleSaveRecording}>
            <i className="fas fa-save" /> Save
          </button>
        </div>
      )}
      {mode === 'saving' && (
        <div className="controls sticky-nav saving-indicator">
          <span className="fas fa-circle-notch fa-spin" />
          <p>Saving...</p>
        </div>
      )}
    </div>
    </>);
};

function stopRecorders(mediaRecorders: MediaRecorder[]) {
  mediaRecorders.forEach((mediaRecorder) => {
    if (mediaRecorder.state !== 'inactive')
      mediaRecorder.stop();
  });
}

function padZeros(n: number, ndigits: number = 2) {
  return `${n}`.padStart(ndigits, '0')
}

export default App;
