import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume, Volume1, Volume2, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import { AddSongIcon, RemoveIcon } from '../assets/icons'; 
import unknownAlbum from '../assets/images/unknown-album-2.png';
import 'swiper/css';
import 'swiper/css/effect-creative';

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCreative } from 'swiper/modules';


const nextRepeatMode = {
  'repeat-queue': 'repeat-current',
  'repeat-current': 'repeat-none',
  'repeat-none': 'repeat-queue',
}

// Componente principal del reproductor de música
export default function MusicPlayer() {
  
  // Player music state
  const [player, setPlayer] = useState({
    currentTime: 0,
    currentTrackIndex: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    showSongInfo: false,
    volumeBarWidth: 0,
    playlist: [],
    repeatMode: 'repeat-queue',
    shuffleMode: false
  });
  
  // Referencias para manipular el elemento de audio
  const audioRef = useRef( null )
  const progressBarRef = useRef( null )
  const songInfoRef = useRef( null )
  const songInfoContainerRef = useRef( null )
  const volumeInputRef = useRef( null )
  const swiperRef = useRef( null )

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    // Primero procesamos todos los archivos
    const processedFiles = await Promise.all(files.map(async file => {
      try {
        const metadata = await parseBlob(file);
        const { common, format } = metadata;
        const { title, artist, artists, album, picture = [], track, year, genre, isrc = [] } = common;
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
            track: track?.no || 0,
            year: year || "Año desconocido",
            genre: genre ? genre : ["Género desconocido"],
            duration: duration || 0,
            url: URL.createObjectURL(file) || null,
            isrc: isrc || null,
            picture: albumPicture || unknownAlbum,
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
    
    const newIndex = player.currentTrackIndex === 0 
      ? player.playlist.length - 1 
      : player.currentTrackIndex - 1;
  
    setPlayer({ 
      ...player, 
      currentTrackIndex: newIndex, 
      isPlaying: true 
    });
  

    if (swiperRef?.current?.swiper) {
      swiperRef.current.swiper.slideTo(newIndex);
    }
  };
  
  const playNextTrack = () => {
    if (player.playlist.length === 0) return;

    
    const newIndex = player.shuffleMode ? Math.floor(Math.random() * player.playlist.length) : (player.currentTrackIndex + 1) % player.playlist.length;
    
    setPlayer(prevState => ({ 
      ...prevState, 
        currentTrackIndex: newIndex, 
        isPlaying: true 
      }));
      
      if (swiperRef?.current?.swiper) {
        swiperRef.current.swiper.slideTo(newIndex);
      }
  };

  const playCurrentTrack = () => {

    if (player.playlist.length === 0) return;

    setPlayer(prevState => ({
      ...prevState,
      currentTime: 0,
      currentTrackIndex: prevState.currentTrackIndex,
      isPlaying: true,
    }))

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  }
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);

    setPlayer({ 
      ...player, 
      volume: newVolume, 
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
          case 'repeat-queue': playNextTrack(); break;
          case 'repeat-current': playCurrentTrack(); break;
          case 'repeat-none':  
            if( player.currentTrackIndex == player.playlist.length-1 ){
              setPlayer({
                ...player,
                currentTime: 0,
                isPlaying: false,
                currentTrackIndex: 0,
              })

              audioRef.current.currentTime = 0
            } 
            else playNextTrack();
          break;
        }
      };
    }
  }, [player.currentTrackIndex, player.playlist, player.repeatMode]);
  
  // Efecto para actualizar el volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume =  player.volume;
    }
  }, [player.volume]);

  const handleExpandVolume = () => {
    setPlayer({ ...player, volumeBarWidth: player.volumeBarWidth === 0 ? 50 : 0 })

    if(volumeInputRef.current) {
      volumeInputRef.current.focus()
    }
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
    setPlayer(prevState => ({ 
        ...prevState, 
        repeatMode: nextRepeatMode[prevState.repeatMode] 
      })
    )
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
 

  //Title displacement
  useEffect(() => {

    const interval = setInterval(() => {
      if (songInfoRef.current ) {
        
        const element = songInfoRef.current
        const elementContainer = songInfoContainerRef.current
        const hasOverflow = elementContainer.scrollWidth > elementContainer.clientWidth

        if(!hasOverflow) return
        
        const hasClass = element.className?.includes('song-title-animation');

        if( hasClass ) element.classList.remove('song-title-animation')
        else element.classList.add('song-title-animation')
      }
    }, 5000); //If you change this timer, go and edit to the same number of seconds in the animation time in index.css

    // Cleanup: limpiar el interval cuando el componente se desmonta
    return () => clearInterval(interval);
  }, [player?.currentTrackIndex]);

  
  // Hook para sincronizar cuando cambie currentTrackIndex desde otro lugar
  useEffect(() => {
  if (swiperRef.current && swiperRef.current.swiper) {
    const currentSlide = swiperRef.current.swiper.realIndex;
    if (currentSlide !== player.currentTrackIndex) {
      swiperRef.current.swiper.slideTo(player.currentTrackIndex);
    }
  }
}, [player?.currentTrackIndex]);


  
  return (
    <div className="flex flex-col items-center w-full sm:w-3xl min-h-screen  p-6 mx-auto bg-gray-800 bg-gradient-to-t from-black via-gray-800 to-black sm:rounded-lg shadow-lg">

      <Swiper
        ref={swiperRef}
        grabCursor={true}
        effect={'creative'}
        creativeEffect={{
          prev: {
            shadow: true,
            translate: ['-120%', 0, -500],
          },
          next: {
            shadow: true,
            translate: ['120%', 0, -500],
          },
        }}
        loop={true}
        modules={[EffectCreative]}
        className="m-5 !size-80"
        onSlideChange={(swiper) => {
          // console.log(swiper);
          setPlayer({ 
            ...player, 
            currentTrackIndex: swiper.realIndex, 
            isPlaying: true 
          });
        }}
        
      >
        {/* Imagen de la canción + info */}
        {player.playlist.map((track, index) => (
            <SwiperSlide 
              key={index} 
              onChange={() => 
                setPlayer({ ...player, currentTrackIndex: index, isPlaying: true })
              }
            >
              {
                player.playlist.length > 0 && (
                  <div onClick={ alternateShowSongInfo } className={`size-80 mb-6 *:rounded-lg overflow-hidden rounded-lg relative transition-all duration-500`}>
                    
                    <img 
                        src={track.picture} 
                        alt={track.title} 
                        className="size-full"
                        />

                    <div className={`flex flex-col gap-y-1 absolute top-0 left-0 size-full bg-black  border border-gray-500 text-sm p-3 duration-300 ${player.showSongInfo ? 'opacity-85' : 'opacity-0'}`}>
                      <h3 className="text-xl font-semibold text-white text-center"> {track.title}</h3>
                      <h3 className='text-sm text-gray-400 font-normal'>Artist: {track.artist}</h3>
                      <h3 className='text-sm text-gray-400 font-normal'>Album: {track.album}</h3>
                      <h3 className='text-sm text-gray-400 font-normal'>Genre: {track.genre.join(', ') }</h3>
                      <h3 className='text-sm text-gray-400 font-normal'>Year: {track.year}</h3>
                    </div>
                  </div>
                )
              }
              
            </SwiperSlide>
          ))}
      </Swiper>


      {/* Información de la canción actual */}
      <div className="w-68 mb-4 text-center bg-slate-6000">
        {player.playlist.length > 0 ? (
          <div className='flex justify-between items-center gap-x-2 rounded-lg py-2 '>
            <div ref={ songInfoContainerRef } className='flex flex-col items-start text-sm text-start max-w-68 min-w-auto duration-300 overflow-hidden bg-red-5000 mask-r-from-98% mask-l-from-98% px-2'>
              
              <div ref={ songInfoRef } className='flex justify-between items-center gap-x-[13%]' >
                <h3 
                  className="font-semibold text-white text-nowrap"
                > 
                  {player.playlist[player.currentTrackIndex].title}
                </h3>
                
                { songInfoContainerRef?.current?.scrollWidth > songInfoContainerRef?.current?.clientWidth &&
                  <h3 
                    className="font-semibold text-white text-nowrap"
                  > 
                    {player.playlist[player.currentTrackIndex].title}
                  </h3>
                }
              </div>
              
              <h3 className='text-gray-400 font-normal'>{player.playlist[player.currentTrackIndex].artist}</h3>
            </div>
            <button onClick={ ()=> removeFromPlaylist( player.currentTrackIndex ) } className=' rounded-full px-1'>
              <RemoveIcon className="w-5.5 h-5.5 text-white " />
            </button>
          </div>
        ) : (
          <p className="text-gray-400">No hay canciones cargadas</p>
        )}
      </div>
      
      <div className="flex items-end justify-center gap-x-3 w-full mb-4">

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
        <div className="flex items-center group duration-300">
          <button 
            onClick={ handleExpandVolume }
            className={`${player.volumeBarWidth === 0 ? '' : 'mr-2'} text-white`}>
            {
              player.volume === 0 
                ? <Volume size={20} />
                : player.volume < 0.8
                ? <Volume1 size={20} /> 
                : <Volume2 size={20} />
            }
          </button>
          
          <input 
            style={{
              maxWidth: `${player.volumeBarWidth}px`,  
            }}
            ref={ volumeInputRef }
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={player.volume}
            onChange={handleVolumeChange}
            onBlur={ handleExpandVolume }
            disabled={ player.volumeBarWidth > 0 ? false : true }
            className={`h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer transition-all duration-300 ease-in-out ${player.volumeBarWidth === 0 ? 'pointer-events-none opacity-0 ' : 'opacity-100'}`}
          />
        </div>
      </div>
      
      {/* Controles de reproducción */}
      <div className="flex items-center justify-center w-full mb-4 space-x-6">

        <button 
          onClick={ (e)=> { toggleShuffleMode() , rippleEffect(e) } }
          className="relative overflow-hidden flex items-center justify-center p-2 text-white bg-indigo-700/20 rounded-full shadow-sm"
        >
          <Shuffle size={18} className={`${player.shuffleMode ? '' : 'opacity-50'}`} />
        </button>

        <button 
          onClick={ (e)=> {playPreviousTrack() , rippleEffect(e)} } 
          className="relative overflow-hidden flex items-center justify-center p-2 text-white bg-indigo-700/20 rounded-full duration-300 shadow-sm"
        >
          <SkipBack size={24} />
        </button>
        
        <button 
          onClick={ (e) => {togglePlay(), rippleEffect(e) }}
          className={`relative overflow-hidden flex items-center justify-center p-4 text-white bg-indigo-700/20 rounded-full duration-300 ${player.isPlaying ? '' : 'shadow-sm'}`}
        >
          {player.isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>

        
        <button 
          onClick={ (e) => {playNextTrack() , rippleEffect(e) }}
          className="relative overflow-hidden flex items-center justify-center p-2 text-white bg-indigo-700/20 rounded-full duration-300 shadow-sm"
        >
          <SkipForward size={24} />
        </button>

        <button 
          onClick={ (e) => {toggleRepeatMode(), rippleEffect(e)} }
          className="relative overflow-hidden flex items-center justify-center p-2 text-white bg-indigo-700/20 rounded-full shadow-sm"
        >
          {
            player.repeatMode === 'repeat-queue' 
            ? <Repeat size={18} /> 
            : player.repeatMode === 'repeat-current' 
            ? <Repeat1 size={18} /> 
            : <Repeat size={18} className='opacity-50' />
          }

        </button>

      
      </div>
      
      
      {/* Lista de reproducción */}
      {player.playlist.length > 0 ? (
        <>
        
        <div className='flex items- justify-between w-68d w-full mb-6'>
          <h3 className=" text-lg font-normal text-gray-400 bg-gray-700d rounded-full  border-2 border-transparent"> Playlist </h3>

          <span className='text-sm font-normal text-gray-400'> song {player.currentTrackIndex + 1} of {player.playlist.length}</span>
          
          {/* Área de carga de archivos */}
          <div className="rounded-full ">
            <label onClick={(e) => rippleEffect(e)} className="relative overflow-hidden rounded-full flex items-center justify-center py-1 px-2 bg-indigo-700/20 border-2 border-transparent cursor-pointer shadow-sm">
              <span className="text-gray-400 text-xs flex items-center justify-center gap-x-1 select-none">
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


          <ul className="">
            {player.playlist.map((track, index) => (
              <li 
                key={index} 
                  className={`relative flex items-center p-3 border-b last:border-b-0 cursor-pointer border-gray-600 bg-gray-700 ${index === player.currentTrackIndex ? 'bg-linear-to-r from-black' : ' hover:bg-gray-900'} group`}
                onClick={() => 
                  setPlayer({ ...player, currentTrackIndex: index, isPlaying: true })
                }
              >
                { (index === player.currentTrackIndex && player.isPlaying)
                  ? <div className="flex gap-3 absolute -left-3" style={{scale: 0.2}}>
                      <div className="bar bar-1"></div>
                      <div className="bar bar-2"></div>
                      <div className="bar bar-3"></div>
                    </div>
                  : <div className='pr-3d min-w-6.5 text-sm'>{index + 1}</div>
                }
                <div className='w-full flex items-center justify-between'>
                  <div className='flex justify-center items-start gap-x-2'>
                    <img 
                    src={track.picture} 
                    alt={track.title} 
                    className={`${index === player.currentTrackIndex && player.isPlaying ? 'ml-6.5' : ''} size-10 rounded`}
                  />

                  <div className='flex flex-col items-start text-sm'>
                    <h3 className={` font-semibold text-white text-nowrap truncate max-w-50 sm:w-auto`}> {track.title}</h3>
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
            <label onClick={(e) => rippleEffect(e)} className="relative overflow-hidden rounded-full flex items-center justify-center py-1 px-2 bg-indigo-700/20 border-2 border-transparent cursor-pointer shadow-sm">
              <span className="text-gray-400 text-xs flex items-center justify-center gap-x-1 select-none">
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

