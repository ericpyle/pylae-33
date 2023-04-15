import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faPauseCircle, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
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
        <div className="App">
            <header>
                <h1>Screen Recorder</h1>
            </header>
            <main>
                {mode === 'stopped' && (
                    <button onClick={handleStartRecording}>Start Recording</button>
                )}
                {(mode === 'recording' || mode === 'paused') && (
                    <button onClick={handleStopRecording}>Stop Recording</button>
                )}
                {mode === 'paused' && (
                    <button onClick={handleResumeRecording}>Resume Recording</button>
                )}
                {mode === 'recording' && (
                    <button onClick={handlePauseRecording}>Pause Recording</button>
                )}
                {mode === 'saving' && (
                    <button onClick={handleSaveRecording}>Save Recording</button>
                )}
                {downloadLink && (
                    <div className="download-link-container">
                        <a href={downloadLink} download="screen-recording.webm">Download Recording</a>
                        <button onClick={handleCloseDownloadLink}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}
                <video ref={videoRef} autoPlay muted></video>
            </main>
        </div>
    );
};

export default App;
