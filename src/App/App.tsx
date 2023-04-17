import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css'

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
                newMediaRecorder.start();
                setMediaRecorders((prevMediaRecorders) => [...prevMediaRecorders.slice(-32), newMediaRecorder]);
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [mode, mediaStream]);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: false,
                frameRate: 11,
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
            setMediaRecorders([]);
            setMode('stopped');
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
