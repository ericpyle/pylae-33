import React, { useState, useEffect } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css'

const isSupportedInBrowser = navigator.mediaDevices &&
            "getDisplayMedia" in navigator.mediaDevices

const App: React.FC = () => {
  const [mode, setMode] = useState<'stopped' | 'record-pressed' | 'recording' | 'paused' | 'saving'>('stopped');
  const [mediaRecorders, setMediaRecorders] = useState<MediaRecorder[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream>();

    useEffect(() => {
        if (mode === 'recording') {
            const intervalId = setInterval(() => {
                const newMediaRecorder = new MediaRecorder(mediaStream!, {
                    mimeType: 'video/webm; codecs=vp9',
                    videoBitsPerSecond: 1_000_000,
                });
                newMediaRecorder.start();
                setMediaRecorders((prevMediaRecorders) => {
                  if (prevMediaRecorders.length === 33)
                    stopRecorders(prevMediaRecorders.slice(0,1)); // stop the first one
                  return [...prevMediaRecorders.slice(-32), newMediaRecorder];
                });
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [mode, mediaStream]);

    const handleKeyShortcut = (event: KeyboardEvent) => {
      console.log(JSON.stringify(event.key));
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
                setMediaRecorders([]);
                setMode('stopped');
            };
            setMediaStream(stream);
            setMode('recording');
        } catch (error) {
            console.error('Error starting screen recording: ', error);
            setMode('stopped');
        }
    };

    const handlePauseRecording = () => {
        mediaRecorders.forEach((mediaRecorder) => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.pause();
            }
        });
        setMode('paused');
    };

    const handleResumeRecording = () => {
        mediaRecorders.forEach((mediaRecorder) => {
            if (mediaRecorder.state === 'paused') {
                mediaRecorder.resume();
            }
        });
        setMode('recording');
    };

    const handleSaveRecording = () => {
        // Stop recording the media recorder with the most seconds
        const longestMediaRecorder = mediaRecorders[0];
        const recordedChunks: Blob[] = [];
        longestMediaRecorder.ondataavailable = (event) => {
            recordedChunks.push(event.data)
        }
        longestMediaRecorder.onstop = () => {
            // Generate the filename
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${padZeros(now.getMonth() + 1, 2)}-${padZeros(now.getDate(), 2)} ${padZeros(now.getHours(), 2)}-${padZeros(now.getMinutes(), 2)}${padZeros(now.getSeconds(), 2)}`;
            const duration = mediaRecorders.length
            const filename = `pylae-33-${timestamp}_${duration}s.mp4`;

            // Save the recording
            const blob = new Blob(recordedChunks, { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();

            // Reset the app
            stopRecorders(mediaRecorders);
            mediaStream?.getTracks().forEach((track) => {
                track.stop();
            });
            setMediaRecorders([]);
            setMode('stopped');
        }
        longestMediaRecorder.stop();
    };

    return (
        <div className="app">
          {!isSupportedInBrowser && <div className="warn-unsupported">Sorry, sceen capture is not supported in your browser</div>}
          {(isSupportedInBrowser && mode === 'stopped' || mode === 'record-pressed') && (
            <div className="controls" title="(Space/Enter)">
              <button className="btn btn-record" onClick={handleStartRecording}>
                <i className={`fas fa-circle ${mode === 'record-pressed' && 'fa-inverse'}`} /> Record
              </button>
            </div>
          )}
          {(mode === 'recording') && (
            <div className="controls" title="(Space/Enter)">
              <button className="btn btn-pause" onClick={handlePauseRecording}>
                <i className="fas fa-pause-circle" /> Pause
              </button>
            </div>
          )}
          {(mode === 'paused') && (
            <div className="controls">
              <button className="btn btn-resume" title="(Space/Enter)" onClick={handleResumeRecording}>
                <i className={'fas fa-pause-circle fa-spin fa-inverse'} /> Resume
              </button>
              <button className="btn btn-save" title="(Ctrl+S)" onClick={handleSaveRecording}>
                <i className="fas fa-save" /> Save
              </button>
            </div>
          )}
          {mode === 'saving' && (
            <div className="saving-indicator">
              <span className="fas fa-circle-notch fa-spin" />
              <p>Saving...</p>
            </div>
          )}
        </div>
      );      
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
