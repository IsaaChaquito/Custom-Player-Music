import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import { AddSongIcon, RemoveIcon } from '../assets/icons'; 


// Componente principal del reproductor de música
export default function MusicPlayer() {
  
  // Player music state
  const [player, setPlayer] = useState({
    currentTime: 0,
    currentTrackIndex: 0,
    duration: 0,
    isPlaying: false,
    volume: 0.7,
    isMuted: false,
    showSongInfo: false,
    volumeBarWidth: 0,
    playlist: [],
    repeatMode: 'repeat-all',
    shuffleMode: false
  });
  
  // Referencias para manipular el elemento de audio
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

    const handleFileUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files || files.length === 0) return;

      // Primero procesamos todos los archivos
      const processedFiles = await Promise.all(files.map(async file => {
        try {
          const metadata = await parseBlob(file);
          const { common, format } = metadata;
          const { title, artist, artists, album, picture, track, year, genre, isrc } = common;
          const { duration } = format;

          // Verificar si la canción ya existe en la playlist actual
          const isDuplicate = isrc && player.playlist.some(existingTrack => existingTrack.isrc[0] === isrc[0]);
          if (isDuplicate) return null;

          let albumPicture = null;
          if (picture && picture[0]) {
              const base64String = uint8ArrayToBase64(picture[0].data);
              const mimeType = picture[0].format;
              albumPicture = `data:${mimeType};base64,${base64String}`;
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
          };
        } catch (error) {
            console.error("Error leyendo metadatos:", error);
            return null;
        }
      }));

    // Filtrar nulos (canciones duplicadas o con error)
    const validNewTracks = processedFiles.filter(track => track !== null);

    if (validNewTracks.length === 0) return;

    // Actualizar el estado con las nuevas canciones
    setPlayer(prevState => {
        const newPlaylist = [...prevState.playlist, ...validNewTracks];
        const shouldSetCurrentTrack = prevState.playlist.length === 0 && validNewTracks.length > 0;
        
        return {
            ...prevState,
            playlist: newPlaylist,
            currentTrackIndex: shouldSetCurrentTrack ? 0 : prevState.currentTrackIndex
        };
    });

    function uint8ArrayToBase64(uint8Array) {
        let binary = '';
        uint8Array.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });
        return window.btoa(binary);
    }
  };

  
  // Controles de reproducción
  const togglePlay = () => {
    if (player.playlist.length === 0) return;
    if (player.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setPlayer({ ...player, isPlaying: !player.isPlaying });
  };
  
  const playPreviousTrack = () => {
    if (player.playlist.length === 0) return;
    
    const newIndex = player.currentTrackIndex === 0 ? player.playlist.length - 1 : player.currentTrackIndex - 1;

    setPlayer({ 
      ...player, 
      currentTrackIndex: newIndex, 
      isPlaying: true 
    });

  };
  
  const playNextTrack = () => {
    if (player.playlist.length === 0) return;

    const newIndex = player.shuffleMode ? Math.floor(Math.random() * player.playlist.length) : (player.currentTrackIndex + 1) % player.playlist.length;

    setPlayer({ 
      ...player, 
      currentTrackIndex: newIndex, 
      isPlaying: true 
    });
  };

  const playCurrentTrack = () => {
    if (player.playlist.length === 0) return;

    setPlayer({
      ...player,
      currentTime: 0,
      isPlaying: true
    })

    audioRef.current.play();
  }
  
  // Control de volumen
  const toggleMute = () => {
    setPlayer({ ...player, isMuted: !player.isMuted });
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);

    setPlayer({ 
      ...player, 
      volume: newVolume, 
      isMuted: newVolume === 0 
    });
  };
  
  // Control de progreso
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlayer({ ...player, currentTime: audioRef.current.currentTime });
    }
  };
  
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);

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
        setPlayer({ ...player, duration: audioRef.current.duration });
        if (player.isPlaying) audioRef.current.play();
      };
      
      audioRef.current.onended = () => {
        switch (player.repeatMode) {
          case 'repeat-all': playNextTrack(); break;
          case 'repeat-one': playCurrentTrack(); break;
          case 'none': /*do nothing */ break;
          default: break;
        }
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
    setPlayer({ ...player, volumeBarWidth: 50 })
  }

  const handleMouseLeave = () => {
    setPlayer({ ...player, volumeBarWidth: 0 })
  }

  const alternateShowSongInfo = () => {
    setPlayer({ ...player, showSongInfo: !player.showSongInfo })
  }

  const removeFromPlaylist = (index) => {
    const newPlaylist = [...player.playlist];
    newPlaylist.splice(index, 1);
    setPlayer({ ...player, playlist: newPlaylist, currentTrackIndex: index-1 === -1 ? 0 : index-1 });
  }

  const toggleRepeatMode = () => {
    setPlayer({ 
      ...player, 
      repeatMode: player.repeatMode === 'repeat-all' ? 'repeat-one' : player.repeatMode === 'repeat-one' ? 'none' : 'repeat-all' 
    })
  }

  const toggleShuffleMode = () => {
    setPlayer({ 
      ...player, 
      shuffleMode: !player.shuffleMode 
    })
  }


  const rippleEffect = (e) => {

        const btn = e.currentTarget;

        const circle = document.createElement("span");
        const diameter = Math.max(btn.clientWidth, btn.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - (btn.offsetLeft + radius)}px`;
        circle.style.top = `${e.clientY - (btn.offsetTop + radius)}px`;
        circle.classList.add("ripple");

        const ripple = btn.getElementsByClassName("ripple")[0];

        if (ripple) {
          ripple.remove();
        }

        btn.appendChild(circle);
        
      }
  
  return (
    <div className="flex flex-col items-center w-full sm:w-3xl min-h-screen  p-6 mx-auto bg-gray-800 bg-gradient-to-t from-gray-700 via-gray-900 to-black sm:rounded-lg shadow-lg">

      

      {/* Imagen de la cancion */}
      {player.playlist.length > 0 && (
        <div onClick={ alternateShowSongInfo } className="size-68 bg-gray-700d mb-6 *:rounded-lg overflow-hidden rounded-lg relative  shadow-mdd">
            <img 
                src={player.playlist[player.currentTrackIndex].picture} 
                alt={player.playlist[player.currentTrackIndex].title} 
                className="size-full"
              />

          {player.playlist[player.currentTrackIndex] &&
            <div className={`flex flex-col gap-y-1 absolute top-0 left-0 size-full bg-black  border border-gray-500 text-sm p-3 duration-300 ${player.showSongInfo ? 'opacity-85' : 'opacity-0'}`}>
              <h3 className="text-xl font-semibold text-white text-center"> {player.playlist[player.currentTrackIndex].title}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Artist: {player.playlist[player.currentTrackIndex].artist}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Album: {player.playlist[player.currentTrackIndex].album}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Year: {player.playlist[player.currentTrackIndex].year}</h3>
              <h3 className='text-sm text-gray-400 font-normal'>Genre: {player.playlist[player.currentTrackIndex].genre.join(', ')}</h3>
            </div>}
        </div>
      )}
      
      {/* Información de la canción actual */}
      <div className="w-68 mb-4 text-center bg-slate-6000">
        {player.playlist.length > 0 ? (
          <div className='flex justify-between items-center'>
            <div className='flex flex-col items-start text-sm text-start'>
              <h3 className="font-semibold text-white overflow-hidden truncate"> {player.playlist[player.currentTrackIndex].title}</h3>
              <h3 className=' text-gray-400 font-normal'>{player.playlist[player.currentTrackIndex].artist}</h3>
            </div>
            <button onClick={ ()=> removeFromPlaylist( player.currentTrackIndex ) } className=' rounded-full'>
              <RemoveIcon className="w-5.5 h-5.5 text-white " />
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
      <div className="flex items-center justify-center w-full mb-1 space-x-6">

        <button 
          onClick={ toggleShuffleMode }
          className="flex items-center justify-center p-2 text-white "
        >
          <Shuffle size={20} className={`${player.shuffleMode ? '' : 'opacity-50'}`} />
        </button>

        <button 
          onClick={playPreviousTrack}
          className="flex items-center justify-center p-2 text-white bg-indigo-700/10 hover:bg-black/20 rounded-full duration-1000 shadow-sm"
        >
          <SkipBack size={24} />
        </button>
        
        <button 
          onClick={ (e) => {togglePlay(), rippleEffect(e) }}
          className={`aspect-square w-full mask-[url(assets/images/heart-2.png)] mask-contain relative overflow-hidden flex items-center justify-center p-4d text-white bg-red-950 rounded-full duration-300 ${player.isPlaying ? '' : 'shadow-sm'}`}
        >
          {player.isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>

        
        <button 
          onClick={playNextTrack}
          className="flex items-center justify-center p-2 text-white bg-indigo-700/10 hover:bg-black/20 rounded-full duration-1000 shadow-sm"
        >
          <SkipForward size={24} />
        </button>

        <button 
          onClick={ toggleRepeatMode }
          className="flex items-center justify-center p-2 text-white "
        >
          {
            player.repeatMode === 'repeat-all' 
            ? <Repeat size={20} /> 
            : player.repeatMode === 'repeat-one' 
            ? <Repeat1 size={20} /> 
            : <Repeat size={20} className='opacity-50' />
          }

        </button>

      
      </div>
      
      
      {/* Lista de reproducción */}
      {player.playlist.length > 0 ? (
        <>
        
        <div className='flex items- justify-between w-68 mb-6'>
          <h3 className=" text-lg font-semibold text-white">Playlist</h3>
          
          {/* Área de carga de archivos */}
          <div className="rounded-full ">
            <label className="rounded-full flex items-center justify-center py-1 px-2 bg-gray-700 border-2 border-dashed cursor-pointer hover:bg-gray-600 border-gray-500">
              <span className="text-gray-300 text-xs flex items-center justify-center gap-x-1">
                add song
                <AddSongIcon className="w-5 h-5" />
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

          

        </div>

        <div className="w-full max-h-96 overflow-y-auto rounded-lg">


          <ul className="bg-gray-700">
            {player.playlist.map((track, index) => (
              <li 
                key={index} 
                className={`relative flex items-center p-3 border-b last:border-b-0 cursor-pointer border-gray-600 hover:bg-gray-600 ${index === player.currentTrackIndex ? 'bg-gray-600' : ''} group`}
                onClick={() => 
                  setPlayer({ ...player, currentTrackIndex: index, isPlaying: true })
                }
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
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {/* Área de carga de archivos */}
          <div className="rounded-full ">
            <label className="rounded-full flex items-center justify-center py-1 px-2 bg-gray-700 border-2 border-dashed cursor-pointer hover:bg-gray-600 border-gray-500">
              <span className="text-gray-300 text-xs flex items-center justify-center gap-x-1">
                add song
                <AddSongIcon className="w-5 h-5" />
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
          
        </div>
      )}
      
      {/* Elemento de audio oculto */}
      <audio
        ref={audioRef}
        src={player.playlist.length > 0 ? player.playlist[player.currentTrackIndex].url : '0'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => 
          setPlayer({ ...player, duration: audioRef.current.duration })
        }
        autoPlay={player.isPlaying}
      />
    </div>
  );
}