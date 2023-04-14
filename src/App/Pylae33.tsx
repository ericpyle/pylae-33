import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faPauseCircle, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const Pylae33 = () => {
  const [mode, setMode] = useState('stopped');
  const [mediaRecorders, setMediaRecorders] = useState([]);
  const [recordingStream, setRecordingStream] = useState(null);
  const [closeButtonFlash, setCloseButtonFlash] = useState(false);

  useEffect(() => {
    // Set up the screen recording stream
    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          frameRate: 11,
        },
        audio: false,
      })
      .then((stream) => {
        setRecordingStream(stream);
      })
      .catch((error) => {
        console.error('Error setting up recording stream:', error);
      });

    // Clean up on unmount
    return () => {
      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      mediaRecorders.forEach((mediaRecorder) => {
        mediaRecorder.stop();
      });
    };
  }, []);

  const handleRecordClick = () => {
    if (mode === 'stopped') {
      // Start recording
      setMode('recording');
      const mediaRecorder = new MediaRecorder(recordingStream);
      setMediaRecorders([mediaRecorder]);
      mediaRecorder.start();
    } else if (mode === 'recording') {
      // Pause recording
      setMode('paused');
      mediaRecorders.forEach((mediaRecorder) => {
        mediaRecorder.pause();
      });
    } else if (mode === 'paused') {
      // Resume recording
      setMode('recording');
      mediaRecorders.forEach((mediaRecorder) => {
        mediaRecorder.resume();
      });
    }
  };

  const handleSaveClick = () => {
    // Stop recording the media recorder with the most seconds
    const longestMediaRecorder = mediaRecorders.reduce((longest, current) => {
      return current.startTime - longest.startTime > 0 ? current : longest;
    });
    longestMediaRecorder.stop();

    // Remove any other media recorders
    const newMediaRecorders = mediaRecorders.filter((mediaRecorder) => {
      return mediaRecorder !== longestMediaRecorder;
    });
    setMediaRecorders(newMediaRecorders);

    // Generate the filename
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())} ${padNumber(now.getHours())}-${padNumber(now.getMinutes())}${padNumber(now.getSeconds())}`;
    const duration = padNumber(Math.floor(longestMediaRecorder.duration / 1000));
    const filename = `pylae-33-${timestamp}_${duration}s.mp4`;

    // Save the recording
    const blob = new Blob(newMediaRecorders.map((mediaRecorder) => mediaRecorder.getBlob()), { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Reset the app
    setMode('stopped');
    newMediaRecorders.forEach((mediaRecorder) => {
      mediaRecorder.stop();
    });
    setMediaRecorders([]);
  };

  const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (mode === 'recording' || mode === 'paused') {
        setCloseButtonFlash(true);
        setTimeout(() => {
          setCloseButtonFlash(false);
        }, 100);
      } else {
        setMode('stopped');
        mediaRecorders.forEach((mediaRecorder) => {
          mediaRecorder.stop();
        });
        setMediaRecorders([]);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  });

  const closeButtonClassNames = ['close-button'];
  if (closeButtonFlash) {
    closeButtonClassNames.push('flash');
  }

  return (
    <div className="pylae-33">
      <div className="header">
        <h1>Pylae 33</h1>
        <FontAwesomeIcon
          className={closeButtonClassNames.join(' ')}
          icon={faTimes}
          onClick={() => {
            if (mode === 'recording' || mode === 'paused') {
              setCloseButtonFlash(true);
              setTimeout(() => {
                setCloseButtonFlash(false);
              }, 100);
            } else {
              setMode('stopped');
              mediaRecorders.forEach((mediaRecorder) => {
                mediaRecorder.stop();
              });
              setMediaRecorders([]);
            }
          }}
        />
      </div>
      <div className="video-wrapper">
        <video className="recording" src={mediaRecorders.length ? URL.createObjectURL(mediaRecorders[0].getBlob()) : null} autoPlay loop />
        <FontAwesomeIcon
          className="record-button"
          icon={mode === 'stopped' ? faCircle : mode === 'recording' ? faPauseCircle : faCircle}
          onClick={handleRecordClick}
        />
        <FontAwesomeIcon className="save-button" icon={faSave} onClick={handleSaveClick} />
      </div>
      {mode === 'paused' && <div className="paused-overlay" />}
    </div>
  );
};

export default Pylae33;
