import React, { useState, useEffect } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css'

const recordedChunks: Blob[] = [];

const App: React.FC = () => {
  const [mode, setMode] = useState<'stopped' | 'recording' | 'paused' | 'saving'>('stopped');
  const [mediaRecorders, setMediaRecorders] = useState<MediaRecorder[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream>();

    useEffect(() => {
        if (mode === 'recording') {
            const intervalId = setInterval(() => {
                const newMediaRecorder = new MediaRecorder(mediaStream!, {
                    mimeType: 'video/webm; codecs=vp9',
                    videoBitsPerSecond: 1_000_000,
                });
                newMediaRecorder.start(1000);
                setMediaRecorders((prevMediaRecorders) => {
                    if (prevMediaRecorders.length === 0) {
                        console.log('ondataavailable')
                        newMediaRecorder.ondataavailable = (event) => {
                            recordedChunks.push(event.data);
                            console.log('got recorded chunks' + recordedChunks.length);
                        }
                    }
                    if (prevMediaRecorders.length > 32) {
                        recordedChunks.splice(0,1);
                        if (prevMediaRecorders[0].ondataavailable) {
                            // designate last mediaRecorder to collect data before we remove the first one
                            prevMediaRecorders[32].ondataavailable = prevMediaRecorders[0].ondataavailable; 
                            prevMediaRecorders[0].ondataavailable = null;
                            newMediaRecorder.ondataavailable = null;
                            console.log('ondataavailable reset')
                        }
                    }
                    return [...prevMediaRecorders.slice(-32), newMediaRecorder]
                });
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [mode, mediaStream]);

    function resetToStoppedMode() {
        recordedChunks.splice(0)
        setMediaRecorders([]);
        setMode('stopped');
    }

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: false,
                frameRate: 11,
            });
            // handle if the user stops sharing screen
            // see https://stackoverflow.com/a/25179198
            stream.getVideoTracks()[0].onended = resetToStoppedMode;
            setMediaStream(stream);
            setMode('recording');
        } catch (error) {
            console.error('Error starting screen recording: ', error);
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
        longestMediaRecorder.onstop = (event) => {
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
            mediaRecorders.forEach((mediaRecorder) => {
                if (mediaRecorder.state !== 'inactive')
                    mediaRecorder.stop();
            });
            mediaStream?.getTracks().forEach((track) => {
                track.stop();
            });
            resetToStoppedMode();
        }
        longestMediaRecorder.stop();
    };

    return (
        <div className="app">
          {mode === 'stopped' && (
            <div className="controls">
              <button className="btn btn-record" onClick={handleStartRecording}>
                <i className="fas fa-circle" /> Start Recording
              </button>
            </div>
          )}
          {(mode === 'recording') && (
            <div className="controls">
              <button className="btn btn-pause" onClick={handlePauseRecording}>
                <i className="fas fa-pause-circle" /> Pause
              </button>
            </div>
          )}
          {(mode === 'paused') && (
            <div className="controls">
              <button className="btn btn-resume" onClick={handleResumeRecording}>
                <i className={'fas fa-pause-circle fa-spin'} /> Resume
              </button>
              <button className="btn btn-save" onClick={handleSaveRecording}>
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

function padZeros(n: number, ndigits: number = 2) {
    return `${n}`.padStart(ndigits, '0')
  }

export default App;
