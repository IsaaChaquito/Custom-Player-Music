import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Info } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import { AddSongIcon, InfoItalicIcon } from '../assets/icons'; 

// Componente principal del reproductor de música
export default function MusicPlayer() {
  // Estado para almacenar los archivos de música cargados
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeBarWidth, setVolumeBarWidth] = useState(0)
  const [showSongInfo, setShowSongInfo] = useState(false);
  
  // Referencias para manipular el elemento de audio
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const handleFileUpload = async (e) => {

    const files = Array.from(e.target.files);

    if (!files) return;
    
    const newPlaylist = await Promise.all(files.map( async file => {

      try {
        const metadata = await parseBlob(file);
        
        const { common, format } =  metadata 
        let picture = common?.picture[0]
        if (picture) {
          const base64String = uint8ArrayToBase64(picture.data);
          const mimeType = picture.format;
          const imageUrl = `data:${mimeType};base64,${base64String}`;
          picture = imageUrl
        }

        function uint8ArrayToBase64(uint8Array) {
            let binary = '';
            uint8Array.forEach((byte) => {
              binary += String.fromCharCode(byte);
            });
            return window.btoa(binary);
          }

        return {
          name: common?.title,
          artist: common?.artist,
          artists: common?.artists,
          album: common?.album,
          track: common?.track?.no,
          year: common?.year,
          genre: common?.genre,
          duration: format?.duration,
          url: URL.createObjectURL(file),
          picture,
          file
        }
      } catch (error) {
        console.error("Error leyendo metadatos:", error);
      }

        console.log({ newPlaylist });


    }))


    console.log({ newPlaylist });    
    setPlaylist([...playlist, ...newPlaylist]);
    
    // Si es la primera canción cargada, configurarla
    if (playlist.length === 0 && newPlaylist.length > 0) {
      setCurrentTrackIndex(0);
    }
  };

  
  // Controles de reproducción
  const togglePlay = () => {
    if (playlist.length === 0) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const playPreviousTrack = () => {
    if (playlist.length === 0) return;
    
    const newIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
    setIsPlaying(true);
  };
  
  const playNextTrack = () => {
    if (playlist.length === 0) return;
    
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
    setIsPlaying(true);
  };
  
  // Control de volumen
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };
  
  // Control de progreso
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  // Formatear tiempo en formato MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Efecto para cargar metadatos de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration);
        if (isPlaying) audioRef.current.play();
      };
      
      audioRef.current.onended = () => {
        playNextTrack();
      };
    }
  }, [currentTrackIndex, playlist]);
  
  // Efecto para actualizar el volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleMouseEnter = () => {
    setVolumeBarWidth(50)
  }

  const handleMouseLeave = () => {
    setVolumeBarWidth(0)
  }

  const alternateShowSongInfo = () => {
    setShowSongInfo(!showSongInfo)
  }
  
  return (
    <div className="flex flex-col items-center w-full sm:w-3xl min-h-screen  p-6 mx-auto bg-gray-800 sm:rounded-lg shadow-lg">
      {/* <h2 className="mb-6 text-2xl font-bold text-white ">Reproductor de música</h2> */}
      
      {/* Área de carga de archivos */}
      <div className="rounded-full mb-6 aspect-square">
        <label className="rounded-full flex items-center justify-center p-4 bg-gray-700 border-2 border-dashed cursor-pointer hover:bg-gray-600 border-gray-500">
          <span className="text-gray-300">
            <AddSongIcon className="w-6 h-6" />
          </span>
          <input 
            type="file" 
            accept="audio/*" 
            multiple 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </label>
      </div>

      {/* Imagen de la cancion */}
      {playlist.length > 0 && (
        <div onClick={alternateShowSongInfo} className="mb-6 *:rounded-lg relative group shadow-md">
            <img 
                src={playlist[currentTrackIndex].picture} 
                alt={playlist[currentTrackIndex].title} 
                className="size-48 "
              />

          {playlist[currentTrackIndex] &&
            <div className={`flex flex-col gap-y-1 absolute top-0 left-0 size-48 bg-black opacity-0 group-hover:opacity-85 text-sm p-3 duration-300 ${showSongInfo ? 'opacity-85' : 'opacity-0'}`}>
              <h3 className="text-xl font-semibold text-white text-center"> {playlist[currentTrackIndex].name}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Artist: {playlist[currentTrackIndex].artist}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Album: {playlist[currentTrackIndex].album}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Year: {playlist[currentTrackIndex].year}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Genre: {playlist[currentTrackIndex].genre.join(', ')}</h3>
            </div>}
        </div>
      )}
      
      {/* Información de la canción actual */}
      <div className="w-48 mb-4 text-center bg-slate-6000">
        {playlist.length > 0 ? (
          <div className='flex justify-between items-center'>
            <div className='flex flex-col items-start'>
              <h3 className="text-xl font-semibold text-white"> {playlist[currentTrackIndex].name}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>{playlist[currentTrackIndex].artist}</h3>
              {/* <p className="text-gray-400 text-sm">Pista {currentTrackIndex + 1} de {playlist.length}</p> */}
            </div>
            <button onClick={ alternateShowSongInfo } className='p-1.5 rounded-full'>
              <InfoItalicIcon className="w-5.5 h-5.5 text-gray-400" />
            </button>
          </div>
        ) : (
          <p className="text-gray-400">No hay canciones cargadas</p>
        )}
      </div>
      
      <div className="flex items-center w-full mb-4">

        {/* Barra de progreso */}
        <div className='flex items-center w-full duration-300'>
          <span className="mr-2 text-sm text-gray-400">{formatTime(currentTime)}</span>
        <input 
          ref={progressBarRef}
          type="range" 
          min="0" 
          max={duration || 0} 
          value={currentTime} 
          step="0.01"
          onChange={handleProgressChange}
          className="flex-grow w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer duration-300"
        />
        <span className="ml-2 text-sm text-gray-400">{formatTime(duration)}</span>
        </div>

        {/* Control de volumen */}
        <div             
            onMouseEnter={ handleMouseEnter } 
            onMouseLeave={ handleMouseLeave } 
            className="flex items-center w-24l ml-3 group duration-300"
        >
          <button 
            onClick={toggleMute} 
            className="mr-2 text-white">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input 
            style={{
              maxWidth: `${volumeBarWidth}px`,  
              opacity: `${volumeBarWidth > 0 ? 1 : 0}`
            }}
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={handleVolumeChange}
            className={`w-40 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer   transition-transform duration-300 ease-in-out `}
          />
        </div>
      </div>
      
      {/* Controles de reproducción */}
      <div className="flex items-center justify-center w-full mb-6 space-x-6">
        <button 
          onClick={playPreviousTrack}
          className="flex items-center justify-center p-2 text-white bg-gray-700 rounded-full hover:bg-gray-600"
        >
          <SkipBack size={24} />
        </button>
        
        <button 
          onClick={togglePlay}
          className="flex items-center justify-center p-4 text-white bg-blue-600 rounded-full hover:bg-blue-500"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>
        
        <button 
          onClick={playNextTrack}
          className="flex items-center justify-center p-2 text-white bg-gray-700 rounded-full hover:bg-gray-600"
        >
          <SkipForward size={24} />
        </button>

      
      </div>
      
      
      {/* Lista de reproducción */}
      {playlist.length > 0 && (
        <>
          <h3 className="mb-2 text-lg font-semibold text-white">Playlist</h3>
        <div className="w-full max-h-96 overflow-y-auto rounded-lg">


          <ul className="bg-gray-700">
            {playlist.map((track, index) => (
              <li 
                key={index} 
                className={`relative flex items-center p-3 border-b cursor-pointer border-gray-600 hover:bg-gray-600 ${index === currentTrackIndex ? 'bg-gray-600' : ''}`}
                onClick={() => {
                  setCurrentTrackIndex(index);
                  setIsPlaying(true);
                }}
              >
                {index === currentTrackIndex 
                  ? <div className="flex gap-3 absolute -left-3" style={{scale: 0.2}}>
                      <div className="bar bar-1"></div>
                      <div className="bar bar-2"></div>
                      <div className="bar bar-3"></div>
                    </div>
                  : <div className='pr-3'>{index + 1}</div>
                }
                <p className={`${index === currentTrackIndex ? 'ml-5' : ''} text-white`}>{track.name}</p>
              </li>
            ))}
          </ul>

        </div>
        </>
      )}
      
      {/* Elemento de audio oculto */}
      <audio
        ref={audioRef}
        src={playlist.length > 0 ? playlist[currentTrackIndex].url : '0'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        autoPlay={isPlaying}
      />
    </div>
  );
}