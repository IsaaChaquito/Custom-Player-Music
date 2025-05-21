import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Info } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import { AddSongIcon, InfoItalicIcon } from '../assets/icons'; 

// Componente principal del reproductor de música
export default function MusicPlayer() {
  // Estado para almacenar los archivos de música cargados
  // const [playlist, setPlaylist] = useState([]);
  // const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  // const [isPlaying, setIsPlaying] = useState(false);
  // const [duration, setDuration] = useState(0);
  // const [currentTime, setCurrentTime] = useState(0);
  // const [volume, setVolume] = useState(0.7);
  // const [isMuted, setIsMuted] = useState(false);
  // const [volumeBarWidth, setVolumeBarWidth] = useState(0)
  // const [showSongInfo, setShowSongInfo] = useState(false);

  const [player, setPlayer] = useState({
    currentTime: 0,
    currentTrackIndex: 0,
    duration: 0,
    isPlaying: false,
    volume: 0.7,
    isMuted: false,
    showSongInfo: false,
    volumeBarWidth: 0,
    playlist: []
  });
  
  // Referencias para manipular el elemento de audio
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const handleFileUpload = async (e) => {

    const files = Array.from(e.target.files);
    console.log('files', files);
    if (!files) return;
    console.log('files exist');
    const newPlaylist = await Promise.all(files.map( async file => {

      try {
        const metadata = await parseBlob(file);
        
        const { common, format } =  metadata 
        const { title, artist, artists, album, picture, track, year, genre, isrc } = common
        const { duration } = format
        
        if(validateExistingTrack(player.playlist, common?.isrc)) return

        let albumPicture = picture[0]
        if (picture) {
          const base64String = uint8ArrayToBase64(picture[0].data);
          const mimeType = picture.format;
          const imageUrl = `data:${mimeType};base64,${base64String}`;
          albumPicture = imageUrl
        }


        return {
          title: title || file.name.replace(/\.[^/.]+$/, ""),
          artist: artist || "Artista desconocido",
          artists: artists || [],
          album: album || "Álbum desconocido",
          track: track?.no,
          year: year || "",
          genre: genre ? genre : "Género desconocido",
          duration: duration || 0,
          url: URL.createObjectURL(file),
          isrc: isrc || null,
          picture: albumPicture,
          file
        }
      } catch (error) {
        console.error("Error leyendo metadatos:", error);
      }

      function uint8ArrayToBase64(uint8Array) {
        let binary = '';
        uint8Array.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        return window.btoa(binary);
      }

    }))


    console.log({ newPlaylist });    
    // setPlaylist([...playlist, ...newPlaylist]);
    setPlayer({ ...player, playlist: [...player.playlist, ...newPlaylist] });
    // setPlayer( preState => ({ ...preState, playlist: [...preState.playlist, ...newPlaylist] }));
    
    // Si es la primera canción cargada, configurarla
    if (player.playlist.length === 0 && newPlaylist.length > 0) {
      // setCurrentTrackIndex(0);
      setPlayer( prevState => ({ ...prevState, currentTrackIndex: 0 }));
    }

    function validateExistingTrack(playlist, isrc) {
      console.log('playlist', player.playlist);
      console.log('isrc', isrc);
      // console.log('existing track', playlist.some(existingTrack => existingTrack.isrc === isrc));
      if (!isrc) return false;
      return player.playlist.some(existingTrack => existingTrack.isrc === isrc);
    }

    console.log(player.playlist);
  };

  
  // Controles de reproducción
  const togglePlay = () => {
    if (player.playlist.length === 0) return;
    if (player.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    // setIsPlaying(!isPlaying);
    setPlayer({ ...player, isPlaying: !player.isPlaying });
  };
  
  const playPreviousTrack = () => {
    if (player.playlist.length === 0) return;
    
    const newIndex = player.currentTrackIndex === 0 ? player.playlist.length - 1 : player.currentTrackIndex - 1;
    // setCurrentTrackIndex(newIndex);
    // setIsPlaying(true);
    setPlayer({ 
      ...player, 
      currentTrackIndex: newIndex, 
      isPlaying: true 
    });

  };
  
  const playNextTrack = () => {
    if (player.playlist.length === 0) return;
    
    const newIndex = (player.currentTrackIndex + 1) % player.playlist.length;
    // setCurrentTrackIndex(newIndex);
    // setIsPlaying(true);
    setPlayer({ 
      ...player, 
      currentTrackIndex: newIndex, 
      isPlaying: true 
    });
  };
  
  // Control de volumen
  const toggleMute = () => {
    // setIsMuted(!isMuted);
    setPlayer({ ...player, isMuted: !player.isMuted });
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    // setVolume(newVolume);
    // setIsMuted(newVolume === 0);
    setPlayer({ 
      ...player, 
      volume: newVolume, 
      isMuted: newVolume === 0 
    });
  };
  
  // Control de progreso
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      // setCurrentTime(audioRef.current.currentTime);
      setPlayer({ ...player, currentTime: audioRef.current.currentTime });
    }
  };
  
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    // setCurrentTime(newTime);
    setPlayer({ 
      ...player, 
      currentTime: newTime 
    });
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  // Formatear tiempo en formato MM:SS
  const formatTime = (timeInSeconds) => {

    if (!timeInSeconds) return '0:00';

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Efecto para cargar metadatos de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onloadedmetadata = () => {
        // setDuration(audioRef.current.duration);
        setPlayer({ ...player, duration: audioRef.current.duration });
        if (player.isPlaying) audioRef.current.play();
      };
      
      audioRef.current.onended = () => {
        playNextTrack();
      };
    }
  }, [player.currentTrackIndex, player.playlist]);
  
  // Efecto para actualizar el volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = player.isMuted ? 0 : player.volume;
    }
  }, [player.volume, player.isMuted]);

  const handleMouseEnter = () => {
    // setVolumeBarWidth(50)
    setPlayer({ ...player, volumeBarWidth: 50 })
  }

  const handleMouseLeave = () => {
    // setVolumeBarWidth(0)
    setPlayer({ ...player, volumeBarWidth: 0 })
  }

  const alternateShowSongInfo = () => {
    // setShowSongInfo(!showSongInfo)
    setPlayer({ ...player, showSongInfo: !player.showSongInfo })
  }
  
  return (
    <div className="flex flex-col items-center w-full sm:w-3xl min-h-screen  p-6 mx-auto bg-gray-800 bg-gradient-to-t from-gray-700 via-gray-900 to-black sm:rounded-lg shadow-lg">

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
      {player.playlist.length > 0 && (
        <div onClick={alternateShowSongInfo} className="mb-6 *:rounded-lg relative group shadow-mdd">
            <img 
                src={player.playlist[player.currentTrackIndex].picture} 
                alt={player.playlist[player.currentTrackIndex].title} 
                className="size-48 "
              />

          {player.playlist[player.currentTrackIndex] &&
            <div className={`flex flex-col gap-y-1 absolute top-0 left-0 size-48 bg-black opacity-0 border border-gray-500 group-hover:opacity-85 text-sm p-3 duration-300 ${player.showSongInfo ? 'opacity-85' : 'opacity-0'}`}>
              <h3 className="text-xl font-semibold text-white text-center"> {player.playlist[player.currentTrackIndex].title}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Artist: {player.playlist[player.currentTrackIndex].artist}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Album: {player.playlist[player.currentTrackIndex].album}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Year: {player.playlist[player.currentTrackIndex].year}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Genre: {player.playlist[player.currentTrackIndex].genre.join(', ')}</h3>
            </div>}
        </div>
      )}
      
      {/* Información de la canción actual */}
      <div className="w-48 mb-4 text-center bg-slate-6000">
        {player.playlist.length > 0 ? (
          <div className='flex justify-between items-center'>
            <div className='flex flex-col items-start text-sm'>
              <h3 className=" font-semibold text-white"> {player.playlist[player.currentTrackIndex].title}</h3>
              <h3 className=' text-gray-400 font-normal'>{player.playlist[player.currentTrackIndex].artist}</h3>
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
          <span className="mr-2 text-sm text-gray-400">{formatTime(player.currentTime)}</span>
        <input 
          id="progressBar"
          ref={progressBarRef}
          type="range" 
          min="0" 
          max={player.duration || 0} 
          value={player.currentTime} 
          step="0.01"
          onChange={handleProgressChange}
          className="flex-grow w-full h-0.5 bg-white rounded-lg appearance-none cursor-pointer duration-300"
        />
        <span className="ml-2 text-sm text-gray-400">{formatTime(player.playlist[player.currentTrackIndex]?.duration)}</span>
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
            {player.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input 
            style={{
              maxWidth: `${player.volumeBarWidth}px`,  
              opacity: `${player.volumeBarWidth > 0 ? 1 : 0}`
            }}
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={player.volume}
            onChange={handleVolumeChange}
            className={`w-40 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer   transition-transform duration-300 ease-in-out `}
          />
        </div>
      </div>
      
      {/* Controles de reproducción */}
      <div className="flex items-center justify-center w-full mb-6 space-x-6">
        <button 
          onClick={playPreviousTrack}
          className="flex items-center justify-center p-2 text-white bg-indigo-700/10 hover:bg-black/20 rounded-full duration-1000"
        >
          <SkipBack size={24} />
        </button>
        
        <button 
          onClick={togglePlay}
          className="flex items-center justify-center p-4 text-white bg-indigo-700/10 hover:bg-black/20 rounded-full duration-1000"
        >
          {player.isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>
        
        <button 
          onClick={playNextTrack}
          className="flex items-center justify-center p-2 text-white bg-indigo-700/10 hover:bg-black/20 rounded-full duration-1000"
        >
          <SkipForward size={24} />
        </button>

      
      </div>
      
      
      {/* Lista de reproducción */}
      {player.playlist.length > 0 && (
        <>
          <h3 className="mb-2 text-lg font-semibold text-white">Playlist</h3>
        <div className="w-full max-h-96 overflow-y-auto rounded-lg">


          <ul className="bg-gray-700">
            {player.playlist.map((track, index) => (
              <li 
                key={index} 
                className={`relative flex items-center p-3 border-b cursor-pointer border-gray-600 hover:bg-gray-600 ${index === player.currentTrackIndex ? 'bg-gray-600' : ''} group`}
                onClick={() => {
                  // setCurrentTrackIndex(index);
                  // setIsPlaying(true);
                  setPlayer({ ...player, currentTrackIndex: index, isPlaying: true });
                }}
              >
                {index === player.currentTrackIndex 
                  ? <div className="flex gap-3 absolute -left-3" style={{scale: 0.2}}>
                      <div className="bar bar-1"></div>
                      <div className="bar bar-2"></div>
                      <div className="bar bar-3"></div>
                    </div>
                  : <div className='pr-3 text-sm'>{index + 1}</div>
                }
                <div className='w-full flex items-center justify-between'>
                  <div className='flex justify-center items-start gap-x-2'>
                    <img 
                    src={track.picture} 
                    alt={track.title} 
                    className={`${index === player.currentTrackIndex ? 'ml-6.5' : ''} size-10 rounded`}
                  />

                  <div className='flex flex-col items-start text-sm'>
                    <h3 className={` font-semibold text-white`}> {track.title}</h3>
                    <h3 className={` text-gray-400 font-normal`}>{track.artist}</h3>
                  </div>
                  </div>

                  <p className={` text-white text-sm`}>{formatTime(track.duration)}</p>
                </div>
              </li>
            ))}
          </ul>

        </div>
        </>
      )}
      
      {/* Elemento de audio oculto */}
      <audio
        ref={audioRef}
        src={player.playlist.length > 0 ? player.playlist[player.currentTrackIndex].url : '0'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => 
          // setDuration(audioRef.current.duration) 
          setPlayer({ ...player, duration: audioRef.current.duration })
        }
        autoPlay={player.isPlaying}
      />
    </div>
  );
}