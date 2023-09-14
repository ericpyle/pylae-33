import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css'

const howToVideoUrl = 'https://github.com/ericpyle/pylae-33/assets/1125565/ed4c215b-7864-4ff7-ba6d-6ac926b1dec6'

const isSupportedInBrowser = navigator.mediaDevices &&
  "getDisplayMedia" in navigator.mediaDevices


const COUNT_DOWN_FROM = 3
const MAX_DURATION = 33000
const RECORDING_INTERVAL = 3000
const MAX_RECORDERS = MAX_DURATION / RECORDING_INTERVAL
const LOOPING_DURATION = MAX_DURATION/1000 - COUNT_DOWN_FROM
// log({MAX_RECORDERS, RECORDING_INTERVAL})

const useDownloadVideo = (url: string, dbName: string, storeName: string) => {
  useEffect(() => {
    const downloadVideo = async () => {
      const response = await fetch(url);
      const blob = await response.blob();
      const dbReq = indexedDB.open(dbName);
      dbReq.onupgradeneeded = () => {
        const db = dbReq.result;
        db.createObjectStore(storeName);
      };
      dbReq.onsuccess = () => {
        const db = dbReq.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(blob, url);
      };
    };
    downloadVideo();
  }, [url, dbName, storeName]);
};

/*
 * From https://stackoverflow.com/a/53360402 and https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();
  const savedIntervalId = useRef<NodeJS.Timer>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current!();
    }
    log('useInterval useEffect delay: ' + delay)
    log('savedIntervalId: ' + savedIntervalId.current);
    if (savedIntervalId.current !== undefined) {
      log('clearInterval: ' + savedIntervalId.current);
      clearInterval(savedIntervalId.current)
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      savedIntervalId.current = id
      log(`setInterval ${id} ${delay}`)
      return () => clearInterval(id);
    }
  }, [delay]);
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'stopped' | 'record-pressed' | 'recording' | 'paused' | 'saving'>('stopped');
  const mediaRecordersRef = useRef<MediaRecorder[]>([]);
  const mediaStreamRef = useRef<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [countDown, setCountDown] = useState(COUNT_DOWN_FROM);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string>();
  const [showVideo, setShowVideo] = useState(false);
  const [savedVideoFilename, setSavedVideoFilename] = useState<string>();
  const [showAltInstructions, _] = useState(false);
  const [looping, setLooping] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [loopingSeconds, setLoopingSeconds] = useState<number>(LOOPING_DURATION);
  
  const howToVideoUrl = 'https://github.com/ericpyle/pylae-33/assets/1125565/ed4c215b-7864-4ff7-ba6d-6ac926b1dec6';
  useDownloadVideo(howToVideoUrl, 'Assets', 'videoBlobs' );

  log({ mode, countDown });

  const addToMediaRecorders = () => {
    const newMediaRecorder = new MediaRecorder(mediaStreamRef.current!, {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 1000000,
    });
    log('addToMediaRecorders entered', { mediaRecorders: mediaRecordersRef.current.length });
    newMediaRecorder.onstart = () => {
      log('onstart fired', {recordingSeconds});
    }
    newMediaRecorder.start();
    log('start() called');
    // if ('memory' in window.performance)
    // log({memory: window.performance.memory})
    if (mediaRecordersRef.current.length === MAX_RECORDERS) {
      stopRecorders(mediaRecordersRef.current.slice(0, 1)); // stop the first one
      setRecordingSeconds((MAX_DURATION - RECORDING_INTERVAL)/1000);
    }
    const updatedRecorders = [...mediaRecordersRef.current.slice(-(MAX_RECORDERS - 1)), newMediaRecorder];
    mediaRecordersRef.current = updatedRecorders;
    log('addToMediaRecorders finished', { recordingSeconds, states: mediaRecordersRef.current.map(mr => mr.state) });
  }

  useInterval(() => {
    log({ countDown });
    setCountDown(countDown - 1);
  }, (mode === 'recording' && countDown > 0) ? 1000 : null);

  useInterval(() => {
    setRecordingSeconds(recordingSeconds + 1)
    setLoopingSeconds(loopingSeconds - 1)
  }, (mode === 'recording' && countDown === 0) ? 1000 : null);

  useEffect(() => {
    if (countDown === 0) {
      log('adding/starting first recorder at countDown 0');
      addToMediaRecorders();
    }
  }, [countDown]);

  useInterval(() => {
    if (!isSupportedInBrowser) {
      setMode('stopped');
      return;
    }
    if (mediaRecordersRef.current?.length > 0 &&
        mediaRecordersRef.current[0].state === 'paused') {
      log('resuming');
      mediaRecordersRef.current[0].resume();
      return;
    }
    log('adding to mediarecorders: ', { countDown });
    addToMediaRecorders();

  }, (mode === 'recording' && countDown === 0 && looping) ? RECORDING_INTERVAL : null);

  const handleKeyShortcut = (event: KeyboardEvent) => {
    // log(JSON.stringify(event.key));
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
    if (mode === 'recording' && event.key === 'l') {
      handleToggleLoop();
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
      stopAndResetRecorders(mediaRecordersRef);
      setRecordingSeconds(0);
      setSavedVideoFilename(undefined);
      setSavedVideoUrl(undefined);
      setLooping(true);
      setLoopingSeconds(LOOPING_DURATION);
      setMode('record-pressed');
      if (isSupportedInBrowser && !mediaStreamRef.current) {
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
          mediaStreamRef.current = undefined;
          setMode('stopped');
        };
        mediaStreamRef.current = stream;
      }
      setCountDown(COUNT_DOWN_FROM);
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

  const handleToggleLoop = () => {
    const nextLoopingState = !looping;
    setLooping(nextLoopingState);
    setLoopingSeconds(LOOPING_DURATION);
    log('handleToggleLoop', {nextLoopingState, recordingSeconds });
    if (nextLoopingState === false) {
      stopRecorders(mediaRecordersRef.current.slice(1)); // stop all but the first
      log({ states: mediaRecordersRef.current.map(mr => mr.state) });
      mediaRecordersRef.current = mediaRecordersRef.current.slice(0, 1); // remove all but first one
      log({ states: mediaRecordersRef.current.map(mr => mr.state) });
    } else if (nextLoopingState === true) {
      handleStartRecording();
    }
  }


  function downloadSavedFile() {
    const filename = createFilename(videoRef.current!);
    setSavedVideoFilename(filename);
    const link = document.createElement('a');
    link.href = savedVideoUrl!;
    link.download = filename;
    link.click();
  }

  // From https://stackoverflow.com/a/69512775
  const getDuration = () => {
    const video = videoRef.current
    if (!video)
      return
    video.currentTime = 0
    video.removeEventListener('timeupdate', getDuration)
    log({ videoDuration: video.duration})
    downloadSavedFile()
    return video.duration
  }

  const onLoadedMetadata = () => {
    if (!videoRef.current)
      return;
    const video = videoRef.current
    // From https://stackoverflow.com/a/69512775
    if (video.duration === Infinity || isNaN(Number(video.duration))) {
      video.currentTime = 1e101
      video.addEventListener('timeupdate', getDuration)
      return;
    }
    // Generate the filename
    downloadSavedFile();
  }

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
    log({ statesInSave: mediaRecordersRef.current.map(mr => mr.state) })
    const longestMediaRecorder = mediaRecordersRef.current[0];
    const recordedChunks: Blob[] = [];
    longestMediaRecorder.ondataavailable = (event) => {
      recordedChunks.push(event.data)
    }
    longestMediaRecorder.onstop = () => {

      // Save the recording
      const blob = new Blob(recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setSavedVideoUrl(url);
      log({savedUrl: url})

      // Reset the app
      stopAndResetRecorders(mediaRecordersRef);
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = undefined;
      setMode('stopped');
    }
    longestMediaRecorder.stop();
    setRecordingSeconds(0);
  };

  const displayRecordTime = () => {
    return convertSecondsToMMSS(recordingSeconds);
  }

  const getLoopingTime = () => {
    if (!looping || mediaRecordersRef.current.length === MAX_RECORDERS)
      return ''
    return 'in ' + convertSecondsToMMSS(loopingSeconds) + 's';
  }

  const warnUnsupported = !isSupportedInBrowser && <div className="warn-unsupported">Sorry, sceen capture is not supported in your browser</div>

  const videoUrl = savedVideoUrl ?? 'https://github.com/ericpyle/pylae-33/assets/1125565/ed4c215b-7864-4ff7-ba6d-6ac926b1dec6' 
  return (<>
    <div className="app">
      {(mode === 'stopped' || mode === 'record-pressed') && (
        <div>
          <div className="controls sticky-nav" title="(Space/Enter)">
            <button type="button" className="btn btn-record" onClick={handleStartRecording}>
              <i className={`fas fa-circle ${mode === 'record-pressed' && 'fa-inverse'}`} /> Record
            </button>
            <div className="video-container with-title">
              <div>
                {warnUnsupported}
                <h1 style={{ cursor: "pointer", textDecorationLine: "underline" }} role="button" tabIndex={0} onClick={() => setShowVideo(!showVideo)} onKeyDown={() => setShowVideo(!showVideo)} title="Show/Hide video how to use Pylae-33" className="video-title">{!savedVideoUrl ? 'How to use Pylae-33' : savedVideoFilename}</h1>
              </div>
              <video ref={videoRef} style={{ maxHeight: "640px", minHeight: "200px", display: showVideo ? 'block' : 'none' }} {...(savedVideoUrl?{onLoadedMetadata: onLoadedMetadata}:{})} title={savedVideoUrl ? savedVideoFilename : 'How to use Pylae-33'}  src={videoUrl} muted controls data-video="0" />
              {showAltInstructions && <div>
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
            </div>
          </div>
        </div>
      )}
      {(mode === 'recording' && countDown > 0) && (<>
        <div className="controls sticky-nav" title="(Space/Enter)">
          <button className="btn btn-pause" onClick={() => log('Recording countdown')}>
            <i className="fas fa-circle fa-inverse" /> Recording in {padZeros(countDown, countDown)}s
          </button>
          {warnUnsupported}
        </div>
        </>
      )}
      {(mode === 'recording' && countDown <= 0) && (
        <div className="controls sticky-nav" title="(Space/Enter)">
          <button className="btn btn-pause" onClick={handlePauseRecording}>
            <div>
              <div><i className="fas fa-pause-circle" /> Pause</div>
              <div>{displayRecordTime()}</div>
            </div>
          </button>
          <button className="btn btn-loop" title="(L)" onClick={handleToggleLoop}>
            <div>
              <div><i className={`fa-solid fa-arrows-spin  ${looping && 'fa-spin' || 'fa-bea'}`}/> {looping && 'Looping' || 'Reset/Loop'}</div>
            <div>{getLoopingTime()}</div>
            </div>
          </button>
        </div>
      )}
      {(mode === 'paused') && (
        <div className="controls sticky-nav">
          <button className="btn btn-resume" title="(Space/Enter)" onClick={handleResumeRecording}>
            <div>
              <div><i className={'fas fa-pause-circle fa-spin fa-inverse'} /> Resume</div>
              <div>{displayRecordTime()}</div>
            </div>
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

function stopAndResetRecorders(mediaRecordersRef: React.MutableRefObject<MediaRecorder[]>) {
  stopRecorders(mediaRecordersRef.current);
  mediaRecordersRef.current = [];
}

function convertSecondsToMMSS(s: number) {
  const seconds = s % 60;
  const minutes = Math.floor(s / 60);
  return `${padZeros(minutes, 2)}:${padZeros(seconds, 2)}`;
}

function createFilename(vid: HTMLVideoElement) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${padZeros(now.getMonth() + 1, 2)}-${padZeros(now.getDate(), 2)} ${padZeros(now.getHours(), 2)}-${padZeros(now.getMinutes(), 2)}${padZeros(now.getSeconds(), 2)}`;
  const duration = Math.floor(vid.duration);
  const filename = `pylae-33-${timestamp}_${duration}s.mp4`;
  return filename;
}

function stopRecorders(mediaRecorders: MediaRecorder[]) {
  mediaRecorders.forEach((mediaRecorder) => {
    if (mediaRecorder.state !== 'inactive')
      mediaRecorder.stop();
  });
}

function padZeros(n: number, ndigits: number = 2) {
  return `${n}`.padStart(ndigits, '0')
}

const _window = window as any
_window.debug = false;

function log(message: any, second: any = undefined) {
  _window.debug && console.log(`${new Date().toISOString()}:`, message, second)
}

export default App;
