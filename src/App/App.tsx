import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App: React.FC = () => {
  const [mode, setMode] = useState<'stopped' | 'recording' | 'paused' | 'saving'>('stopped');
  const [mediaRecorders, setMediaRecorders] = useState<MediaRecorder[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mode === 'recording') {
      const newMediaRecorder = new MediaRecorder(mediaStream as MediaStream, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 1_000_000,
      });
      newMediaRecorder.ondataavailable = ({ data }) => {
        if (mode === 'recording') {
          setMediaRecorders((prevMediaRecorders) => [...prevMediaRecorders, newMediaRecorder]);
        }
      };
      newMediaRecorder.start();
      setMediaRecorders((prevMediaRecorders) => [...prevMediaRecorders, newMediaRecorder]);
      setStartTime(Date.now());
    } else if (mode === 'paused') {
      const timeElapsed = endTime as number - startTime as number;
      setStartTime(Date.now() - timeElapsed);
    } else if (mode === 'stopped') {
      setMediaRecorders([]);
      setStartTime(null);
      setEndTime(null);
      setDownloadLink(null);
    }
  }, [mode, mediaStream]);

  useEffect(() => {
    if (mode === 'recording') {
      const intervalId = setInterval(() => {
        const newMediaRecorder = new MediaRecorder(mediaStream as MediaStream, {
          mimeType: 'video/webm; codecs=vp9',
          videoBitsPerSecond: 1_000_000,
        });
        newMediaRecorder.ondataavailable = ({ data }) => {
          if (mode === 'recording') {
            setMediaRecorders((prevMediaRecorders) => [...prevMediaRecorders, newMediaRecorder]);
          }
        };
        newMediaRecorder.start();
        setMediaRecorders((prevMediaRecorders) => [...prevMediaRecorders, newMediaRecorder]);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [mode, mediaStream]);

    const handleCloseDownloadLink = () => {
        setDownloadLink(null);
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: true,
            });
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

    const handleStopRecording = () => {
        mediaRecorders.forEach((mediaRecorder) => mediaRecorder.stop());
        setMode('saving');
        setStartTime(null);
        setEndTime(null);
    };

    const handleSaveRecording = () => {
        const blob = new Blob(mediaRecorders.map((mediaRecorder) => mediaRecorder.state !== 'inactive' ? mediaRecorder.recordedBlobs : []), { type: 'video/webm' });
        setDownloadLink(URL.createObjectURL(blob));
        setMode('stopped');
    };

    return (
        <div className="app">
          <h1>Screen Recorder</h1>
          <div className="video-container">
            <video ref={videoRef} autoPlay muted />
            {mode === 'recording' && (
              <div className="recording-indicator">
                <span className="fas fa-circle" />
                <p>Recording...</p>
              </div>
            )}
          </div>
          {mode === 'stopped' && (
            <div className="controls">
              <button className="btn" onClick={handleStartRecording}>
                <i className="fas fa-circle" /> Start Recording
              </button>
            </div>
          )}
          {(mode === 'recording' || mode === 'paused') && (
            <div className="controls">
              <button className="btn" onClick={handlePauseRecording}>
                <i className={mode === 'recording' ? 'fas fa-pause-circle' : 'fas fa-play-circle'} /> {mode === 'recording' ? 'Pause' : 'Resume'}
              </button>
              <button className="btn" onClick={handleStopRecording}>
                <i className="fas fa-stop-circle" /> Stop
              </button>
            </div>
          )}
          {mode === 'saving' && (
            <div className="saving-indicator">
              <span className="fas fa-circle-notch fa-spin" />
              <p>Saving...</p>
            </div>
          )}
          {downloadLink && (
            <div className="download-link-container">
              <p>Your screen recording is ready to download:</p>
              <a href={downloadLink} download>
                <i className="fas fa-download" /> Download
              </a>
              <button className="close-btn" onClick={handleCloseDownloadLink}>
                <i className="fas fa-times" />
              </button>
            </div>
          )}
        </div>
      );      
};

export default App;
