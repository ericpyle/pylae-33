import { useState, useEffect, KeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faPauseCircle, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const Pylae33 = () => {
  const [mode, setMode] = useState('stopped');
  const [mediaRecorders, setMediaRecorders] = useState<MediaRecorder[]>([]);
  const [recordingStream, setRecordingStream] = useState<MediaStream>();
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
      mediaRecorders.forEach((mediaRecorder: MediaRecorder) => {
        mediaRecorder.stop();
      });
    };
  }, []);

  const handleRecordClick = () => {
    if (mode === 'stopped') {
      // Start recording
      setMode('recording');
      const mediaRecorder = new MediaRecorder(recordingStream!);
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
      setMode('stopped');
      newMediaRecorders.forEach((mediaRecorder) => {
        mediaRecorder.stop();
      });
      setMediaRecorders([]);
    }
    longestMediaRecorder.stop();

    // Remove any other media recorders
    const newMediaRecorders = mediaRecorders.filter((mediaRecorder) => {
      return mediaRecorder !== longestMediaRecorder;
    });
    setMediaRecorders([longestMediaRecorder]);
  };

  const handleEscapeKey = (event: KeyboardEvent) => {
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

  /* TODO: Fix Typescript
  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }); */

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

function padZeros(n: number, ndigits: number) {
  return `${n}`.padStart(ndigits, '0')
}

export default Pylae33;
